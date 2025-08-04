import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { redis } from '@/lib/upstash';
import { releaseApiKey } from '@/lib/freepik/api-key-manager';
import { 
  uploadOptimizedImageToR2, 
  uploadOptimizedImageLocalToR2,
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
  console.log('🔗 [ANONYMOUS WEBHOOK] ===== 收到 Freepik Webhook =====');
  
  let apiKeyId: string | undefined;
  
  try {
    // 1. 解析请求体
    const body = await req.text();
    const payload: FreepikWebhookPayload = JSON.parse(body);
    
    console.log('📝 [ANONYMOUS WEBHOOK] Webhook 载荷:', {
      task_id: payload.task_id,
      status: payload.status,
      hasImageUrl: !!payload.image_url,
      hasGenerated: !!(payload.generated && payload.generated.length > 0),
      generatedCount: payload.generated?.length || 0,
      hasError: !!payload.error,
      progress: payload.progress
    });

    // 2. 验证签名（可选）
    const isValidSignature = await verifyWebhookSignature(req, body);
    if (!isValidSignature) {
      console.warn('⚠️ [ANONYMOUS WEBHOOK] Webhook 签名验证失败');
      return apiResponse.unauthorized('Invalid webhook signature');
    }

    const { task_id: taskId, status, image_url: imageUrl, generated, error } = payload;
    
    // 获取图片URL（优先使用 generated 数组，向后兼容 image_url）
    const resultImageUrl = (generated && generated.length > 0) ? generated[0] : imageUrl;

    // 3. 从 Redis 获取任务相关信息
    console.log('💾 [ANONYMOUS WEBHOOK] 从Redis获取任务信息...');
    let browserFingerprint: string | null = null;
    
    if (redis) {
      try {
        const [fingerprintResult, apiKeyResult] = await Promise.all([
          redis.get(`anon_task:${taskId}:fingerprint`),
          redis.get(`anon_task:${taskId}:api_key_id`)
        ]);
        
        browserFingerprint = fingerprintResult as string;
        apiKeyId = apiKeyResult as string;
        
        console.log('💾 [ANONYMOUS WEBHOOK] Redis 信息:', {
          hasFingerprint: !!browserFingerprint,
          hasApiKeyId: !!apiKeyId
        });
      } catch (redisError) {
        console.error('❌ [ANONYMOUS WEBHOOK] Redis 查询失败:', redisError);
      }
    }

    // 4. 根据状态处理
    console.log(`🔄 [ANONYMOUS WEBHOOK] 处理状态: ${status}`);
    
    if (status === 'DONE' || status === 'COMPLETED') {
      // 任务成功完成
      console.log('✅ [ANONYMOUS WEBHOOK] 任务完成，开始处理结果...');
      console.log('🖼️ [ANONYMOUS WEBHOOK] 图片URL:', resultImageUrl);
      
      if (!resultImageUrl) {
        console.error('❌ [ANONYMOUS WEBHOOK] 任务完成但没有图片URL');
        console.error('❌ [ANONYMOUS WEBHOOK] 原始载荷:', JSON.stringify(payload, null, 2));
        await updateTaskStatus(taskId, 'failed', { error: '任务完成但未返回图片' });
        return apiResponse.success({ message: 'Task completed without image' });
      }

      try {
        // 步骤1: 开始处理图片上传
        console.log('📤 [ANONYMOUS WEBHOOK] 步骤1: 开始上传Freepik处理后的图片到R2...');
        console.log('🖼️ [ANONYMOUS WEBHOOK] 步骤1: 原始Freepik图片URL:', resultImageUrl);
        
        let r2Key: string | undefined;
        let cdnUrl: string | undefined;

        // 步骤2: 下载Freepik处理后的图片
        console.log('📥 [ANONYMOUS WEBHOOK] 步骤2: 开始下载Freepik图片...');
        const imageResponse = await fetch(resultImageUrl);
        if (!imageResponse.ok) {
          throw new Error(`步骤2失败: 无法下载图片 ${imageResponse.status} ${imageResponse.statusText}`);
        }
        
        const contentLength = imageResponse.headers.get('content-length');
        console.log('✅ [ANONYMOUS WEBHOOK] 步骤2: 图片下载成功, 大小:', contentLength, 'bytes');
        
        // 步骤3: 上传到R2存储
        console.log('☁️ [ANONYMOUS WEBHOOK] 步骤3: 开始上传到R2存储...');
        const localUploadResult = await uploadOptimizedImageLocalToR2(
          imageResponse,
          `anonymous`,
          taskId,
          getImageExtension(resultImageUrl)
        );
        
        r2Key = localUploadResult.key;
        cdnUrl = localUploadResult.url;
        
        console.log('✅ [ANONYMOUS WEBHOOK] 步骤3: R2上传成功');
        console.log('🔑 [ANONYMOUS WEBHOOK] 步骤3: R2 Key:', r2Key);
        console.log('🌐 [ANONYMOUS WEBHOOK] 步骤3: CDN URL:', cdnUrl);

        console.log('🎉 [ANONYMOUS WEBHOOK] 步骤4: 图片处理完成:', { r2Key, cdnUrl });

        // 步骤4: 更新数据库任务状态为完成
        console.log('💾 [ANONYMOUS WEBHOOK] 步骤4: 更新数据库任务状态...');
        const resultData = {
          cdnUrl,
          r2Key,
          originalImageUrl: resultImageUrl,
          completedAt: new Date().toISOString()
        };
        console.log('💾 [ANONYMOUS WEBHOOK] 步骤4: 准备写入数据库的结果:', JSON.stringify(resultData, null, 2));
        
        await updateTaskStatus(taskId, 'completed', resultData);

        console.log('✅ [ANONYMOUS WEBHOOK] 步骤4: 数据库状态更新完成');

      } catch (uploadError) {
        console.error('❌ [ANONYMOUS WEBHOOK] 图片处理失败:', uploadError);
        await updateTaskStatus(taskId, 'failed', { 
          error: '图片处理失败',
          originalImageUrl: resultImageUrl 
        });
      }

    } else if (status === 'FAILED') {
      // 任务失败
      console.log('❌ [ANONYMOUS WEBHOOK] 任务失败');
      await updateTaskStatus(taskId, 'failed', { 
        error: error || 'Freepik processing failed' 
      });

    } else {
      // 处理中状态
      console.log('🔄 [ANONYMOUS WEBHOOK] 任务处理中...');
      await updateTaskStatus(taskId, 'processing', { 
        progress: payload.progress 
      });
    }

    // 5. 释放 API Key (仅在任务完成或失败时)
    if (apiKeyId && (status === 'DONE' || status === 'COMPLETED' || status === 'FAILED')) {
      console.log('🔑 [ANONYMOUS WEBHOOK] 释放API密钥...');
      try {
        await releaseApiKey(apiKeyId);
        console.log('✅ [ANONYMOUS WEBHOOK] API密钥释放成功');
      } catch (releaseError) {
        console.error('❌ [ANONYMOUS WEBHOOK] API密钥释放失败:', releaseError);
      }
    }

    // 6. 清理 Redis 缓存 (仅在任务完成或失败时)
    if (redis && (status === 'DONE' || status === 'COMPLETED' || status === 'FAILED')) {
      console.log('🧹 [ANONYMOUS WEBHOOK] 清理Redis缓存...');
      try {
        await Promise.all([
          redis.del(`anon_task:${taskId}:fingerprint`),
          redis.del(`anon_task:${taskId}:api_key_id`)
        ]);
        console.log('✅ [ANONYMOUS WEBHOOK] Redis缓存清理完成');
      } catch (cleanupError) {
        console.error('❌ [ANONYMOUS WEBHOOK] Redis缓存清理失败:', cleanupError);
      }
    }

    console.log('🎉 [ANONYMOUS WEBHOOK] ===== Webhook 处理完成 =====');
    return apiResponse.success({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('💥 [ANONYMOUS WEBHOOK] ===== Webhook 处理异常 =====');
    console.error('💥 [ANONYMOUS WEBHOOK] 错误详情:', error);
    console.error('💥 [ANONYMOUS WEBHOOK] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 尝试释放 API Key
    if (apiKeyId) {
      try {
        await releaseApiKey(apiKeyId);
      } catch (releaseError) {
        console.error('❌ [ANONYMOUS WEBHOOK] 异常情况下API密钥释放失败:', releaseError);
      }
    }
    
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
  console.log(`📝 [updateTaskStatus] 开始更新任务状态: ${taskId} -> ${status}`);
  console.log(`📝 [updateTaskStatus] 更新数据:`, JSON.stringify(data, null, 2));
  
  try {
    const { data: result, error } = await supabaseAdmin
      .rpc('update_anonymous_task_status', {
        p_freepik_task_id: taskId,
        p_status: status,
        p_result_data: data ? JSON.parse(JSON.stringify(data)) : null
      });

    if (error) {
      console.error('❌ [updateTaskStatus] 数据库RPC调用失败:', error);
      throw error;
    }

    console.log('✅ [updateTaskStatus] 数据库RPC调用成功, 返回结果:', result);
    
    if (!result) {
      console.error('❌ [updateTaskStatus] RPC返回false，任务状态更新失败');
    } else {
      console.log('✅ [updateTaskStatus] 任务状态更新成功');
    }
  } catch (error) {
    console.error('❌ [updateTaskStatus] 更新任务状态时出错:', error);
    throw error;
  }
}