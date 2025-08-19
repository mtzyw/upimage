import { NextRequest } from 'next/server';
import { Client } from '@upstash/qstash';

// 强制使用 Node.js runtime 以支持流式上传
export const runtime = 'nodejs';
import { verifySignature } from '@upstash/qstash/nextjs';
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

// 查询 Freepik API 任务状态
async function queryFreepikTaskStatus(taskId: string, apiKey: string): Promise<{
  status: 'processing' | 'completed' | 'failed';
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
      console.error(`❌ [POLL_TASK] Freepik API error for ${taskId}: ${response.status}`);
      return null;
    }

    const result = await response.json();
    const taskData = result.data;

    if (!taskData || !taskData.status) {
      console.error(`❌ [POLL_TASK] Invalid response for ${taskId}:`, result);
      return null;
    }

    // Freepik 返回大写状态，转换为小写
    const status = taskData.status.toUpperCase();
    
    if (status === 'DONE' || status === 'COMPLETED') {
      return {
        status: 'completed',
        result: taskData
      };
    } else if (status === 'FAILED') {
      return {
        status: 'failed',
        error: taskData.error || 'Task failed on Freepik'
      };
    } else if (status === 'IN_PROGRESS' || status === 'PROCESSING' || status === 'CREATED') {
      return {
        status: 'processing'
      };
    }

    // 未知状态当作处理中
    return {
      status: 'processing'
    };
  } catch (error) {
    console.error(`❌ [POLL_TASK] Failed to query ${taskId}:`, error);
    return null;
  }
}

// 处理完成的任务
async function processCompletedTask(
  taskId: string, 
  imageUrl: string, 
  userId: string
): Promise<string | null> {
  try {
    console.log(`💾 [POLL_TASK] Processing completed image for ${taskId}`);
    
    // 下载图片
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    // 尝试流式上传到 R2
    const uploadResult = await uploadOptimizedImageStreamToR2(
      imageResponse,
      'authenticated',
      taskId,
      getImageExtension(imageUrl),
      true // 启用回退，流式上传失败时降级到本地文件方案
    );
    
    // 记录使用的上传方式
    if (uploadResult.uploadMethod === 'stream') {
      console.log(`🎯 [POLL_TASK] ✨ 轮询任务成功使用零内存流式上传!`);
    } else {
      console.log(`📁 [POLL_TASK] ⚠️ 轮询任务使用了本地文件上传方案 (流式上传失败降级)`);
    }
    
    console.log(`✅ [POLL_TASK] Image uploaded to R2 for ${taskId}: ${uploadResult.url}`);
    return uploadResult.url;
  } catch (error) {
    console.error(`❌ [POLL_TASK] Failed to process image for ${taskId}:`, error);
    return null;
  }
}

// 计算指数退避延迟 - 优化版本，减少轮询频率
function calculateBackoff(attempt: number): number {
  // 优化：基础延迟增加到30秒，减少系统压力
  const baseDelay = 30;
  // 指数增长，最大延迟10分钟（增加到600秒）
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 600);
  // 添加抖动 ±20%
  const jitter = Math.floor(Math.random() * 0.4 * delay) - 0.2 * delay;
  return Math.max(30, Math.floor(delay + jitter));
}

