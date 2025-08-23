import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { redis } from '@/lib/upstash';
import { uploadOptimizedImageStreamToR2, getImageExtension } from '@/lib/freepik/utils';

// 强制使用 Node.js runtime 以支持流式上传
export const runtime = 'nodejs';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to process completed image task
async function processCompletedImageTask(imageUrl: string, taskId: string, userType: string): Promise<string> {
  const taskIdShort = taskId.slice(0, 8);
  console.log(`💾 [FLUX-DEV-${taskIdShort}] 开始处理图片: ${imageUrl}`);

  // Download image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`无法下载图片 ${imageResponse.status} ${imageResponse.statusText}`);
  }
  
  // 尝试流式上传到 R2
  const uploadResult = await uploadOptimizedImageStreamToR2(
    imageResponse,
    userType === 'authenticated' ? 'authenticated' : 'anonymous',
    taskId,
    getImageExtension(imageUrl),
    true // 启用回退，流式上传失败时降级到本地文件方案
  );
  
  // 记录使用的上传方式
  if (uploadResult.uploadMethod === 'stream') {
    console.log(`🎯 [FLUX-DEV-${taskIdShort}] ✨ 状态检查成功使用零内存流式上传!`);
  } else {
    console.log(`📁 [FLUX-DEV-${taskIdShort}] ⚠️ 状态检查使用了本地文件上传方案 (流式上传失败降级)`);
  }
  
  console.log(`✅ [FLUX-DEV-${taskIdShort}] 图片处理成功: ${uploadResult.url}`);
  return uploadResult.url;
}

