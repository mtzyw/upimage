import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';

// 强制使用 Node.js runtime 以获得 Node.js Readable 支持
export const runtime = 'nodejs';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { redis } from '@/lib/upstash';
import { releaseApiKey } from '@/lib/freepik/api-key-manager';
import { 
  uploadOptimizedImageStreamToR2,
  getImageExtension 
} from '@/lib/freepik/utils';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FreepikWebhookPayload {
  task_id: string;
  request_id?: string;
  status: 'DONE' | 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'IN_PROGRESS' | 'CREATED';
  image_url?: string; // 旧格式兼容
  error?: string;
  progress?: number;
  generated?: string[]; // Freepik 实际使用的字段
}

/**
 * 验证 Webhook 签名（可选的安全措施）
 */
async function verifyWebhookSignature(request: NextRequest, body: string): Promise<boolean> {
  const webhookSecret = process.env.FREEPIK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return true; // 没有设置密钥，跳过验证
  }

  try {
    const signature = request.headers.get('x-freepik-signature');
    if (!signature) {
      console.warn('Missing webhook signature');
      return false;
    }

    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    return `sha256=${expectedSignature}` === signature;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * 处理匿名用户 Freepik Webhook
 * POST /api/anonymous/webhook/freepik
 */
export async function POST(req: NextRequest) {
  let apiKeyId: string | undefined;
  
  try {
    // 1. 解析请求体
    const body = await req.text();
    const payload: FreepikWebhookPayload = JSON.parse(body);
    
    const taskIdShort = payload.task_id.slice(0, 8);
    console.log(`🔗 [WEBHOOK-${taskIdShort}] 收到状态: ${payload.status}${payload.progress ? ` (${payload.progress}%)` : ''}`);

    // 2. 验证签名（可选）
    const isValidSignature = await verifyWebhookSignature(req, body);
    if (!isValidSignature) {
      console.warn('⚠️ [ANONYMOUS WEBHOOK] Webhook 签名验证失败');
      return apiResponse.unauthorized('Invalid webhook signature');
    }

    const { task_id: taskId, status, image_url: imageUrl, generated, error } = payload;
    
    // 只处理最终状态，忽略中间状态避免竞态条件
    if (!['COMPLETED', 'DONE', 'FAILED'].includes(status)) {
      console.log(`🔗 [WEBHOOK-${taskIdShort}] 忽略中间状态: ${status}`);
      return apiResponse.success({ message: 'Intermediate status ignored' });
    }
    
    // 获取图片URL（优先使用 generated 数组，向后兼容 image_url）
    const resultImageUrl = (generated && generated.length > 0) ? generated[0] : imageUrl;

    // 3. 从 Redis 获取任务相关信息
    let browserFingerprint: string | null = null;
    
    if (redis) {
      try {
        const [fingerprintResult, apiKeyResult] = await Promise.all([
          redis.get(`anon_task:${taskId}:fingerprint`),
          redis.get(`anon_task:${taskId}:api_key_id`)
        ]);
        
        browserFingerprint = fingerprintResult as string;
        apiKeyId = apiKeyResult as string;
      } catch (redisError) {
        console.error(`❌ [WEBHOOK-${taskIdShort}] Redis查询失败:`, redisError);
      }
    }

    // 4. 根据状态处理（现在只处理最终状态）
    if (status === 'DONE' || status === 'COMPLETED') {
      if (!resultImageUrl) {
        console.error(`❌ [WEBHOOK-${taskIdShort}] 任务完成但没有图片URL`);
        await updateTaskStatus(taskId, 'failed', { error: '任务完成但未返回图片' });
        return apiResponse.success({ message: 'Task completed without image' });
      }

      try {
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
        
        const r2Key = uploadResult.key;
        const cdnUrl = uploadResult.url;
        const uploadMethod = uploadResult.uploadMethod;

        // 记录使用的上传方式
        if (uploadMethod === 'stream') {
          console.log(`🎯 [WEBHOOK-${taskIdShort}] ✨ 成功使用零内存流式上传! 节省内存和磁盘I/O`);
        } else {
          console.log(`📁 [WEBHOOK-${taskIdShort}] ⚠️ 使用了本地文件上传方案 (流式上传失败降级)`);
        }

        console.log(`🎉 [WEBHOOK-${taskIdShort}] 图片处理完成`);

        // 更新数据库任务状态为完成
        const resultData = {
          cdnUrl,
          r2Key,
          originalImageUrl: resultImageUrl,
          completedAt: new Date().toISOString()
        };
        await updateTaskStatus(taskId, 'completed', resultData);

      } catch (uploadError) {
        console.error(`❌ [WEBHOOK-${taskIdShort}] 图片处理失败:`, uploadError);
        await updateTaskStatus(taskId, 'failed', { 
          error: '图片处理失败',
          originalImageUrl: resultImageUrl 
        });
      }

    } else if (status === 'FAILED') {
      // 任务失败
      console.log(`❌ [WEBHOOK-${taskIdShort}] 任务失败`);
      await updateTaskStatus(taskId, 'failed', { 
        error: error || 'Freepik processing failed' 
      });
    }

    // 5. API 密钥不在 Webhook 中释放
    // 一旦 Freepik API 被调用，配额已被消耗，不应该减少计数

    // 6. 清理 Redis 缓存 (仅在任务完成或失败时)
    if (redis && (status === 'DONE' || status === 'COMPLETED' || status === 'FAILED')) {
      try {
        await Promise.all([
          redis.del(`anon_task:${taskId}:fingerprint`),
          redis.del(`anon_task:${taskId}:api_key_id`)
        ]);
      } catch (cleanupError) {
        console.error(`❌ [WEBHOOK-${taskIdShort}] Redis缓存清理失败:`, cleanupError);
      }
    }

    return apiResponse.success({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('💥 [WEBHOOK] 处理异常:', error);
    
    // Webhook 异常不释放 API Key，因为 Freepik 配额已被消耗
    return apiResponse.serverError('Webhook processing failed');
  }
}

/**
 * 更新匿名任务状态
 */
async function updateTaskStatus(
  taskId: string, 
  status: 'processing' | 'completed' | 'failed', 
  data?: any
): Promise<void> {
  try {
    const { data: result, error } = await supabaseAdmin
      .rpc('update_batch_task_status', {
        p_freepik_task_id: taskId,
        p_status: status,
        p_result_data: data ? JSON.parse(JSON.stringify(data)) : null
      });

    if (error) {
      console.error(`❌ [updateTaskStatus] ${taskId.slice(0, 8)} DB错误:`, error);
      throw error;
    }

    if (!result) {
      console.error(`❌ [updateTaskStatus] ${taskId.slice(0, 8)} 更新失败`);
    }
  } catch (error) {
    console.error(`❌ [updateTaskStatus] ${taskId.slice(0, 8)} 异常:`, error);
    throw error;
  }
}