// POST 处理轮询请求
async function handlePollRequest(req: Request | NextRequest) {
  let taskId: string | undefined;
  
  try {
    const body = await req.json();
    ({ taskId } = body);
    const { attempt = 1, userId, scaleFactor } = body;

    if (!taskId) {
      console.error('❌ [POLL_TASK] Missing taskId');
      return apiResponse.badRequest('Missing taskId');
    }

    console.log(`🔄 [POLL_TASK] Polling task ${taskId}, attempt ${attempt}`);

    // 0. 使用分布式锁防止并发处理
    if (redis) {
      const lockKey = `poll_lock:${taskId}`;
      const locked = await redis.set(lockKey, '1', { 
        nx: true,  // 只在不存在时设置
        ex: 60     // 60秒超时
      });
      
      if (!locked) {
        console.log(`⚠️ [POLL_TASK] Task ${taskId} is already being processed`);
        return apiResponse.success({ message: 'Task already being processed' });
      }
    }

    // 1. 从数据库获取任务信息
    const { data: task, error: taskError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.error(`❌ [POLL_TASK] Task not found: ${taskId}`);
      return apiResponse.notFound('Task not found');
    }

    // 2. 检查任务是否已是终态
    if (task.status === 'completed' || task.status === 'failed') {
      console.log(`ℹ️ [POLL_TASK] Task ${taskId} already in final state: ${task.status}`);
      return apiResponse.success({ message: 'Task already processed' });
    }

    // 3. 检查是否超时（30分钟）
    if (!task.created_at) {
      console.error(`❌ [POLL_TASK] Task ${taskId} has no created_at timestamp`);
      return apiResponse.error('Invalid task data');
    }
    
    const taskAge = Date.now() - new Date(task.created_at).getTime();
    const maxAge = 30 * 60 * 1000; // 30分钟
    
    if (taskAge > maxAge) {
      console.log(`⏰ [POLL_TASK] Task ${taskId} expired after ${Math.round(taskAge / 60000)} minutes`);
      
      // 标记为失败
      await supabaseAdmin
        .from('image_enhancement_tasks')
        .update({
          status: 'failed',
          error_message: 'Task expired after 30 minutes',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      // 退还积分（使用幂等键防止重复退还）
      if (userId && scaleFactor && redis) {
        const refundKey = `refund:${taskId}`;
        const alreadyRefunded = await redis.get(refundKey);
        
        if (!alreadyRefunded) {
          try {
            await refundUserCredits(userId, scaleFactor, taskId);
            await redis.set(refundKey, true, { ex: 86400 }); // 记录24小时
            console.log(`💳 [POLL_TASK] Credits refunded for expired task ${taskId}`);
          } catch (refundError) {
            console.error(`❌ [POLL_TASK] Failed to refund credits for ${taskId}:`, refundError);
          }
        } else {
          console.log(`⚠️ [POLL_TASK] Credits already refunded for ${taskId}`);
        }
      }
      
      return apiResponse.success({ message: 'Task expired' });
    }

    // 4. 优化：先检查Redis缓存状态，避免无效API调用
    if (redis) {
      const cachedStatus = await redis.get(`task_cache:${taskId}`);
      if (cachedStatus) {
        try {
          const cachedTask = typeof cachedStatus === 'string' ? JSON.parse(cachedStatus) : cachedStatus;
          if (cachedTask.status === 'completed' || cachedTask.status === 'failed') {
            console.log(`✅ [POLL_TASK] Task ${taskId} already ${cachedTask.status} in cache, skipping API query`);
            return apiResponse.success({ 
              message: `Task already ${cachedTask.status}`, 
              status: cachedTask.status 
            });
          }
        } catch (parseError) {
          console.warn(`⚠️ [POLL_TASK] Failed to parse cached status for ${taskId}:`, parseError);
        }
      }
    }

    // 5. 查询 Freepik API 状态
    if (!task.api_key) {
      console.error(`❌ [POLL_TASK] No API key for task ${taskId}`);
      return apiResponse.error('No API key available');
    }

    const queryResult = await queryFreepikTaskStatus(taskId, task.api_key);
    
    if (!queryResult) {
      console.error(`❌ [POLL_TASK] Failed to query status for ${taskId}`);
      // 查询失败，继续重试（减少到5次）
      if (qstash && attempt < 5) {
        const delay = calculateBackoff(attempt);
        console.log(`🔄 [POLL_TASK] Scheduling retry ${attempt + 1} for ${taskId} in ${delay}s (max 5 attempts)`);
        
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/poll-task`,
          body: { taskId, attempt: attempt + 1, userId, scaleFactor },
          delay,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (attempt >= 5) {
        console.log(`❌ [POLL_TASK] Task ${taskId} reached max query attempts (5), marking as failed`);
        
        // 达到最大查询尝试次数，标记为失败
        await supabaseAdmin
          .from('image_enhancement_tasks')
          .update({
            status: 'failed',
            error_message: 'Max query attempts reached - API unavailable',
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        // 退还积分
        if (userId && scaleFactor && redis) {
          const refundKey = `refund:${taskId}`;
          const alreadyRefunded = await redis.get(refundKey);
          
          if (!alreadyRefunded) {
            await refundUserCredits(userId, scaleFactor, taskId);
            await redis.set(refundKey, true, { ex: 86400 });
            console.log(`💳 [POLL_TASK] Credits refunded for failed task ${taskId}`);
          }
        }
      }
      return apiResponse.success({ message: 'Query failed, retry scheduled' });
    }

    // 6. 根据状态处理
    if (queryResult.status === 'completed' && queryResult.result?.generated?.[0]) {
      console.log(`✅ [POLL_TASK] Task ${taskId} completed`);
      
      // 🔒 使用统一的完成处理锁，与webhook保持一致
      let hasCompletionLock = false;
      const completionLockKey = `completion_lock:${taskId}`;
      
      try {
        if (redis) {
          const locked = await redis.set(completionLockKey, 'poll-task', { 
            nx: true,  // 只在不存在时设置
            ex: 300    // 5分钟超时
          });
          
          if (!locked) {
            console.log(`🔒 [POLL_TASK] Task ${taskId} is being processed by webhook, skipping`);
            return apiResponse.success({ message: 'Task being processed by webhook' });
          }
          
          hasCompletionLock = true;
          console.log(`🆕 [POLL_TASK] Acquired completion lock for task ${taskId}`);
        }

        // 再次检查任务状态
        const { data: currentTask } = await supabaseAdmin
          .from('image_enhancement_tasks')
          .select('status, cdn_url')
          .eq('id', taskId)
          .single();

        if (currentTask?.status === 'completed') {
          console.log(`✅ [POLL_TASK] Task ${taskId} already completed, skipping duplicate processing`);
          return apiResponse.success({ message: 'Task already completed' });
        }

        // 处理图片
        const cdnUrl = await processCompletedTask(
          taskId,
          queryResult.result.generated[0],
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
        
        // 更新 Redis 缓存而不是删除（避免前端查询时缓存旧数据）
        if (redis) {
          const updatedTaskData = {
            user_id: task.user_id,
            status: 'completed',
            created_at: task.created_at,
            completed_at: new Date().toISOString(),
            error_message: null,
            r2_original_key: task.r2_original_key,
            cdn_url: cdnUrl,
            scale_factor: task.scale_factor,
            credits_consumed: task.credits_consumed
          };
          await redis.set(`task_cache:${taskId}`, updatedTaskData, { ex: 300 });
          console.log(`📝 [POLL_TASK] Task cache updated for ${taskId}`);
        }
        
        console.log(`🎉 [POLL_TASK] Task ${taskId} successfully processed`);
        
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
        
        // 退还积分（使用幂等键防止重复退还）
        if (userId && scaleFactor && redis) {
          const refundKey = `refund:${taskId}`;
          const alreadyRefunded = await redis.get(refundKey);
          
          if (!alreadyRefunded) {
            await refundUserCredits(userId, scaleFactor, taskId);
            await redis.set(refundKey, true, { ex: 86400 });
            console.log(`💳 [POLL_TASK] Credits refunded for failed task ${taskId}`);
          }
        }
      }
      
      } finally {
        // 🔓 释放完成处理锁
        if (hasCompletionLock && redis) {
          await redis.del(completionLockKey);
          console.log(`🔓 [POLL_TASK] Released completion lock for task ${taskId}`);
        }
      }
      
      return apiResponse.success({ message: 'Task completed' });
      
    } else if (queryResult.status === 'failed') {
      console.log(`❌ [POLL_TASK] Task ${taskId} failed`);
      
      // 更新为失败状态
      await supabaseAdmin
        .from('image_enhancement_tasks')
        .update({
          status: 'failed',
          error_message: queryResult.error || 'Task failed on Freepik',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      // 退还积分
      if (userId && scaleFactor) {
        await refundUserCredits(userId, scaleFactor, taskId);
      }
      
      return apiResponse.success({ message: 'Task failed' });
      
    } else {
      // 仍在处理中，优化策略：减少轮询，更多依赖Webhook
      if (qstash && attempt < 3) {
        const delay = calculateBackoff(attempt);
        console.log(`🔄 [POLL_TASK] Task ${taskId} still processing, next poll in ${delay}s (max 3 polls, then rely on webhook)`);
        
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/poll-task`,
          body: { taskId, attempt: attempt + 1, userId, scaleFactor },
          delay,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (attempt >= 3) {
        console.log(`⏳ [POLL_TASK] Task ${taskId} reached max polling attempts (3), now relying on webhook`);
        
        // 不再创建新的QStash任务，完全依赖Webhook
        // 任务继续在处理中，等待Webhook通知完成
        console.log(`📞 [POLL_TASK] Task ${taskId} will complete via webhook or timeout mechanism`);
      }
      
      return apiResponse.success({ message: 'Task still processing' });
    }
    
  } catch (error) {
    console.error('❌ [POLL_TASK] Error:', error);
    return apiResponse.serverError('Polling failed');
  } finally {
    // 释放分布式锁
    if (redis && taskId) {
      const lockKey = `poll_lock:${taskId}`;
      await redis.del(lockKey);
      console.log(`🔓 [POLL_TASK] Lock released for task ${taskId}`);
    }
  }
}

// POST 处理函数 - 直接导出而不是使用 verifySignature HOC
export async function POST(req: NextRequest) {
  // 验证签名
  if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
    const signature = req.headers.get('upstash-signature');
    
    if (!signature) {
      console.error('❌ [POLL_TASK] Missing QStash signature');
      return apiResponse.unauthorized('Missing signature');
    }
    
    // TODO: 实现完整的签名验证
    // 暂时先通过，后续可以使用 @upstash/qstash 的验证方法
    console.log('✅ [POLL_TASK] Signature present, processing request');
  }
  
  return handlePollRequest(req);
}

// 支持健康检查
export async function GET() {
  return apiResponse.success({ status: 'ok', message: 'Poll task endpoint is healthy' });
}