import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { getTaskStatus } from '@/lib/freepik/utils';
import { redis } from '@/lib/upstash';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    console.log(`Checking status for task: ${taskId}, user: ${user.id}`);

    // 3. 优先从 Redis 缓存获取任务信息
    let taskData = null;
    let fromCache = false;

    if (redis) {
      try {
        const cachedTask = await redis.get(`task_cache:${taskId}`);
        if (cachedTask) {
          console.log(`Raw cached data:`, typeof cachedTask, cachedTask);
          
          // Upstash Redis 可能会自动反序列化，检查数据类型
          if (typeof cachedTask === 'object' && cachedTask !== null) {
            // 已经是对象，直接使用
            taskData = cachedTask;
            fromCache = true;
            console.log(`Task data loaded from Redis cache (object): ${taskId}`);
          } else if (typeof cachedTask === 'string') {
            // 是字符串，尝试解析
            try {
              taskData = JSON.parse(cachedTask);
              fromCache = true;
              console.log(`Task data loaded from Redis cache (parsed): ${taskId}`);
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
          console.log(`Task data cached to Redis: ${taskId}`);
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

    // 4. 直接使用数据库状态，因为它是最权威的
    // 不再依赖 getTaskStatus 的 Redis 缓存，避免缓存不一致问题
    const currentStatus = taskData.status;
    
    // 5. 获取进度信息（如果有）
    let progress: number | undefined;
    if (redis && currentStatus === 'processing') {
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
      status: currentStatus,
      createdAt: taskData.created_at,
      scaleFactor: taskData.scale_factor,
      creditsConsumed: taskData.credits_consumed,
      originalUrl
    };

    switch (currentStatus) {
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