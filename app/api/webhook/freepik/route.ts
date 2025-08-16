import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';

// 强制使用 Node.js runtime 以支持流式上传
export const runtime = 'nodejs';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { redis } from '@/lib/upstash';
import { releaseApiKey } from '@/lib/freepik/api-key-manager';
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

interface FreepikWebhookPayload {
  task_id: string;
  request_id?: string; // Freepik 返回的 request_id
  status: 'DONE' | 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'IN_PROGRESS' | 'CREATED';
  image_url?: string;
  error?: string;
  progress?: number;
  generated?: any[]; // Freepik 返回的 generated 数组
}

/**
 * 验证 Webhook 签名（可选的安全措施）
 * @param request 请求对象
 * @param body 请求体
 * @returns 是否验证通过
 */
async function verifyWebhookSignature(request: NextRequest, body: string): Promise<boolean> {
  // 如果设置了 Webhook 密钥，进行签名验证
  const webhookSecret = process.env.FREEPIK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // 没有设置密钥，跳过验证
    return true;
  }

  try {
    const signature = request.headers.get('x-freepik-signature');
    if (!signature) {
      console.warn('Missing webhook signature');
      return false;
    }

    // 验证签名逻辑（这里需要根据 Freepik 的具体签名方式实现）
    // 通常是 HMAC-SHA256
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * 获取任务相关信息
 * @param taskId 任务ID
 * @returns 任务信息
 */
async function getTaskInfo(taskId: string) {
  try {
    console.log(`[getTaskInfo] Getting info for task: ${taskId}`);
    
    // 从 Redis 获取快速信息
    let userId = null;
    let apiKeyId = null;
    let r2Key = null;

    if (redis) {
      const [redisUserId, redisApiKeyId, redisR2Key] = await Promise.all([
        redis.get(`task:${taskId}:user_id`),
        redis.get(`task:${taskId}:api_key_id`),
        redis.get(`task:${taskId}:r2_key`)
      ]);

      userId = redisUserId;
      apiKeyId = redisApiKeyId;
      r2Key = redisR2Key;
      
      console.log(`[getTaskInfo] Redis data:`, { userId, apiKeyId, r2Key });
    }

    // 从数据库获取完整信息
    const { data: taskData, error } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    console.log(`[getTaskInfo] Database query result:`, { taskData, error });

    if (error || !taskData) {
      console.log(`[getTaskInfo] Task not found in database, checking Redis mapping...`);
      
      // 如果数据库中找不到，尝试通过Redis映射查找临时记录
      if (redis) {
        // 查找所有可能的临时ID映射
        const tempKeys = await redis.keys(`temp:*`);
        console.log(`[getTaskInfo] Found temp keys:`, tempKeys);
        
        let temporaryTaskId = null;
        for (const tempKey of tempKeys) {
          const mappedTaskId = await redis.get(tempKey);
          if (mappedTaskId === taskId) {
            temporaryTaskId = tempKey.replace('temp:', '');
            console.log(`[getTaskInfo] Found mapping: ${temporaryTaskId} → ${taskId}`);
            break;
          }
        }
        
        if (temporaryTaskId) {
          // 使用临时ID查询数据库
          const { data: tempTaskData, error: tempError } = await supabaseAdmin
            .from('image_enhancement_tasks')
            .select('*')
            .eq('id', temporaryTaskId)
            .single();
          
          console.log(`[getTaskInfo] Temp task query result:`, { tempTaskData, tempError });
          
          if (!tempError && tempTaskData) {
            // 找到临时记录，更新ID为正式ID
            console.log(`[getTaskInfo] Updating temp record ${temporaryTaskId} to ${taskId}`);
            
            const { error: updateError } = await supabaseAdmin
              .from('image_enhancement_tasks')
              .update({ id: taskId })
              .eq('id', temporaryTaskId);
            
            if (updateError) {
              console.error(`[getTaskInfo] Failed to update task ID:`, updateError);
            } else {
              console.log(`[getTaskInfo] Successfully updated task ID to ${taskId}`);
              // 清理Redis映射
              await redis.del(`temp:${temporaryTaskId}`);
            }
            
            // 使用临时记录数据，但使用正式ID
            return {
              taskId,
              userId: userId || tempTaskData.user_id,
              apiKeyId: apiKeyId || tempTaskData.api_key_id,
              r2Key: r2Key || tempTaskData.r2_original_key,
              scaleFactor: tempTaskData.scale_factor,
              creditsConsumed: tempTaskData.credits_consumed,
              taskData: { ...tempTaskData, id: taskId }
            };
          }
        }
      }
      
      console.error(`Task not found in database or Redis mapping: ${taskId}`, error);
      return null;
    }

    return {
      taskId,
      userId: userId || taskData.user_id,
      apiKeyId: apiKeyId || taskData.api_key_id,
      r2Key: r2Key || taskData.r2_original_key,
      scaleFactor: taskData.scale_factor,
      creditsConsumed: taskData.credits_consumed,
      taskData
    };
  } catch (error) {
    console.error(`Error getting task info for ${taskId}:`, error);
    return null;
  }
}

/**
 * 处理任务完成
 * @param payload Webhook 载荷
 * @param taskInfo 任务信息
 */
async function handleTaskCompleted(payload: FreepikWebhookPayload, taskInfo: any) {
  const { taskId, userId, apiKeyId, r2Key } = taskInfo;
  
  console.log(`[handleTaskCompleted] Starting for task ${taskId}`);
  console.log(`[handleTaskCompleted] User: ${userId}, API Key: ${apiKeyId}`);
  console.log(`[handleTaskCompleted] Payload:`, JSON.stringify(payload, null, 2));

  // 🔒 添加分布式锁防止与poll-task并发处理
  let hasLock = false;
  const lockKey = `completion_lock:${taskId}`;
  
  try {
    if (redis) {
      const locked = await redis.set(lockKey, 'webhook', { 
        nx: true,  // 只在不存在时设置
        ex: 300    // 5分钟超时（图片处理可能较长）
      });
      
      if (!locked) {
        console.log(`🔒 [WEBHOOK] Task ${taskId} is being processed by another handler, skipping`);
        return;
      }
      
      hasLock = true;
      console.log(`🆕 [WEBHOOK] Acquired completion lock for task ${taskId}`);
    }

    // 再次检查任务状态，防止竞态条件
    const { data: currentTask } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('status, cdn_url')
      .eq('id', taskId)
      .single();

    if (currentTask?.status === 'completed') {
      console.log(`✅ [WEBHOOK] Task ${taskId} already completed, skipping duplicate processing`);
      return;
    }

    if (currentTask?.status === 'failed') {
      console.log(`❌ [WEBHOOK] Task ${taskId} already failed, skipping processing`);
      return;
    }
    // 获取图片 URL（可能在 image_url 或 generated 数组中）
    let imageUrl = payload.image_url;
    
    // 如果没有直接的 image_url，检查 generated 数组
    if (!imageUrl && payload.generated && payload.generated.length > 0) {
      console.log(`[handleTaskCompleted] Checking generated array:`, payload.generated);
      // Freepik 返回 generated 数组，其中包含生成的图片 URL
      const firstGenerated = payload.generated[0];
      // 如果是字符串，直接使用；如果是对象，尝试获取 url 或 image_url 属性
      if (typeof firstGenerated === 'string') {
        imageUrl = firstGenerated;
      } else if (typeof firstGenerated === 'object' && firstGenerated !== null) {
        imageUrl = firstGenerated.url || firstGenerated.image_url || firstGenerated.image || null;
        console.log(`[handleTaskCompleted] Extracted from object:`, imageUrl);
      }
    }
    
    if (!imageUrl) {
      console.error(`[handleTaskCompleted] No image URL found in payload:`, payload);
      throw new Error('No image URL provided in completed task');
    }
    
    console.log(`[handleTaskCompleted] Image URL found: ${imageUrl}`);

    // 🚀 不立即更新为completed，等R2上传完成后再更新
    console.log(`🔄 Image processing completed, starting R2 upload optimization...`);

    console.log(`Processing completed task ${taskId}, downloading optimized image...`);

    // 开始流式下载和上传
    const imageResponse = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NextyDev-ImageEnhancer/1.0'
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
      false // 禁用回退，测试纯流式上传
    );

    const uploadMethod = uploadResult.uploadMethod;
    
    // 记录使用的上传方式
    if (uploadMethod === 'stream') {
      console.log(`🎯 [WEBHOOK] ✨ 正式用户成功使用零内存流式上传! 节省内存和磁盘I/O`);
    } else {
      console.log(`📁 [WEBHOOK] ⚠️ 正式用户使用了本地文件上传方案 (流式上传失败降级)`);
    }
    
    console.log(`🚀 Upload completed to R2: ${uploadResult.url}`);

    // 现在一次性完成：更新状态、清理资源（不释放API Key）
    await Promise.all([
      // 更新任务状态为完成
      setTaskStatus(taskId, 'completed', {
        cdnUrl: uploadResult.url, // 只显示我们自己的CDN URL，用户永远看不到Freepik链接
        r2OptimizedKey: uploadResult.key
      }),
      // 清理Redis临时数据
      redis ? Promise.all([
        redis.del(`task:${taskId}:user_id`),
        redis.del(`task:${taskId}:api_key_id`),
        redis.del(`task:${taskId}:r2_key`)
      ]) : Promise.resolve()
    ]);

    console.log(`✅ Task completed with R2 CDN URL: ${uploadResult.url}`);
    
  } catch (error) {
    console.error(`[handleTaskCompleted] Error handling completed task ${taskId}:`, error);
    
    // 处理失败，标记为失败状态
    await setTaskStatus(taskId, 'failed', {
      errorMessage: `处理完成任务时出错: ${error instanceof Error ? error.message : '未知错误'}`
    });

    // 退回积分
    if (userId && taskInfo.scaleFactor) {
      await refundUserCredits(userId, taskInfo.scaleFactor, taskId);
    }

    // 不释放 API Key，因为 Freepik 配额已被消耗
  } finally {
    // 🔓 释放分布式锁
    if (hasLock && redis) {
      await redis.del(lockKey);
      console.log(`🔓 [WEBHOOK] Released completion lock for task ${taskId}`);
    }
  }
}

