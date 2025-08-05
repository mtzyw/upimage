import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { getAvailableFreepikApiKey, releaseApiKey } from '@/lib/freepik/api-key-manager';
import { redis } from '@/lib/upstash';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 请求参数验证 - 改为批量生成，移除scaleFactor参数
const startTrialSchema = z.object({
  browserFingerprint: z.string().min(8, '浏览器指纹无效'),
  image: z.string().min(1, 'base64 图片数据不能为空'),
  optimizedFor: z.enum([
    'standard', 
    'soft_portraits', 
    'hard_portraits', 
    'art_n_illustration', 
    'videogame_assets', 
    'nature_n_landscapes', 
    'films_n_photography', 
    '3d_renders', 
    'science_fiction_n_horror'
  ]).default('standard'),
  prompt: z.string().max(500, '提示词不能超过500个字符').optional(),
  creativity: z.number().int().min(-10).max(10).default(0),
  hdr: z.number().int().min(-10).max(10).default(0),
  resemblance: z.number().int().min(-10).max(10).default(0),
  fractality: z.number().int().min(-10).max(10).default(0),
  engine: z.enum(['automatic', 'magnific_illusio', 'magnific_sharpy', 'magnific_sparkle']).default('automatic')
});

// 支持的放大倍数
const SCALE_FACTORS = ['2x', '4x', '8x', '16x'] as const;

type StartTrialRequest = z.infer<typeof startTrialSchema>;

