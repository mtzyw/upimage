import { NextRequest } from 'next/server';
import { Client } from '@upstash/qstash';
import { fal } from '@fal-ai/client';

// 强制使用 Node.js runtime 以支持流式上传
export const runtime = 'nodejs';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { apiResponse } from '@/lib/api-response';
import { redis } from '@/lib/upstash';
import { uploadOptimizedImageStreamToR2, getImageExtension } from '@/lib/freepik/utils';
import { refundUserCredits } from '@/lib/freepik/credits';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const qstash = process.env.QSTASH_TOKEN ? new Client({
  token: process.env.QSTASH_TOKEN
}) : null;

// 配置 fal.ai 客户端
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  });
}

// 查询 fal.ai API 任务状态（使用官方客户端）
async function queryFalTaskStatus(requestId: string): Promise<{
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
} | null> {
  try {
    if (!process.env.FAL_KEY) {
      console.error(`❌ [POLL_FAL_TASK] No FAL_KEY configured`);
      return null;
    }

    // 使用 fal.ai 官方客户端查询状态
    const result = await fal.queue.status("fal-ai/qwen-image-edit", {
      requestId,
      logs: false
    });

    console.log(`🔍 [POLL_FAL_TASK] fal.ai status response for ${requestId}:`, result);

    if (!result || !result.status) {
      console.error(`❌ [POLL_FAL_TASK] Invalid response for ${requestId}:`, result);
      return null;
    }

    // fal.ai 返回状态转换
    const status = result.status.toUpperCase();
    
    if (status === 'COMPLETED') {
      // 获取完整结果
      const fullResult = await fal.queue.result("fal-ai/qwen-image-edit", {
        requestId
      });
      
      return {
        status: 'completed',
        result: fullResult
      };
    } else if (status === 'FAILED') {
      // 类型断言处理可能存在的错误信息
      const errorResult = result as any;
      return {
        status: 'failed',
        error: errorResult.error?.message || errorResult.error || 'Task failed on fal.ai'
      };
    } else if (status === 'IN_PROGRESS' || status === 'IN_QUEUE') {
      return {
        status: 'processing'
      };
    }

    // 未知状态当作处理中
    return {
      status: 'processing'
    };
  } catch (error) {
    console.error(`❌ [POLL_FAL_TASK] Failed to query ${requestId}:`, error);
    return null;
  }
}

// 处理完成的任务
async function processCompletedFalTask(
  taskId: string, 
  imageUrl: string, 
  userId: string
): Promise<string | null> {
  try {
    console.log(`💾 [POLL_FAL_TASK] Processing completed image for ${taskId}`);
    
    // 下载图片
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    // 尝试流式上传到 R2
    const uploadResult = await uploadOptimizedImageStreamToR2(
      imageResponse,
      userId,
      taskId,
      getImageExtension(imageUrl),
      true // 启用回退，流式上传失败时降级到本地文件方案
    );
    
    // 记录使用的上传方式
    if (uploadResult.uploadMethod === 'stream') {
      console.log(`🎯 [POLL_FAL_TASK] ✨ 轮询任务成功使用零内存流式上传!`);
    } else {
      console.log(`📁 [POLL_FAL_TASK] ⚠️ 轮询任务使用了本地文件上传方案 (流式上传失败降级)`);
    }
    
    console.log(`✅ [POLL_FAL_TASK] Image uploaded to R2 for ${taskId}: ${uploadResult.url}`);
    return uploadResult.url;
  } catch (error) {
    console.error(`❌ [POLL_FAL_TASK] Failed to process image for ${taskId}:`, error);
    return null;
  }
}

// 计算指数退避延迟 - 为fal.ai优化的版本
function calculateBackoff(attempt: number): number {
  // fal.ai 通常比较快，基础延迟设为15秒
  const baseDelay = 15;
  // 指数增长，最大延迟5分钟
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 300);
  // 添加抖动 ±20%
  const jitter = Math.floor(Math.random() * 0.4 * delay) - 0.2 * delay;
  return Math.max(15, Math.floor(delay + jitter));
}

