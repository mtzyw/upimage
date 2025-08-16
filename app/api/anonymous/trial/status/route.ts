import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { uploadOptimizedImageStreamToR2 } from '@/lib/freepik/utils';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 请求参数验证 - 支持批量查询
const statusRequestSchema = z.object({
  batchId: z.string().min(1, '批量任务ID不能为空')
});

// 主动查询 Freepik 任务状态
async function queryFreepikTaskStatus(taskId: string, apiKey: string): Promise<{
  status: string;
  result?: any;
  error?: string;
} | null> {
  try {
    const response = await fetch(`https://api.freepik.com/v1/ai/image-upscaler/${taskId}`, {
      method: 'GET',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ [FREEPIK_QUERY] ${taskId} HTTP ${response.status}:`, await response.text());
      return null;
    }

    const result = await response.json();
    const taskData = result.data;
    console.log(`🔍 [FREEPIK_QUERY] ${taskId} status:`, taskData?.status);

    if (!taskData || !taskData.status) {
      console.error(`❌ [FREEPIK_QUERY] ${taskId} 无效响应结构:`, result);
      return null;
    }

    // Freepik 返回的状态是大写，需要转换为小写以匹配我们的系统
    const normalizedStatus = taskData.status.toLowerCase();

    return {
      status: normalizedStatus,
      result: normalizedStatus === 'completed' ? taskData : undefined,
      error: normalizedStatus === 'failed' ? taskData.error : undefined
    };
  } catch (error) {
    console.error(`❌ [FREEPIK_QUERY] ${taskId} failed:`, error);
    return null;
  }
}

// 获取图片文件扩展名
function getImageExtension(url: string): string {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const lastDot = pathname.lastIndexOf('.');
  return lastDot !== -1 ? pathname.substring(lastDot + 1).toLowerCase() : 'png';
}

// 处理完成的图片任务（下载图片并上传到 R2）
async function processCompletedImageTask(taskId: string, taskData: any): Promise<{
  success: boolean;
  resultData?: any;
  error?: string;
}> {
  const taskIdShort = taskId.slice(0, 8);
  
  try {
    // 获取 Freepik 生成的图片 URL
    const generatedUrls = taskData.generated;
    if (!generatedUrls || !Array.isArray(generatedUrls) || generatedUrls.length === 0) {
      throw new Error('没有找到生成的图片URL');
    }
    
    const resultImageUrl = generatedUrls[0]; // 取第一张图片
    console.log(`💾 [FALLBACK-${taskIdShort}] 开始处理图片: ${resultImageUrl}`);

    // 下载并上传图片到R2
    const imageResponse = await fetch(resultImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`无法下载图片 ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    // 尝试流式上传（零内存占用）
    const uploadResult = await uploadOptimizedImageStreamToR2(
      imageResponse,
      `anonymous`,
      taskId,
      getImageExtension(resultImageUrl),
      false // 禁用回退，测试纯流式上传
    );
    
    // 记录使用的上传方式
    if (uploadResult.uploadMethod === 'stream') {
      console.log(`🎯 [TRIAL-STATUS] ✨ 试用状态检查成功使用零内存流式上传!`);
    } else {
      console.log(`📁 [TRIAL-STATUS] ⚠️ 试用状态检查使用了本地文件上传方案 (流式上传失败降级)`);
    }
    
    const r2Key = uploadResult.key;
    const cdnUrl = uploadResult.url;

    const resultData = {
      cdnUrl,
      r2Key,
      originalImageUrl: resultImageUrl,
      completedAt: new Date().toISOString()
    };

    console.log(`🎉 [FALLBACK-${taskIdShort}] 图片处理完成: ${cdnUrl}`);
    return { success: true, resultData };

  } catch (error) {
    console.error(`❌ [FALLBACK-${taskIdShort}] 图片处理失败:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '图片处理失败' 
    };
  }
}

/**
 * 查询匿名用户批量任务状态
 * POST /api/anonymous/trial/status
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 解析和验证参数
    const body = await req.json();
    const validationResult = statusRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [STATUS] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { batchId } = validationResult.data;
    const batchIdShort = batchId.slice(-4);

    // 2. 查询批量任务状态
    const { data: statusResult, error: statusError } = await supabaseAdmin
      .rpc('get_batch_tasks_status', {
        p_batch_id: batchId
      });

    // 类型断言：RPC 函数返回 JSONB 对象
    const result = statusResult as { 
      found?: boolean; 
      batch_id?: string; 
      total_count?: number; 
      completed_count?: number; 
      failed_count?: number;
      tasks?: any[];
    } | null;

    if (statusError) {
      console.error(`❌ [STATUS-${batchIdShort}] 数据库查询失败:`, statusError);
      return apiResponse.error('查询批量任务状态失败，请重试');
    }

    if (!result?.found) {
      console.log(`❌ [STATUS-${batchIdShort}] 批量任务不存在`);
      return apiResponse.notFound('批量任务不存在或已过期');
    }

    // 3. 格式化返回数据
    const tasks = result?.tasks?.map((task: any) => ({
      taskId: task.task_id,
      scaleFactor: task.scale_factor,
      status: task.status,
      result: task.result_data,
      createdAt: task.created_at,
      apiKey: task.api_key,
      isCompleted: task.status === 'completed',
      isFailed: task.status === 'failed'
    }));

    // 4. 检测超时任务并主动查询
    const now = new Date();
    const timeoutMinutes = 3; // 3分钟超时阈值
    let hasUpdatedTasks = false;

    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        // 只处理仍在 processing 状态的任务（跳过 uploading 状态避免重复处理）
        if (task.status === 'processing' && task.apiKey) {
          const createdAt = new Date(task.createdAt);
          const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          
          // 如果超过3分钟，主动查询 Freepik
          if (minutesElapsed > timeoutMinutes) {
            console.log(`⏰ [FALLBACK-${batchIdShort}] ${task.scaleFactor} task ${task.taskId.slice(0, 8)} 超时 ${minutesElapsed.toFixed(1)}min，开始处理`);
            
            // 立即更新状态为 uploading，防止其他轮询重复处理
            const { data: updateResult, error: updateError } = await supabaseAdmin.rpc('update_batch_task_status', {
              p_freepik_task_id: task.taskId,
              p_status: 'uploading',
              p_result_data: { message: '正在查询任务状态...' }
            });
            
            if (updateError) {
              console.error(`❌ [FALLBACK-${batchIdShort}] ${task.scaleFactor} 状态更新失败:`, updateError);
              continue; // 跳过这个任务，继续处理其他任务
            }
            
            if (!updateResult) {
              console.error(`❌ [FALLBACK-${batchIdShort}] ${task.scaleFactor} 任务不存在，无法更新状态`);
              continue; // 跳过这个任务
            }
            
            console.log(`🔒 [FALLBACK-${batchIdShort}] ${task.scaleFactor} 状态已成功锁定为 uploading，开始查询`);
            
            const freepikStatus = await queryFreepikTaskStatus(task.taskId, task.apiKey);
            
            if (freepikStatus && freepikStatus.status !== 'processing' && freepikStatus.status !== 'in_progress') {
              console.log(`🔄 [FALLBACK-${batchIdShort}] ${task.scaleFactor} Freepik 状态: ${freepikStatus.status}`);
              
              let finalResultData = freepikStatus.result || freepikStatus.error || null;
              // 映射 Freepik 状态到数据库状态（这里已经排除了 in_progress）
              let finalStatus = freepikStatus.status;

              // 如果任务完成，处理图片上传到 R2
              if (freepikStatus.status === 'completed' && freepikStatus.result) {
                console.log(`💾 [FALLBACK-${batchIdShort}] ${task.scaleFactor} 开始图片处理`);

                const imageProcessResult = await processCompletedImageTask(task.taskId, freepikStatus.result);
                
                if (imageProcessResult.success) {
                  finalResultData = imageProcessResult.resultData;
                  finalStatus = 'completed';
                  console.log(`✅ [FALLBACK-${batchIdShort}] ${task.scaleFactor} 图片处理成功`);
                } else {
                  // 图片处理失败，标记任务为失败
                  finalStatus = 'failed';
                  finalResultData = { error: imageProcessResult.error };
                  console.log(`❌ [FALLBACK-${batchIdShort}] ${task.scaleFactor} 图片处理失败: ${imageProcessResult.error}`);
                }
              }
              
              // 更新数据库中的最终任务状态
              const { error: finalUpdateError } = await supabaseAdmin.rpc('update_batch_task_status', {
                p_freepik_task_id: task.taskId,
                p_status: finalStatus,
                p_result_data: finalResultData
              });
              
              if (finalUpdateError) {
                console.error(`❌ [FALLBACK-${batchIdShort}] ${task.scaleFactor} 最终状态更新失败:`, finalUpdateError);
              }
              
              hasUpdatedTasks = true;
            } else if (freepikStatus && freepikStatus.status === 'failed') {
              // Freepik 任务失败
              console.log(`❌ [FALLBACK-${batchIdShort}] ${task.scaleFactor} Freepik 任务失败`);
              
              const { error: failedUpdateError } = await supabaseAdmin.rpc('update_batch_task_status', {
                p_freepik_task_id: task.taskId,
                p_status: 'failed',
                p_result_data: { error: 'Task failed on Freepik service' }
              });
              
              if (failedUpdateError) {
                console.error(`❌ [FALLBACK-${batchIdShort}] ${task.scaleFactor} 失败状态更新错误:`, failedUpdateError);
              }
              
            } else if (freepikStatus && (freepikStatus.status === 'in_progress' || freepikStatus.status === 'processing')) {
              // Freepik 仍在处理中 - 保持 uploading 状态防止重复查询
              console.log(`⏳ [FALLBACK-${batchIdShort}] ${task.scaleFactor} Freepik 仍在处理中 (${freepikStatus.status})，保持 uploading 状态`);
              // 不更新状态，保持 uploading 锁定
              
            } else {
              // 查询完全失败 - 超时后标记为失败
              console.log(`❌ [FALLBACK-${batchIdShort}] ${task.scaleFactor} 查询完全失败，标记任务为失败`);
              
              const { error: queryFailedError } = await supabaseAdmin.rpc('update_batch_task_status', {
                p_freepik_task_id: task.taskId,
                p_status: 'failed',
                p_result_data: { error: 'Unable to retrieve task status from Freepik after timeout' }
              });
              
              if (queryFailedError) {
                console.error(`❌ [FALLBACK-${batchIdShort}] ${task.scaleFactor} 查询失败状态更新错误:`, queryFailedError);
              }
            }
          }
        }
      }
    }

    // 如果有任务状态更新，重新查询最新数据
    if (hasUpdatedTasks) {
      console.log(`🔄 [FALLBACK-${batchIdShort}] 重新查询更新后的状态`);
      
      const { data: updatedResult } = await supabaseAdmin
        .rpc('get_batch_tasks_status', { p_batch_id: batchId });
      
      if (updatedResult && typeof updatedResult === 'object' && updatedResult !== null) {
        const batchResult = updatedResult as { 
          tasks?: any[];
          batch_id?: string;
          total_count?: number;
          completed_count?: number;
          failed_count?: number;
        };
        const updatedTasks = batchResult.tasks?.map((task: any) => ({
          taskId: task.task_id,
          scaleFactor: task.scale_factor,
          status: task.status,
          result: task.result_data,
          createdAt: task.created_at,
          isCompleted: task.status === 'completed',
          isFailed: task.status === 'failed'
        }));

        const response = {
          batchId: batchResult.batch_id,
          tasks: updatedTasks || [],
          totalCount: batchResult.total_count || 0,
          completedCount: batchResult.completed_count || 0,
          failedCount: batchResult.failed_count || 0,
          isAllComplete: (batchResult.completed_count || 0) + (batchResult.failed_count || 0) >= (batchResult.total_count || 0)
        };

        console.log(`✅ [FALLBACK-${batchIdShort}] 状态已更新: ${response.completedCount}/${response.totalCount} completed`);
        return apiResponse.success(response);
      }
    }

    const response = {
      batchId: result?.batch_id,
      tasks: tasks || [],
      totalCount: result?.total_count || 0,
      completedCount: result?.completed_count || 0,
      failedCount: result?.failed_count || 0,
      isAllComplete: (result?.completed_count || 0) + (result?.failed_count || 0) >= (result?.total_count || 0)
    };

    // 只在任务状态变化时输出日志
    const newCompleted = (tasks || []).filter(t => t.isCompleted).length;
    if (newCompleted > 0) {
      console.log(`📊 [STATUS-${batchIdShort}] ${newCompleted}/${result?.total_count || 0} completed`);
    }

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [STATUS] 查询异常:', error);
    return apiResponse.serverError('批量任务状态查询服务内部错误');
  }
}