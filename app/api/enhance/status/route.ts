import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';

// 强制使用 Node.js runtime 以支持流式上传
export const runtime = 'nodejs';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { getTaskStatus } from '@/lib/freepik/utils';
import { redis } from '@/lib/upstash';
import { uploadOptimizedImageStreamToR2, getImageExtension } from '@/lib/freepik/utils';

// Helper function to process completed image task
async function processCompletedImageTask(imageUrl: string, taskId: string, userType: string): Promise<string> {
  const taskIdShort = taskId.slice(0, 8);
  console.log(`💾 [ENHANCE-${taskIdShort}] 开始处理图片: ${imageUrl}`);

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
    console.log(`🎯 [ENHANCE-${taskIdShort}] ✨ 状态检查成功使用零内存流式上传!`);
  } else {
    console.log(`📁 [ENHANCE-${taskIdShort}] ⚠️ 状态检查使用了本地文件上传方案 (流式上传失败降级)`);
  }
  
  console.log(`✅ [ENHANCE-${taskIdShort}] 图片处理成功: ${uploadResult.url}`);
  return uploadResult.url;
}

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Active query to Freepik API for task status
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
      console.error(`❌ [ENHANCE_QUERY] ${taskId} HTTP ${response.status}:`, await response.text());
      return null;
    }

    const result = await response.json();
    const taskData = result.data;
    console.log(`🔍 [ENHANCE_QUERY] ${taskId} status:`, taskData?.status);

    if (!taskData || !taskData.status) {
      console.error(`❌ [ENHANCE_QUERY] ${taskId} invalid response:`, result);
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
    console.error(`❌ [ENHANCE_QUERY] ${taskId} failed:`, error);
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

    // 减少日志输出
    // console.log(`Checking status for task: ${taskId}, user: ${user.id}`);

    // 3. 优先从 Redis 缓存获取任务信息
    let taskData = null;
    let fromCache = false;

    if (redis) {
      try {
        const cachedTask = await redis.get(`task_cache:${taskId}`);
        if (cachedTask) {
          // console.log(`Raw cached data:`, typeof cachedTask, cachedTask);
          
          // Upstash Redis 可能会自动反序列化，检查数据类型
          if (typeof cachedTask === 'object' && cachedTask !== null) {
            // 已经是对象，直接使用
            taskData = cachedTask;
            fromCache = true;
            // console.log(`Task data loaded from Redis cache (object): ${taskId}`);
          } else if (typeof cachedTask === 'string') {
            // 是字符串，尝试解析
            try {
              taskData = JSON.parse(cachedTask);
              fromCache = true;
              // console.log(`Task data loaded from Redis cache (parsed): ${taskId}`);
            } catch (parseError) {
              console.error(`Failed to parse cached JSON for ${taskId}:`, parseError);
              // 清除无效缓存
              await redis.del(`task_cache:${taskId}`);
            }
          }
        }
      } catch (redisError) {
        console.error(`Redis error for ${taskId}:`, redisError);
      }
    }

    // 如果缓存中没有，从数据库查询
    if (!taskData) {
      const { data: dbTaskData, error: taskError } = await supabaseAdmin
        .from('image_enhancement_tasks')
        .select('user_id, status, created_at, completed_at, error_message, r2_original_key, cdn_url, scale_factor, credits_consumed')
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
          // 使用 Upstash Redis，不需要手动 JSON.stringify，让它自动处理
          await redis.set(`task_cache:${taskId}`, taskData, { ex: 300 });
          // console.log(`Task data cached to Redis: ${taskId}`);
        } catch (cacheError) {
          console.error(`Failed to cache task data for ${taskId}:`, cacheError);
        }
      }
    }

    // 验证任务所有权
    if (taskData.user_id !== user.id) {
      console.log(`Access denied: task ${taskId} belongs to ${taskData.user_id}, requested by ${user.id}`);
      return apiResponse.forbidden('无权访问此任务');
    }

    // 4. 检查任务超时并执行 fallback 查询
    const currentStatus = taskData.status;
    const taskCreatedAt = new Date(taskData.created_at);
    const timeoutMinutes = 2;
    const isTimeout = currentStatus === 'processing' && 
                     (Date.now() - taskCreatedAt.getTime()) > (timeoutMinutes * 60 * 1000);
    
    if (isTimeout) {
      console.log(`⏰ [ENHANCE_FALLBACK] ${taskId} timed out after ${Math.round((Date.now() - taskCreatedAt.getTime()) / 60000)}min, starting fallback`);
      
      // Get task with API key for fallback query
      const { data: taskWithApiKey } = await supabaseAdmin
        .from('image_enhancement_tasks')
        .select('api_key, scale_factor')
        .eq('id', taskId)
        .single();
        
      if (taskWithApiKey?.api_key) {
        // Set status to uploading to prevent concurrent processing
        const { data: updateResult, error: updateError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
          p_task_id: taskId,
          p_status: 'uploading'
        });
        
        if (updateError) {
          console.error(`❌ [ENHANCE_FALLBACK] ${taskId} status update failed:`, updateError);
        } else if (!updateResult) {
          console.error(`❌ [ENHANCE_FALLBACK] ${taskId} task not found for status update`);
        } else {
          console.log(`🔒 [ENHANCE_FALLBACK] ${taskId} status locked to uploading, querying...`);
          
          // Query Freepik API
          const queryResult = await queryFreepikTaskStatus(taskId, taskWithApiKey.api_key);
          
          if (queryResult && queryResult.status === 'completed' && queryResult.result?.generated?.[0]) {
            console.log(`🔄 [ENHANCE_FALLBACK] ${taskId} Freepik status: completed`);
            console.log(`💾 [ENHANCE_FALLBACK] ${taskId} starting image processing`);
            
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
                console.error(`❌ [ENHANCE_FALLBACK] ${taskId} final status update failed:`, finalUpdateError);
              }
              
              console.log(`✅ [ENHANCE_FALLBACK] ${taskId} processing completed`);
              
              // Update taskData to reflect new status
              taskData.status = 'completed';
              taskData.cdn_url = cdnUrl;
              taskData.completed_at = new Date().toISOString();
              
            } catch (processError) {
              console.error(`❌ [ENHANCE_FALLBACK] ${taskId} image processing failed:`, processError);
              
              // Update status to failed
              await supabaseAdmin.rpc('update_image_enhancement_task_status', {
                p_task_id: taskId,
                p_status: 'failed',
                p_error_message: 'Image processing failed after Freepik completion'
              });
            }
          } else if (queryResult && queryResult.status === 'failed') {
            // Freepik task failed
            console.log(`❌ [ENHANCE_FALLBACK] ${taskId} Freepik task failed`);
            
            const { error: failedUpdateError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
              p_task_id: taskId,
              p_status: 'failed',
              p_error_message: 'Task failed on Freepik service',
              p_completed_at: new Date().toISOString()
            });
            
            if (failedUpdateError) {
              console.error(`❌ [ENHANCE_FALLBACK] ${taskId} failed status update error:`, failedUpdateError);
            }
            
            // Refund credits for failed task
            try {
              const { refundUserCredits } = await import('@/lib/freepik/credits');
              const refunded = await refundUserCredits(user.id, taskWithApiKey.scale_factor, taskId);
              console.log(`💳 [ENHANCE_FALLBACK] ${taskId} credits refund result:`, refunded);
            } catch (refundError) {
              console.error(`❌ [ENHANCE_FALLBACK] ${taskId} credits refund failed:`, refundError);
            }
            
            // Update taskData to reflect new status
            taskData.status = 'failed';
            taskData.error_message = 'Task failed on Freepik service';
            taskData.completed_at = new Date().toISOString();
            
          } else if (queryResult && queryResult.status === 'processing') {
            // 任务仍在处理中，重置状态回 processing，继续等待
            console.log(`🔄 [ENHANCE_FALLBACK] ${taskId} still processing, continue waiting`);
            
            const { error: resetError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
              p_task_id: taskId,
              p_status: 'processing'
            });
            
            if (resetError) {
              console.error(`⚠️ [ENHANCE_FALLBACK] ${taskId} reset status failed:`, resetError);
            }
            
            // 不改变任务状态，继续等待 webhook 或 QStash 轮询
            console.log(`ℹ️ [ENHANCE_FALLBACK] ${taskId} will be handled by webhook or QStash polling`);
            
          } else {
            // 查询完全失败，但不强制标记为失败，继续等待
            console.log(`⚠️ [ENHANCE_FALLBACK] ${taskId} query failed, but continue waiting`);
            
            const { error: resetError } = await supabaseAdmin.rpc('update_image_enhancement_task_status', {
              p_task_id: taskId,
              p_status: 'processing'
            });
            
            if (resetError) {
              console.error(`⚠️ [ENHANCE_FALLBACK] ${taskId} reset status failed:`, resetError);
            }
            
            // 保持 processing 状态，不退还积分
            console.log(`ℹ️ [ENHANCE_FALLBACK] ${taskId} keeping processing status, waiting for webhook/polling`);
          }
        }
      }
    }
    
    // Use updated status after potential fallback processing
    const finalStatus = taskData.status;
    
    // 5. 获取进度信息（如果有）
    let progress: number | undefined;
    if (redis && finalStatus === 'processing') {
      const progressStr = await redis.get(`task:${taskId}:progress`);
      if (progressStr !== null) {
        progress = parseInt(progressStr as string);
      }
    }

    // 6. 构建原图 URL
    const originalUrl = taskData.r2_original_key 
      ? `${process.env.R2_PUBLIC_URL}/${taskData.r2_original_key}`
      : undefined;

    // 7. 根据状态返回不同信息
    
    const baseResponse = {
      taskId,
      status: finalStatus,
      createdAt: taskData.created_at,
      scaleFactor: taskData.scale_factor,
      creditsConsumed: taskData.credits_consumed,
      originalUrl
    };

    switch (finalStatus) {
      case 'processing':
        return apiResponse.success({
          ...baseResponse,
          message: '图像正在处理中，请稍候...',
          progress,
          estimatedTimeRemaining: progress 
            ? `预计还需 ${Math.max(1, Math.ceil((100 - progress) / 10))} 分钟`
            : getEstimatedTimeByScale(taskData.scale_factor)
        });

      case 'completed':
        const cdnUrl = taskData.cdn_url;
        
        if (!cdnUrl) {
          return apiResponse.error('任务已完成但优化图像不可用');
        }

        return apiResponse.success({
          ...baseResponse,
          message: '图像处理完成',
          cdnUrl,
          completedAt: taskData.completed_at,
          downloadUrl: cdnUrl // 提供下载链接
        });

      case 'failed':
        const errorMessage = taskData.error_message || '图像处理失败';
        
        return apiResponse.success({
          ...baseResponse,
          message: '图像处理失败',
          error: errorMessage,
          canRetry: true // 允许重试
        });

      default:
        return apiResponse.success({
          ...baseResponse,
          message: '任务状态未知'
        });
    }

  } catch (error) {
    console.error('Error in enhance/status API:', error);
    return apiResponse.serverError('获取任务状态失败');
  }
}

/**
 * 根据放大倍数获取预估处理时间
 * @param scaleFactor 放大倍数
 * @returns 预估时间字符串
 */
function getEstimatedTimeByScale(scaleFactor: string): string {
  const timeMap: Record<string, string> = {
    '2x': '预计还需 1-2 分钟',
    '4x': '预计还需 2-3 分钟',
    '8x': '预计还需 3-6 分钟',
    '16x': '预计还需 6-12 分钟'
  };
  
  return timeMap[scaleFactor] || '预计还需几分钟';
}