// POST 处理轮询请求
async function handlePollRequest(req: Request | NextRequest) {
  let taskId: string | undefined;
  let requestId: string | undefined;
  
  try {
    const body = await req.json();
    ({ taskId, requestId } = body);
    const { attempt = 1, userId, creditsConsumed } = body;

    if (!taskId || !requestId) {
      console.error('❌ [POLL_FAL_TASK] Missing taskId or requestId');
      return apiResponse.badRequest('Missing taskId or requestId');
    }

    // 现在 taskId 和 requestId 应该是相同的（简化设计）
    console.log(`🔄 [POLL_FAL_TASK] Polling fal.ai task ${taskId}, attempt ${attempt}`);

    // 0. 使用分布式锁防止并发处理
    if (redis) {
      const lockKey = `fal_poll_lock:${taskId}`;
      const locked = await redis.set(lockKey, '1', { 
        nx: true,  // 只在不存在时设置
        ex: 60     // 60秒超时
      });
      
      if (!locked) {
        console.log(`⚠️ [POLL_FAL_TASK] Task ${taskId} is already being processed`);
        return apiResponse.success({ message: 'Task already being processed' });
      }
    }

    // 1. 从数据库获取任务信息
    const { data: task, error: taskError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('engine', 'qwen_image_edit') // 确保是 Qwen 任务
      .single();

    if (taskError || !task) {
      console.error(`❌ [POLL_FAL_TASK] Task not found: ${taskId}`);
      return apiResponse.notFound('Task not found');
    }

    // 2. 检查任务是否已是终态
    if (task.status === 'completed' || task.status === 'failed') {
      console.log(`ℹ️ [POLL_FAL_TASK] Task ${taskId} already in final state: ${task.status}`);
      return apiResponse.success({ message: 'Task already processed' });
    }

    // 3. 检查是否超时（15分钟，fal.ai通常比较快）
    if (!task.created_at) {
      console.error(`❌ [POLL_FAL_TASK] Task ${taskId} has no created_at timestamp`);
      return apiResponse.error('Invalid task data');
    }
    
    const taskAge = Date.now() - new Date(task.created_at).getTime();
    const maxAge = 15 * 60 * 1000; // 15分钟
    
    if (taskAge > maxAge) {
      console.log(`⏰ [POLL_FAL_TASK] Task ${taskId} expired after ${Math.round(taskAge / 60000)} minutes`);
      
      // 标记为失败
      await supabaseAdmin
        .from('image_enhancement_tasks')
        .update({
          status: 'failed',
          error_message: 'Task expired after 15 minutes',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      // 退还积分（使用幂等键防止重复退还）
      if (userId && creditsConsumed && redis) {
        const refundKey = `fal_refund:${taskId}`;
        const alreadyRefunded = await redis.get(refundKey);
        
        if (!alreadyRefunded) {
          try {
            await refundUserCredits(userId, '2x', taskId); // Qwen 编辑固定2积分，映射为2x
            await redis.set(refundKey, true, { ex: 86400 }); // 记录24小时
            console.log(`💳 [POLL_FAL_TASK] Credits refunded for expired task ${taskId}`);
          } catch (refundError) {
            console.error(`❌ [POLL_FAL_TASK] Failed to refund credits for ${taskId}:`, refundError);
          }
        } else {
          console.log(`⚠️ [POLL_FAL_TASK] Credits already refunded for ${taskId}`);
        }
      }
      
      return apiResponse.success({ message: 'Task expired' });
    }

    // 4. 优化：先检查Redis缓存状态，避免无效API调用
    if (redis) {
      const cachedStatus = await redis.get(`fal_task_cache:${taskId}`);
      if (cachedStatus) {
        try {
          const cachedTask = typeof cachedStatus === 'string' ? JSON.parse(cachedStatus) : cachedStatus;
          if (cachedTask.status === 'completed' || cachedTask.status === 'failed') {
            console.log(`✅ [POLL_FAL_TASK] Task ${taskId} already ${cachedTask.status} in cache, skipping API query`);
            return apiResponse.success({ 
              message: `Task already ${cachedTask.status}`, 
              status: cachedTask.status 
            });
          }
        } catch (parseError) {
          console.warn(`⚠️ [POLL_FAL_TASK] Failed to parse cached status for ${taskId}:`, parseError);
        }
      }
    }

    // 5. 查询 fal.ai API 状态
    const queryResult = await queryFalTaskStatus(requestId);
    
    if (!queryResult) {
      console.error(`❌ [POLL_FAL_TASK] Failed to query status for ${taskId}`);
      // 查询失败，继续重试（减少到3次）
      if (qstash && attempt < 3) {
        const delay = calculateBackoff(attempt);
        console.log(`🔄 [POLL_FAL_TASK] Scheduling retry ${attempt + 1} for ${taskId} in ${delay}s (max 3 attempts)`);
        
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/poll-fal-task`,
          body: { taskId, requestId, attempt: attempt + 1, userId, creditsConsumed },
          delay,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (attempt >= 3) {
        console.log(`❌ [POLL_FAL_TASK] Task ${taskId} reached max query attempts (3), marking as failed`);
        
        // 达到最大查询尝试次数，标记为失败
        await supabaseAdmin
          .from('image_enhancement_tasks')
          .update({
            status: 'failed',
            error_message: 'Max query attempts reached - fal.ai API unavailable',
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        // 退还积分
        if (userId && creditsConsumed && redis) {
          const refundKey = `fal_refund:${taskId}`;
          const alreadyRefunded = await redis.get(refundKey);
          
          if (!alreadyRefunded) {
            await refundUserCredits(userId, '2x', taskId); // Qwen 编辑固定2积分，映射为2x
            await redis.set(refundKey, true, { ex: 86400 });
            console.log(`💳 [POLL_FAL_TASK] Credits refunded for failed task ${taskId}`);
          }
        }
      }
      return apiResponse.success({ message: 'Query failed, retry scheduled' });
    }

    // 6. 根据状态处理
    if (queryResult.status === 'completed' && queryResult.result?.data?.images?.[0]?.url) {
      console.log(`✅ [POLL_FAL_TASK] Task ${taskId} completed`);
      
      // 🔒 使用统一的完成处理锁，与webhook保持一致
      let hasCompletionLock = false;
      const completionLockKey = `fal_completion_lock:${taskId}`;
      
      try {
        if (redis) {
          const locked = await redis.set(completionLockKey, 'poll-task', { 
            nx: true,  // 只在不存在时设置
            ex: 300    // 5分钟超时
          });
          
          if (!locked) {
            console.log(`🔒 [POLL_FAL_TASK] Task ${taskId} is being processed by webhook, skipping`);
            return apiResponse.success({ message: 'Task being processed by webhook' });
          }
          
          hasCompletionLock = true;
          console.log(`🆕 [POLL_FAL_TASK] Acquired completion lock for task ${taskId}`);
        }

        // 再次检查任务状态
        const { data: currentTask } = await supabaseAdmin
          .from('image_enhancement_tasks')
          .select('status, cdn_url')
          .eq('id', taskId)
          .single();

        if (currentTask?.status === 'completed') {
          console.log(`✅ [POLL_FAL_TASK] Task ${taskId} already completed, skipping duplicate processing`);
          return apiResponse.success({ message: 'Task already completed' });
        }

        // 处理图片
        const imageUrl = queryResult.result.data.images[0].url;
        const cdnUrl = await processCompletedFalTask(
          taskId,
          imageUrl,
          task.user_id
        );
      
        if (cdnUrl) {
          // 更新数据库
          await supabaseAdmin
            .from('image_enhancement_tasks')
            .update({
              status: 'completed',
              cdn_url: cdnUrl,
              completed_at: new Date().toISOString()
            })
            .eq('id', taskId);
          
          // 更新 Redis 缓存
          if (redis) {
            const updatedTaskData = {
              user_id: task.user_id,
              status: 'completed',
              created_at: task.created_at,
              completed_at: new Date().toISOString(),
              error_message: null,
              r2_original_key: task.r2_original_key,
              cdn_url: cdnUrl,
              engine: 'qwen_image_edit',
              credits_consumed: task.credits_consumed
            };
            await redis.set(`fal_task_cache:${taskId}`, updatedTaskData, { ex: 300 });
            console.log(`📝 [POLL_FAL_TASK] Task cache updated for ${taskId}`);
          }
          
          console.log(`🎉 [POLL_FAL_TASK] Task ${taskId} successfully processed`);
          
        } else {
          // 图片处理失败
          await supabaseAdmin
            .from('image_enhancement_tasks')
            .update({
              status: 'failed',
              error_message: 'Failed to process image',
              completed_at: new Date().toISOString()
            })
            .eq('id', taskId);
          
          // 退还积分
          if (userId && creditsConsumed && redis) {
            const refundKey = `fal_refund:${taskId}`;
            const alreadyRefunded = await redis.get(refundKey);
            
            if (!alreadyRefunded) {
              await refundUserCredits(userId, '2x', taskId); // Qwen 编辑固定2积分，映射为2x
              await redis.set(refundKey, true, { ex: 86400 });
              console.log(`💳 [POLL_FAL_TASK] Credits refunded for failed task ${taskId}`);
            }
          }
        }
        
      } finally {
        // 🔓 释放完成处理锁
        if (hasCompletionLock && redis) {
          await redis.del(completionLockKey);
          console.log(`🔓 [POLL_FAL_TASK] Released completion lock for task ${taskId}`);
        }
      }
      
      return apiResponse.success({ message: 'Task completed' });
      
    } else if (queryResult.status === 'failed') {
      console.log(`❌ [POLL_FAL_TASK] Task ${taskId} failed`);
      
      // 更新为失败状态
      await supabaseAdmin
        .from('image_enhancement_tasks')
        .update({
          status: 'failed',
          error_message: queryResult.error || 'Task failed on fal.ai',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      // 退还积分
      if (userId && creditsConsumed) {
        await refundUserCredits(userId, '2x', taskId); // Qwen 编辑固定2积分，映射为2x
      }
      
      return apiResponse.success({ message: 'Task failed' });
      
    } else {
      // 仍在处理中，fal.ai通常比较快，减少轮询次数
      if (qstash && attempt < 2) {
        const delay = calculateBackoff(attempt);
        console.log(`🔄 [POLL_FAL_TASK] Task ${taskId} still processing, next poll in ${delay}s (max 2 polls, then rely on webhook)`);
        
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/poll-fal-task`,
          body: { taskId, requestId, attempt: attempt + 1, userId, creditsConsumed },
          delay,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (attempt >= 2) {
        console.log(`⏳ [POLL_FAL_TASK] Task ${taskId} reached max polling attempts (2), now relying on webhook`);
        
        // 不再创建新的QStash任务，完全依赖Webhook
        // 任务继续在处理中，等待Webhook通知完成
        console.log(`📞 [POLL_FAL_TASK] Task ${taskId} will complete via webhook or timeout mechanism`);
      }
      
      return apiResponse.success({ message: 'Task still processing' });
    }
    
  } catch (error) {
    console.error('❌ [POLL_FAL_TASK] Error:', error);
    return apiResponse.serverError('Polling failed');
  } finally {
    // 释放分布式锁
    if (redis && taskId) {
      const lockKey = `fal_poll_lock:${taskId}`;
      await redis.del(lockKey);
      console.log(`🔓 [POLL_FAL_TASK] Lock released for task ${taskId}`);
    }
  }
}

// POST 处理函数 - QStash 验证签名
export async function POST(req: NextRequest) {
  // 验证签名
  if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
    const signature = req.headers.get('upstash-signature');
    
    if (!signature) {
      console.error('❌ [POLL_FAL_TASK] Missing QStash signature');
      return apiResponse.unauthorized('Missing signature');
    }
    
    // TODO: 实现完整的签名验证
    console.log('✅ [POLL_FAL_TASK] Signature present, processing request');
  }
  
  return handlePollRequest(req);
}

// 支持健康检查
export async function GET() {
  return apiResponse.success({ status: 'ok', message: 'Poll fal.ai task endpoint is healthy' });
}