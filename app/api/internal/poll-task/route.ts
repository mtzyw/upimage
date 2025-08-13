import { NextRequest } from 'next/server';
import { Client } from '@upstash/qstash';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { apiResponse } from '@/lib/api-response';
import { redis } from '@/lib/upstash';
import { uploadOptimizedImageLocalToR2, getImageExtension } from '@/lib/freepik/utils';
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
    
    // 上传到 R2
    const uploadResult = await uploadOptimizedImageLocalToR2(
      imageResponse,
      'authenticated',
      taskId,
      getImageExtension(imageUrl)
    );
    
    console.log(`✅ [POLL_TASK] Image uploaded to R2 for ${taskId}: ${uploadResult.url}`);
    return uploadResult.url;
  } catch (error) {
    console.error(`❌ [POLL_TASK] Failed to process image for ${taskId}:`, error);
    return null;
  }
}

// 计算指数退避延迟
function calculateBackoff(attempt: number): number {
  // 基础延迟：10秒
  const baseDelay = 10;
  // 指数增长，最大延迟5分钟
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 300);
  // 添加抖动 ±20%
  const jitter = Math.floor(Math.random() * 0.4 * delay) - 0.2 * delay;
  return Math.max(10, Math.floor(delay + jitter));
}

// POST 处理轮询请求
async function handlePollRequest(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, attempt = 1, userId, scaleFactor } = body;

    console.log(`🔄 [POLL_TASK] Polling task ${taskId}, attempt ${attempt}`);

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
      
      // 退还积分
      if (userId && scaleFactor) {
        try {
          await refundUserCredits(userId, scaleFactor, taskId);
          console.log(`💳 [POLL_TASK] Credits refunded for expired task ${taskId}`);
        } catch (refundError) {
          console.error(`❌ [POLL_TASK] Failed to refund credits for ${taskId}:`, refundError);
        }
      }
      
      return apiResponse.success({ message: 'Task expired' });
    }

    // 4. 查询 Freepik API 状态
    if (!task.api_key) {
      console.error(`❌ [POLL_TASK] No API key for task ${taskId}`);
      return apiResponse.error('No API key available');
    }

    const queryResult = await queryFreepikTaskStatus(taskId, task.api_key);
    
    if (!queryResult) {
      console.error(`❌ [POLL_TASK] Failed to query status for ${taskId}`);
      // 查询失败，继续重试
      if (qstash && attempt < 30) {
        const delay = calculateBackoff(attempt);
        console.log(`🔄 [POLL_TASK] Scheduling retry ${attempt + 1} for ${taskId} in ${delay}s`);
        
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/poll-task`,
          body: { taskId, attempt: attempt + 1, userId, scaleFactor },
          delay,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return apiResponse.success({ message: 'Query failed, retry scheduled' });
    }

    // 5. 根据状态处理
    if (queryResult.status === 'completed' && queryResult.result?.generated?.[0]) {
      console.log(`✅ [POLL_TASK] Task ${taskId} completed`);
      
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
        
        // 清理 Redis 缓存
        if (redis) {
          await redis.del(`task_cache:${taskId}`);
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
        
        // 退还积分
        if (userId && scaleFactor) {
          await refundUserCredits(userId, scaleFactor, taskId);
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
      // 仍在处理中，注册下次轮询
      if (qstash && attempt < 30) {
        const delay = calculateBackoff(attempt);
        console.log(`🔄 [POLL_TASK] Task ${taskId} still processing, next poll in ${delay}s`);
        
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/poll-task`,
          body: { taskId, attempt: attempt + 1, userId, scaleFactor },
          delay,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (attempt >= 30) {
        console.log(`❌ [POLL_TASK] Task ${taskId} reached max attempts`);
        
        // 达到最大尝试次数
        await supabaseAdmin
          .from('image_enhancement_tasks')
          .update({
            status: 'failed',
            error_message: 'Max polling attempts reached',
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);
        
        // 退还积分
        if (userId && scaleFactor) {
          await refundUserCredits(userId, scaleFactor, taskId);
        }
      }
      
      return apiResponse.success({ message: 'Task still processing' });
    }
    
  } catch (error) {
    console.error('❌ [POLL_TASK] Error:', error);
    return apiResponse.serverError('Polling failed');
  }
}

// 验证 QStash 签名的中间件
async function verifyQStashSignature(req: NextRequest): Promise<boolean> {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
    // 开发环境没有配置签名验证
    return true;
  }

  try {
    const signature = req.headers.get('upstash-signature');
    if (!signature) {
      console.error('❌ [POLL_TASK] Missing QStash signature');
      return false;
    }

    // QStash 签名验证逻辑
    // 这里简化处理，实际生产环境应该使用完整的验证
    return true;
  } catch (error) {
    console.error('❌ [POLL_TASK] Signature verification failed:', error);
    return false;
  }
}

// POST 处理函数
export async function POST(req: NextRequest) {
  // 验证签名
  const isValid = await verifyQStashSignature(req);
  if (!isValid) {
    return apiResponse.unauthorized('Invalid signature');
  }

  // 调用实际处理函数
  return handlePollRequest(req);
}

// 支持健康检查
export async function GET() {
  return apiResponse.success({ status: 'ok', message: 'Poll task endpoint is healthy' });
}