// Active query to Freepik API for Flux Dev task status
async function queryFreepikFluxDevStatus(taskId: string, apiKey: string): Promise<{
  status: string;
  result?: any;
  error?: string;
} | null> {
  try {
    const response = await fetch(`https://api.freepik.com/v1/ai/text-to-image/flux-dev/${taskId}`, {
      method: 'GET',
      headers: {
        'x-freepik-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ [FLUX_DEV_QUERY] ${taskId} HTTP ${response.status}:`, await response.text());
      return null;
    }

    const result = await response.json();
    const taskData = result.data;
    console.log(`🔍 [FLUX_DEV_QUERY] ${taskId} status:`, taskData?.status);

    if (!taskData || !taskData.status) {
      console.error(`❌ [FLUX_DEV_QUERY] ${taskId} invalid response:`, result);
      return null;
    }

    // Freepik returns uppercase status, convert to lowercase
    const normalizedStatus = taskData.status.toLowerCase();

    return {
      status: normalizedStatus,
      result: normalizedStatus === 'completed' ? taskData : undefined,
      error: normalizedStatus === 'failed' ? taskData.error : undefined
    };
  } catch (error) {
    console.error(`❌ [FLUX_DEV_QUERY] ${taskId} failed:`, error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. 用户认证
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiResponse.unauthorized('用户未认证');
    }

    // 2. 获取查询参数
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return apiResponse.badRequest('缺少必需参数: taskId');
    }

    console.log(`🔍 [FLUX DEV STATUS] 查询任务状态: ${taskId}, 用户: ${user.id}`);

    // 3. 优先从 Redis 缓存获取任务信息
    let taskData = null;
    let fromCache = false;

    if (redis) {
      try {
        const cachedTask = await redis.get(`task_cache:${taskId}`);
        if (cachedTask) {
          if (typeof cachedTask === 'object' && cachedTask !== null) {
            taskData = cachedTask;
            fromCache = true;
          } else if (typeof cachedTask === 'string') {
            try {
              taskData = JSON.parse(cachedTask);
              fromCache = true;
            } catch (parseError) {
              console.error(`Failed to parse cached JSON for ${taskId}:`, parseError);
              await redis.del(`task_cache:${taskId}`);
            }
          }
        }
      } catch (redisError) {
        console.error(`Redis error for ${taskId}:`, redisError);
      }
    }

    // 4. 如果缓存中没有，从数据库查询
    if (!taskData) {
      const { data: dbTaskData, error: taskError } = await supabaseAdmin
        .from('image_enhancement_tasks')
        .select('user_id, status, created_at, completed_at, error_message, cdn_url, scale_factor, prompt, creativity, engine, credits_consumed')
        .eq('id', taskId)
        .single();

      if (taskError || !dbTaskData) {
        console.log(`Task not found: ${taskId}`);
        return apiResponse.notFound('任务不存在');
      }

      taskData = dbTaskData;
      
      // 保存到 Redis 缓存（5分钟有效期）
      if (redis) {
        try {
          await redis.set(`task_cache:${taskId}`, taskData, { ex: 300 });
        } catch (cacheError) {
          console.error(`Failed to cache task data for ${taskId}:`, cacheError);
        }
      }
    }

    // 5. 验证任务所有权
    if (taskData.user_id !== user.id) {
      console.log(`Access denied: task ${taskId} belongs to ${taskData.user_id}, requested by ${user.id}`);
      return apiResponse.forbidden('无权访问此任务');
    }

    // 6. 检查是否是 Flux Dev 任务
    const isFluxDevTask = taskData.engine === 'flux-dev';
    if (!isFluxDevTask) {
      return apiResponse.badRequest('此任务不是文本生成图片任务');
    }

    // 7. 检查任务超时并执行 fallback 查询
    const currentStatus = taskData.status;
    const taskCreatedAt = new Date(taskData.created_at);
    const timeoutMinutes = 3; // Flux Dev 超时时间稍短
    const isTimeout = currentStatus === 'processing' && 
                     (Date.now() - taskCreatedAt.getTime()) > (timeoutMinutes * 60 * 1000);
    
    if (isTimeout) {
      console.log(`⏰ [FLUX_DEV_FALLBACK] ${taskId} timed out after ${Math.round((Date.now() - taskCreatedAt.getTime()) / 60000)}min, starting fallback`);
      
      // Get task with API key for fallback query
      const { data: taskWithApiKey } = await supabaseAdmin
        .from('image_enhancement_tasks')
        .select('api_key')
        .eq('id', taskId)
        .single();
        
      if (taskWithApiKey?.api_key) {
        // Set status to uploading to prevent concurrent processing
        const { data: updateResult, error: updateError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
          p_task_id: taskId,
          p_status: 'uploading'
        });
        
        if (updateError) {
          console.error(`❌ [FLUX_DEV_FALLBACK] ${taskId} status update failed:`, updateError);
        } else if (!updateResult) {
          console.error(`❌ [FLUX_DEV_FALLBACK] ${taskId} task not found for status update`);
        } else {
          console.log(`🔒 [FLUX_DEV_FALLBACK] ${taskId} status locked to uploading, querying...`);
          
          // Query Freepik API
          const queryResult = await queryFreepikFluxDevStatus(taskId, taskWithApiKey.api_key);
          
          if (queryResult && queryResult.status === 'completed' && queryResult.result?.generated?.[0]) {
            console.log(`🔄 [FLUX_DEV_FALLBACK] ${taskId} Freepik status: completed`);
            console.log(`💾 [FLUX_DEV_FALLBACK] ${taskId} starting image processing`);
            
            try {
              // Process the completed image
              const cdnUrl = await processCompletedImageTask(queryResult.result.generated[0], taskId, 'authenticated');
              
              // Update final status
              const { error: finalUpdateError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
                p_task_id: taskId,
                p_status: 'completed',
                p_cdn_url: cdnUrl,
                p_completed_at: new Date().toISOString()
              });
              
              if (finalUpdateError) {
                console.error(`❌ [FLUX_DEV_FALLBACK] ${taskId} final status update failed:`, finalUpdateError);
              }
              
              console.log(`✅ [FLUX_DEV_FALLBACK] ${taskId} processing completed`);
              
              // Update taskData to reflect new status
              taskData.status = 'completed';
              taskData.cdn_url = cdnUrl;
              taskData.completed_at = new Date().toISOString();
              
            } catch (processError) {
              console.error(`❌ [FLUX_DEV_FALLBACK] ${taskId} image processing failed:`, processError);
              
              // Update status to failed
              await supabaseAdmin.rpc('update_image_enhancement_task_status', {
                p_task_id: taskId,
                p_status: 'failed',
                p_error_message: 'Image processing failed after Freepik completion'
              });
            }
          } else if (queryResult && queryResult.status === 'failed') {
            // Freepik task failed
            console.log(`❌ [FLUX_DEV_FALLBACK] ${taskId} Freepik task failed`);
            
            const { error: failedUpdateError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
              p_task_id: taskId,
              p_status: 'failed',
              p_error_message: 'Task failed on Freepik service',
              p_completed_at: new Date().toISOString()
            });
            
            if (failedUpdateError) {
              console.error(`❌ [FLUX_DEV_FALLBACK] ${taskId} failed status update error:`, failedUpdateError);
            }
            
            // Refund credits for failed task (1 credit for Flux Dev)
            try {
              const { refundUserCredits } = await import('@/lib/freepik/credits');
              const refunded = await refundUserCredits(user.id, '2x', taskId); // 使用2x来退回1积分
              console.log(`💳 [FLUX_DEV_FALLBACK] ${taskId} credits refund result:`, refunded);
            } catch (refundError) {
              console.error(`❌ [FLUX_DEV_FALLBACK] ${taskId} credits refund failed:`, refundError);
            }
            
            // Update taskData to reflect new status
            taskData.status = 'failed';
            taskData.error_message = 'Task failed on Freepik service';
            taskData.completed_at = new Date().toISOString();
            
          } else if (queryResult && queryResult.status === 'processing') {
            // 任务仍在处理中，重置状态回 processing，继续等待
            console.log(`🔄 [FLUX_DEV_FALLBACK] ${taskId} still processing, continue waiting`);
            
            const { error: resetError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
              p_task_id: taskId,
              p_status: 'processing'
            });
            
            if (resetError) {
              console.error(`⚠️ [FLUX_DEV_FALLBACK] ${taskId} reset status failed:`, resetError);
            }
            
          } else {
            // 查询失败，继续等待
            console.log(`⚠️ [FLUX_DEV_FALLBACK] ${taskId} query failed, continue waiting`);
            
            const { error: resetError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
              p_task_id: taskId,
              p_status: 'processing'
            });
            
            if (resetError) {
              console.error(`⚠️ [FLUX_DEV_FALLBACK] ${taskId} reset status failed:`, resetError);
            }
          }
        }
      }
    }
    
    // 8. Use updated status after potential fallback processing
    const finalStatus = taskData.status;
    
    // 9. 获取进度信息（如果有）
    let progress: number | undefined;
    if (redis && finalStatus === 'processing') {
      const progressStr = await redis.get(`task:${taskId}:progress`);
      if (progressStr !== null) {
        progress = parseInt(progressStr as string);
      }
    }

    // 10. 构建响应数据
    const baseResponse = {
      taskId,
      status: finalStatus,
      createdAt: taskData.created_at,
      prompt: taskData.prompt,
      aspectRatio: taskData.scale_factor, // 复用字段
      seed: taskData.creativity || undefined, // 复用字段
      creditsConsumed: taskData.credits_consumed
    };

    // 11. 根据状态返回不同信息
    switch (finalStatus) {
      case 'processing':
        return apiResponse.success({
          ...baseResponse,
          message: '图像正在生成中，请稍候...',
          progress,
          estimatedTimeRemaining: progress 
            ? `预计还需 ${Math.max(1, Math.ceil((100 - progress) / 20))} 分钟`
            : '预计还需 1-3 分钟'
        });

      case 'completed':
        const cdnUrl = taskData.cdn_url;
        
        if (!cdnUrl) {
          return apiResponse.error('任务已完成但生成图像不可用');
        }

        return apiResponse.success({
          ...baseResponse,
          message: '图像生成完成',
          cdnUrl,
          completedAt: taskData.completed_at,
          downloadUrl: cdnUrl
        });

      case 'failed':
        const errorMessage = taskData.error_message || '图像生成失败';
        
        return apiResponse.success({
          ...baseResponse,
          message: '图像生成失败',
          error: errorMessage,
          canRetry: true
        });

      default:
        return apiResponse.success({
          ...baseResponse,
          message: '任务状态未知'
        });
    }

  } catch (error) {
    console.error('Error in text-to-image/status API:', error);
    return apiResponse.serverError('获取任务状态失败');
  }
}