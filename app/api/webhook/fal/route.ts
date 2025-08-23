import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';

// 强制使用 Node.js runtime 以支持流式上传
export const runtime = 'nodejs';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { redis } from '@/lib/upstash';
import { 
  uploadOptimizedImageStreamToR2,
  setTaskStatus, 
  getImageExtension 
} from '@/lib/freepik/utils';
import { refundUserCredits } from '@/lib/freepik/credits';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FalWebhookPayload {
  request_id: string;
  status: 'OK' | 'COMPLETED' | 'FAILED' | 'ERROR' | 'IN_PROGRESS' | 'IN_QUEUE';
  webhook_type?: string;
  payload?: {
    images?: Array<{
      url: string;
      width: number;
      height: number;
      content_type: string;
    }>;
    has_nsfw_concepts?: boolean[];
    prompt?: string;
    seed?: number;
    timings?: {
      inference: number;
    };
  };
  output?: {
    images?: Array<{
      url: string;
      width: number;
      height: number;
      content_type: string;
    }>;
  };
  error?: {
    message: string;
    detail?: string;
  } | null;
  logs?: Array<{
    level: string;
    message: string;
    timestamp: string;
  }>;
}

/**
 * 验证 Webhook 签名（可选的安全措施）
 * @param request 请求对象
 * @param body 请求体
 * @returns 是否验证通过
 */
async function verifyWebhookSignature(request: NextRequest, body: string): Promise<boolean> {
  // 如果设置了 Webhook 密钥，进行签名验证
  const webhookSecret = process.env.FAL_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // 没有设置密钥，跳过验证
    return true;
  }

  try {
    const signature = request.headers.get('x-fal-signature');
    if (!signature) {
      console.warn('Missing fal.ai webhook signature');
      return false;
    }

    // 验证签名逻辑（需要根据 fal.ai 的具体签名方式实现）
    // 通常是 HMAC-SHA256
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error('Error verifying fal.ai webhook signature:', error);
    return false;
  }
}

/**
 * 通过 fal.ai request_id 查找对应的任务（简化版，直接查数据库）
 * @param requestId fal.ai 的 request_id（现在就是数据库主键）
 * @returns 任务信息
 */
async function findTaskByRequestId(requestId: string) {
  try {
    console.log(`[findTaskByRequestId] Looking for task with request_id: ${requestId}`);
    
    // 直接从数据库查询（request_id 就是主键）
    const { data: taskData, error } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', requestId) // request_id 就是主键
      .eq('engine', 'qwen_image_edit') // 确保是 Qwen 任务
      .single();

    console.log(`[findTaskByRequestId] Database query result:`, { taskData, error });

    if (error || !taskData) {
      console.error(`Task not found in database: ${requestId}`, error);
      return null;
    }

    // 从 Redis 获取缓存信息（可选）
    let userId = taskData.user_id;
    let creditsConsumed = taskData.credits_consumed;

    if (redis) {
      const [redisUserId, redisCredits] = await Promise.all([
        redis.get(`task:${requestId}:user_id`),
        redis.get(`task:${requestId}:credits_consumed`)
      ]);

      userId = (typeof redisUserId === 'string' ? redisUserId : null) || userId;
      creditsConsumed = (typeof redisCredits === 'number' ? redisCredits : null) || creditsConsumed;
    }

    return {
      taskId: requestId, // 现在 taskId 就是 requestId
      userId,
      creditsConsumed,
      taskData
    };
  } catch (error) {
    console.error(`Error finding task for request_id ${requestId}:`, error);
    return null;
  }
}

/**
 * 处理任务完成
 * @param payload Webhook 载荷
 * @param taskInfo 任务信息
 */