// 创建单个Freepik任务的辅助函数
async function createFreepikTask(
  payload: any,
  apiKey: { id: string; key: string; name: string; remaining: number }
): Promise<string> {
  const response = await fetch('https://api.freepik.com/v1/ai/image-upscaler', {
    method: 'POST',
    headers: {
      'x-freepik-api-key': apiKey.key,
      'Content-Type': 'application/json',
      'User-Agent': 'NextyDev-ImageEnhancer-Batch/1.0'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Freepik API错误 ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data.data?.task_id) {
    throw new Error('Freepik API未返回task_id');
  }

  return data.data.task_id;
}

/**
 * 开始匿名用户批量试用 - 2x/4x/8x/16x
 * POST /api/anonymous/trial/start
 */
export async function POST(req: NextRequest) {
  console.log('🚀 [ANONYMOUS BATCH TRIAL START] ===== 开始批量匿名试用 =====');
  
  const usedApiKeys: string[] = [];
  
  try {
    // 1. 解析请求参数
    const body = await req.json();
    console.log('📝 [ANONYMOUS TRIAL START] 请求参数:', {
      hasBrowserFingerprint: !!body.browserFingerprint,
      fingerprintLength: body.browserFingerprint?.length || 0,
      hasImage: !!body.image,
      imageLength: body.image?.length || 0,
      scaleFactor: body.scaleFactor,
      optimizedFor: body.optimizedFor
    });

    // 2. 验证参数
    const validationResult = startTrialSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [ANONYMOUS TRIAL START] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { browserFingerprint, image: base64Image, ...validatedParams } = validationResult.data;
    console.log('✅ [ANONYMOUS BATCH TRIAL START] 参数验证成功');

    // 3. 生成批量任务ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🎯 [ANONYMOUS BATCH TRIAL START] 生成批量任务ID: ${batchId}`);

    // 4. 验证 webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/anonymous/webhook/freepik`;
    console.log('🔗 [ANONYMOUS BATCH TRIAL START] Webhook URL:', webhookUrl);
    
    if (!webhookUrl || webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      console.error('❌ [ANONYMOUS BATCH TRIAL START] 无效的 webhook URL:', webhookUrl);
      return apiResponse.error('服务配置错误：需要公开的 webhook URL', 500);
    }

    // 5. 获取一个API密钥用于所有任务
    console.log('🔑 [ANONYMOUS BATCH TRIAL START] 获取API密钥...');
    const apiKey = await getAvailableFreepikApiKey();
    if (!apiKey) {
      console.log('❌ [ANONYMOUS BATCH TRIAL START] 没有可用的API密钥');
      return apiResponse.error('服务暂时不可用，请稍后重试', 503);
    }
    
    usedApiKeys.push(apiKey.id);
    console.log(`✅ [ANONYMOUS BATCH TRIAL START] 使用API密钥: ${apiKey.name} (剩余 ${apiKey.remaining} 次)`);

    // 6. 批量创建 Freepik 任务（使用同一个API密钥）
    console.log('🚀 [ANONYMOUS BATCH TRIAL START] 开始批量创建Freepik任务...');
    const createdTasks: Array<{ task_id: string; scale_factor: string }> = [];

    // 为每个倍数创建任务（串行处理避免并发问题）
    for (const scaleFactor of SCALE_FACTORS) {
      console.log(`🎯 [ANONYMOUS BATCH TRIAL START] 创建 ${scaleFactor} 任务...`);
      
      try {
        const freepikPayload = {
          image: base64Image,
          scale_factor: scaleFactor,
          optimized_for: validatedParams.optimizedFor,
          webhook_url: webhookUrl,
          prompt: validatedParams.prompt || undefined,
          creativity: validatedParams.creativity,
          hdr: validatedParams.hdr,
          resemblance: validatedParams.resemblance,
          fractality: validatedParams.fractality,
          engine: validatedParams.engine
        };

        const taskId = await createFreepikTask(freepikPayload, apiKey);
        createdTasks.push({ task_id: taskId, scale_factor: scaleFactor });
        console.log(`✅ [ANONYMOUS BATCH TRIAL START] ${scaleFactor} 任务创建成功: ${taskId}`);
        
      } catch (error) {
        console.error(`❌ [ANONYMOUS BATCH TRIAL START] ${scaleFactor} 任务创建失败:`, error);
        // 继续处理其他倍数，不中断整个流程
      }
    }

    if (createdTasks.length === 0) {
      console.error('❌ [ANONYMOUS BATCH TRIAL START] 所有任务创建失败');
      // 释放API key
      await releaseApiKey(apiKey.id);
      return apiResponse.error('所有图片处理任务创建失败，请稍后重试');
    }

    console.log(`✅ [ANONYMOUS BATCH TRIAL START] 成功创建 ${createdTasks.length} 个任务:`, createdTasks);

    // 7. 调用数据库函数：批量创建试用任务
    console.log('💾 [ANONYMOUS BATCH TRIAL START] 调用数据库函数创建批量任务...');
    const { data: trialResult, error: trialError } = await supabaseAdmin
      .rpc('use_trial_and_create_batch_tasks', {
        p_browser_fingerprint: browserFingerprint,
        p_batch_id: batchId,
        p_freepik_task_ids: createdTasks
      });

    if (trialError) {
      console.error('❌ [ANONYMOUS BATCH TRIAL START] 数据库操作失败:', trialError);
      
      // 释放API key
      await releaseApiKey(apiKey.id);
      
      return apiResponse.error('批量试用创建失败，请重试');
    }

    if (!trialResult.success) {
      console.log('❌ [ANONYMOUS BATCH TRIAL START] 试用资格验证失败:', trialResult);
      
      // 释放API key
      await releaseApiKey(apiKey.id);
      
      return apiResponse.badRequest(trialResult.message || '试用资格验证失败');
    }

    console.log('✅ [ANONYMOUS BATCH TRIAL START] 批量试用和任务创建成功:', trialResult);

    // 8. 保存相关信息到 Redis（用于 webhook 处理）
    if (redis) {
      console.log('💾 [ANONYMOUS BATCH TRIAL START] 保存Redis缓存...');
      const redisPromises = [];
      
      // 为每个任务保存缓存信息
      for (const task of createdTasks) {
        redisPromises.push(
          redis.set(`anon_task:${task.task_id}:fingerprint`, browserFingerprint, { ex: 3600 }),
          redis.set(`anon_task:${task.task_id}:batch_id`, batchId, { ex: 3600 }),
          redis.set(`anon_task:${task.task_id}:api_key_id`, apiKey.id, { ex: 3600 })
        );
      }
      
      // 保存批量任务信息
      redisPromises.push(
        redis.set(`anon_batch:${batchId}:fingerprint`, browserFingerprint, { ex: 3600 }),
        redis.set(`anon_batch:${batchId}:tasks`, JSON.stringify(createdTasks), { ex: 3600 }),
        redis.set(`anon_batch:${batchId}:api_key_id`, apiKey.id, { ex: 3600 })
      );
      
      await Promise.all(redisPromises);
      console.log('✅ [ANONYMOUS BATCH TRIAL START] Redis缓存保存完成');
    }

    // 9. 返回成功响应
    const response = {
      batchId,
      tasks: createdTasks,
      taskCount: createdTasks.length,
      status: 'processing',
      message: `免费试用已开始，正在处理您的图片 (${createdTasks.length} 种倍数)...`,
      estimatedTime: '预计 2-10 分钟完成所有处理'
    };
    
    console.log('🎉 [ANONYMOUS BATCH TRIAL START] 成功响应数据:', response);
    console.log('🎉 [ANONYMOUS BATCH TRIAL START] ===== 批量匿名试用开始完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [ANONYMOUS BATCH TRIAL START] ===== 处理过程中发生异常 =====');
    console.error('💥 [ANONYMOUS BATCH TRIAL START] 错误详情:', error);
    console.error('💥 [ANONYMOUS BATCH TRIAL START] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 释放使用的API key
    for (const keyId of usedApiKeys) {
      try {
        await releaseApiKey(keyId);
      } catch (releaseError) {
        console.error('💥 [ANONYMOUS BATCH TRIAL START] 释放API密钥失败:', keyId, releaseError);
      }
    }
    
    return apiResponse.serverError('批量匿名试用服务内部错误');
  }
}