/**
 * 处理任务失败
 * @param payload Webhook 载荷
 * @param taskInfo 任务信息
 */
async function handleTaskFailed(payload: FreepikWebhookPayload, taskInfo: any) {
  const { taskId, userId, apiKeyId } = taskInfo;

  // 🔒 添加分布式锁防止与poll-task并发处理失败状态
  let hasLock = false;
  const lockKey = `completion_lock:${taskId}`;
  
  try {
    if (redis) {
      const locked = await redis.set(lockKey, 'webhook-fail', { 
        nx: true,  // 只在不存在时设置
        ex: 60     // 1分钟超时（失败处理较快）
      });
      
      if (!locked) {
        console.log(`🔒 [WEBHOOK] Task ${taskId} failure is being processed by another handler, skipping`);
        return;
      }
      
      hasLock = true;
      console.log(`🆕 [WEBHOOK] Acquired completion lock for failed task ${taskId}`);
    }

    // 再次检查任务状态，防止竞态条件
    const { data: currentTask } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('status')
      .eq('id', taskId)
      .single();

    if (currentTask?.status === 'completed') {
      console.log(`✅ [WEBHOOK] Task ${taskId} already completed, skipping failure processing`);
      return;
    }

    if (currentTask?.status === 'failed') {
      console.log(`❌ [WEBHOOK] Task ${taskId} already failed, skipping duplicate processing`);
      return;
    }

    console.log(`Processing failed task ${taskId}:`, payload.error);

    // 更新任务状态为失败
    await setTaskStatus(taskId, 'failed', {
      errorMessage: payload.error || '图像处理失败'
    });

    // 退回积分给用户
    if (userId && taskInfo.scaleFactor) {
      const refunded = await refundUserCredits(userId, taskInfo.scaleFactor, taskId);
      console.log(`Credits refunded for failed task ${taskId}: ${refunded}`);
    }

    // 不释放 API Key，因为 Freepik 配额已被消耗

    // 清理 Redis 临时数据
    if (redis) {
      await Promise.all([
        redis.del(`task:${taskId}:user_id`),
        redis.del(`task:${taskId}:api_key_id`),
        redis.del(`task:${taskId}:r2_key`)
      ]);
    }

    console.log(`Task ${taskId} marked as failed and credits refunded`);
  } catch (error) {
    console.error(`Error handling failed task ${taskId}:`, error);
  } finally {
    // 🔓 释放分布式锁
    if (hasLock && redis) {
      await redis.del(lockKey);
      console.log(`🔓 [WEBHOOK] Released completion lock for failed task ${taskId}`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('\n\n===== FREEPIK WEBHOOK RECEIVED =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // 获取请求体
    const body = await req.text();
    console.log('Raw body:', body);
    
    let payload: FreepikWebhookPayload;

    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON in webhook payload:', error);
      return apiResponse.badRequest('Invalid JSON payload');
    }

    console.log('Parsed webhook payload:', JSON.stringify(payload, null, 2));

    // 验证必要字段
    if (!payload.task_id || !payload.status) {
      console.error('Missing required fields in webhook payload:', payload);
      return apiResponse.badRequest('Missing task_id or status');
    }

    // 验证签名（可选）
    const isValidSignature = await verifyWebhookSignature(req, body);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return apiResponse.unauthorized('Invalid signature');
    }

    // 对于非最终状态，提前处理以避免数据库查询失败
    if (['CREATED', 'PROCESSING', 'IN_PROGRESS'].includes(payload.status)) {
      console.log(`📝 [WEBHOOK] Task ${payload.task_id} is in intermediate status: ${payload.status}`);
      
      // 仅更新进度到Redis（如果有）
      if (payload.progress !== undefined && redis) {
        await redis.set(
          `task:${payload.task_id}:progress`, 
          payload.progress, 
          { ex: 3600 }
        );
        console.log(`📊 [WEBHOOK] Progress updated: ${payload.progress}%`);
      }
      
      // 返回成功响应，不查询数据库
      return apiResponse.success({ 
        message: 'Intermediate status acknowledged',
        taskId: payload.task_id,
        status: payload.status
      });
    }

    // 获取任务信息（只对最终状态查询）
    console.log('Getting task info for:', payload.task_id);
    const taskInfo = await getTaskInfo(payload.task_id);
    if (!taskInfo) {
      console.error(`Task not found: ${payload.task_id}`);
      // 对于早期webhook，任务可能还未创建，返回成功避免重试
      return apiResponse.success({ 
        message: 'Task not yet in database, webhook acknowledged',
        taskId: payload.task_id
      });
    }
    console.log('Task info retrieved:', taskInfo);

    // 根据最终状态处理（中间状态已在上面处理）
    switch (payload.status) {
      case 'DONE':
      case 'COMPLETED':
        await handleTaskCompleted(payload, taskInfo);
        break;

      case 'FAILED':
        await handleTaskFailed(payload, taskInfo);
        break;

      default:
        console.warn(`Unknown task status: ${payload.status}`);
        break;
    }

    // 返回成功响应
    return apiResponse.success({ 
      message: 'Webhook processed successfully',
      taskId: payload.task_id,
      status: payload.status
    });

  } catch (error) {
    console.error('Error processing Freepik webhook:', error);
    return apiResponse.serverError('Webhook processing failed');
  }
}