async function handleFalTaskCompleted(payload: FalWebhookPayload, taskInfo: any) {
  const { taskId, userId } = taskInfo;
  
  console.log(`[handleFalTaskCompleted] Starting for task ${taskId}`);
  console.log(`[handleFalTaskCompleted] User: ${userId}`);
  console.log(`[handleFalTaskCompleted] Payload:`, JSON.stringify(payload, null, 2));

  // 🔒 添加分布式锁防止与poll-task并发处理
  let hasLock = false;
  const lockKey = `fal_completion_lock:${taskId}`;
  
  try {
    if (redis) {
      const locked = await redis.set(lockKey, 'webhook', { 
        nx: true,  // 只在不存在时设置
        ex: 300    // 5分钟超时（图片处理可能较长）
      });
      
      if (!locked) {
        console.log(`🔒 [FAL_WEBHOOK] Task ${taskId} is being processed by another handler, skipping`);
        return;
      }
      
      hasLock = true;
      console.log(`🆕 [FAL_WEBHOOK] Acquired completion lock for task ${taskId}`);
    }

    // 再次检查任务状态，防止竞态条件
    const { data: currentTask } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('status, cdn_url')
      .eq('id', taskId)
      .single();

    if (currentTask?.status === 'completed') {
      console.log(`✅ [FAL_WEBHOOK] Task ${taskId} already completed, skipping duplicate processing`);
      return;
    }

    if (currentTask?.status === 'failed') {
      console.log(`❌ [FAL_WEBHOOK] Task ${taskId} already failed, skipping processing`);
      return;
    }

    // 获取图片 URL（从 payload.images 或 output.images 数组中）
    let imageUrl = null;
    
    // 优先从 payload.images 获取（fal.ai 新格式）
    if (payload.payload?.images && payload.payload.images.length > 0) {
      imageUrl = payload.payload.images[0].url;
      console.log(`[handleFalTaskCompleted] Image URL found in payload.images: ${imageUrl}`);
    }
    // 回退到 output.images（旧格式）
    else if (payload.output?.images && payload.output.images.length > 0) {
      imageUrl = payload.output.images[0].url;
      console.log(`[handleFalTaskCompleted] Image URL found in output.images: ${imageUrl}`);
    }
    
    if (!imageUrl) {
      console.error(`[handleFalTaskCompleted] No image URL found in payload:`, payload);
      throw new Error('No image URL provided in completed task');
    }

    // 🚀 不立即更新为completed，等R2上传完成后再更新
    console.log(`🔄 Image processing completed, starting R2 upload optimization...`);
    console.log(`Processing completed task ${taskId}, downloading optimized image...`);

    // 开始流式下载和上传
    const imageResponse = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NextyDev-QwenImageEdit/1.0'
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to download optimized image: ${imageResponse.status}`);
    }

    const imageExtension = getImageExtension(imageUrl);
    const contentLength = parseInt(imageResponse.headers.get('content-length') || '0');
    
    console.log(`📥 Starting optimized download/upload, size: ${contentLength} bytes`);

    // 尝试流式上传（零内存占用）
    const uploadResult = await uploadOptimizedImageStreamToR2(
      imageResponse,
      userId,
      taskId,
      imageExtension,
      true // 启用回退，流式上传失败时降级到本地文件方案
    );

    const uploadMethod = uploadResult.uploadMethod;
    
    // 记录使用的上传方式
    if (uploadMethod === 'stream') {
      console.log(`🎯 [FAL_WEBHOOK] ✨ 正式用户成功使用零内存流式上传! 节省内存和磁盘I/O`);
    } else {
      console.log(`📁 [FAL_WEBHOOK] ⚠️ 正式用户使用了本地文件上传方案 (流式上传失败降级)`);
    }
    
    console.log(`🚀 Upload completed to R2: ${uploadResult.url}`);

    // 现在一次性完成：更新状态、清理资源
    await Promise.all([
      // 更新任务状态为完成
      setTaskStatus(taskId, 'completed', {
        cdnUrl: uploadResult.url, // 只显示我们自己的CDN URL
        r2OptimizedKey: uploadResult.key
      }),
      // 清理Redis缓存数据
      redis ? Promise.all([
        redis.del(`task:${taskId}:user_id`),
        redis.del(`task:${taskId}:credits_consumed`)
      ]) : Promise.resolve()
    ]);

    console.log(`✅ Task completed with R2 CDN URL: ${uploadResult.url}`);
    
  } catch (error) {
    console.error(`[handleFalTaskCompleted] Error handling completed task ${taskId}:`, error);
    
    // 处理失败，标记为失败状态
    await setTaskStatus(taskId, 'failed', {
      errorMessage: `处理完成任务时出错: ${error instanceof Error ? error.message : '未知错误'}`
    });

    // 退回积分
    if (userId && taskInfo.creditsConsumed) {
      await refundUserCredits(userId, '2x', taskId); // Qwen 编辑固定2积分，映射为2x
    }

  } finally {
    // 🔓 释放分布式锁
    if (hasLock && redis) {
      await redis.del(lockKey);
      console.log(`🔓 [FAL_WEBHOOK] Released completion lock for task ${taskId}`);
    }
  }
}

/**
 * 处理任务失败
 * @param payload Webhook 载荷
 * @param taskInfo 任务信息
 */
async function handleFalTaskFailed(payload: FalWebhookPayload, taskInfo: any) {
  const { taskId, userId } = taskInfo;

  // 🔒 添加分布式锁防止与poll-task并发处理失败状态
  let hasLock = false;
  const lockKey = `fal_completion_lock:${taskId}`;
  
  try {
    if (redis) {
      const locked = await redis.set(lockKey, 'webhook-fail', { 
        nx: true,  // 只在不存在时设置
        ex: 60     // 1分钟超时（失败处理较快）
      });
      
      if (!locked) {
        console.log(`🔒 [FAL_WEBHOOK] Task ${taskId} failure is being processed by another handler, skipping`);
        return;
      }
      
      hasLock = true;
      console.log(`🆕 [FAL_WEBHOOK] Acquired completion lock for failed task ${taskId}`);
    }

    // 再次检查任务状态，防止竞态条件
    const { data: currentTask } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('status')
      .eq('id', taskId)
      .single();

    if (currentTask?.status === 'completed') {
      console.log(`✅ [FAL_WEBHOOK] Task ${taskId} already completed, skipping failure processing`);
      return;
    }

    if (currentTask?.status === 'failed') {
      console.log(`❌ [FAL_WEBHOOK] Task ${taskId} already failed, skipping duplicate processing`);
      return;
    }

    console.log(`Processing failed task ${taskId}:`, payload.error);

    const errorMessage = payload.error?.message || payload.error?.detail || 'AI图像编辑失败';

    // 更新任务状态为失败
    await setTaskStatus(taskId, 'failed', {
      errorMessage
    });

    // 退回积分给用户
    if (userId && taskInfo.creditsConsumed) {
      const refunded = await refundUserCredits(userId, '2x', taskId); // Qwen 编辑固定2积分，映射为2x
      console.log(`Credits refunded for failed task ${taskId}: ${refunded}`);
    }

    // 清理 Redis 缓存数据
    if (redis) {
      await Promise.all([
        redis.del(`task:${taskId}:user_id`),
        redis.del(`task:${taskId}:credits_consumed`)
      ]);
    }

    console.log(`Task ${taskId} marked as failed and credits refunded`);
  } catch (error) {
    console.error(`Error handling failed task ${taskId}:`, error);
  } finally {
    // 🔓 释放分布式锁
    if (hasLock && redis) {
      await redis.del(lockKey);
      console.log(`🔓 [FAL_WEBHOOK] Released completion lock for failed task ${taskId}`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('\n\n===== FAL.AI WEBHOOK RECEIVED =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // 获取请求体
    const body = await req.text();
    console.log('Raw body:', body);
    
    let payload: FalWebhookPayload;

    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON in webhook payload:', error);
      return apiResponse.badRequest('Invalid JSON payload');
    }

    console.log('Parsed webhook payload:', JSON.stringify(payload, null, 2));

    // 验证必要字段
    if (!payload.request_id || !payload.status) {
      console.error('Missing required fields in webhook payload:', payload);
      return apiResponse.badRequest('Missing request_id or status');
    }

    // 验证签名（可选）
    const isValidSignature = await verifyWebhookSignature(req, body);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return apiResponse.unauthorized('Invalid signature');
    }

    // 对于非最终状态，提前处理以避免数据库查询失败
    if (['IN_QUEUE', 'IN_PROGRESS'].includes(payload.status)) {
      console.log(`📝 [FAL_WEBHOOK] Task ${payload.request_id} is in intermediate status: ${payload.status}`);
      
      // 仅记录日志到Redis（如果有）
      if (redis) {
        await redis.set(
          `fal_task:${payload.request_id}:status`, 
          payload.status, 
          { ex: 3600 }
        );
        console.log(`📊 [FAL_WEBHOOK] Status updated: ${payload.status}`);
      }
      
      // 返回成功响应，不查询数据库
      return apiResponse.success({ 
        message: 'Intermediate status acknowledged',
        requestId: payload.request_id,
        status: payload.status
      });
    }

    // 获取任务信息（只对最终状态查询）
    console.log('Getting task info for request_id:', payload.request_id);
    const taskInfo = await findTaskByRequestId(payload.request_id);
    if (!taskInfo) {
      console.error(`Task not found for request_id: ${payload.request_id}`);
      // 对于早期webhook，任务可能还未创建，返回成功避免重试
      return apiResponse.success({ 
        message: 'Task not yet in database, webhook acknowledged',
        requestId: payload.request_id
      });
    }
    console.log('Task info retrieved:', taskInfo);

    // 根据最终状态处理
    switch (payload.status) {
      case 'OK':
      case 'COMPLETED':
        await handleFalTaskCompleted(payload, taskInfo);
        break;

      case 'FAILED':
      case 'ERROR':
        await handleFalTaskFailed(payload, taskInfo);
        break;

      default:
        console.warn(`Unknown task status: ${payload.status}`);
        break;
    }

    // 返回成功响应
    return apiResponse.success({ 
      message: 'Webhook processed successfully',
      requestId: payload.request_id,
      status: payload.status
    });

  } catch (error) {
    console.error('Error processing fal.ai webhook:', error);
    return apiResponse.serverError('Webhook processing failed');
  }
}