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
  const usedApiKeys: string[] = [];
  
  try {
    // 1. 解析和验证参数
    const body = await req.json();
    const validationResult = startTrialSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [TRIAL] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { browserFingerprint, image: base64Image, ...validatedParams } = validationResult.data;
    
    // 2. 生成批量任务ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🎯 [TRIAL-${batchId.slice(-4)}] Starting batch trial`);

    // 3. 验证 webhook URL
    const webhookUrl = `${process.env.WEBHOOK_URL || process.env.NEXT_PUBLIC_SITE_URL}/api/anonymous/webhook/freepik`;
    if (!webhookUrl || webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      console.error(`❌ [TRIAL-${batchId.slice(-4)}] 无效的 webhook URL:`, webhookUrl);
      return apiResponse.error('服务配置错误：需要公开的 webhook URL', 500);
    }

    // 4. 获取API密钥和检查试用资格
    const apiKey = await getAvailableFreepikApiKey();
    if (!apiKey) {
      console.log(`❌ [TRIAL-${batchId.slice(-4)}] 没有可用的API密钥`);
      return apiResponse.error('服务暂时不可用，请稍后重试', 503);
    }
    
    usedApiKeys.push(apiKey.id);

    const { data: trialCheckResult, error: trialCheckError } = await supabaseAdmin
      .rpc('use_trial_for_batch', {
        p_browser_fingerprint: browserFingerprint
      });

    if (trialCheckError || !trialCheckResult.success) {
      console.error(`❌ [TRIAL-${batchId.slice(-4)}] 试用资格验证失败:`, trialCheckError || trialCheckResult.message);
      await releaseApiKey(apiKey.id);
      return apiResponse.badRequest(trialCheckResult?.message || '试用资格验证失败');
    }

    // 5. 批量创建 Freepik 任务
    const createdTasks: Array<{ task_id: string; scale_factor: string }> = [];

    // 为每个倍数创建任务（串行处理避免并发问题）
    for (const scaleFactor of SCALE_FACTORS) {
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
        
        // 立即插入数据库记录
        const { error: dbError } = await supabaseAdmin
          .rpc('create_individual_anonymous_task', {
            p_freepik_task_id: taskId,
            p_browser_fingerprint: browserFingerprint,
            p_batch_id: batchId,
            p_scale_factor: scaleFactor
          });

        if (dbError) {
          console.error(`❌ [TRIAL-${batchId.slice(-4)}] ${scaleFactor} DB error:`, dbError);
        }
        
        // 保存Redis缓存
        if (redis) {
          await Promise.all([
            redis.set(`anon_task:${taskId}:fingerprint`, browserFingerprint, { ex: 3600 }),
            redis.set(`anon_task:${taskId}:batch_id`, batchId, { ex: 3600 }),
            redis.set(`anon_task:${taskId}:api_key_id`, apiKey.id, { ex: 3600 })
          ]);
        }
        
        createdTasks.push({ task_id: taskId, scale_factor: scaleFactor });
        console.log(`✅ [TRIAL-${batchId.slice(-4)}] ${scaleFactor} → ${taskId.slice(0, 8)}`);
        
      } catch (error) {
        console.error(`❌ [TRIAL-${batchId.slice(-4)}] ${scaleFactor} failed:`, error);
      }
    }

    if (createdTasks.length === 0) {
      console.error(`❌ [TRIAL-${batchId.slice(-4)}] 所有任务创建失败`);
      await releaseApiKey(apiKey.id);
      return apiResponse.error('所有图片处理任务创建失败，请稍后重试');
    }

    // 6. 保存批量任务信息到Redis
    if (redis) {
      await Promise.all([
        redis.set(`anon_batch:${batchId}:fingerprint`, browserFingerprint, { ex: 3600 }),
        redis.set(`anon_batch:${batchId}:tasks`, JSON.stringify(createdTasks), { ex: 3600 }),
        redis.set(`anon_batch:${batchId}:api_key_id`, apiKey.id, { ex: 3600 })
      ]);
    }

    console.log(`🎉 [TRIAL-${batchId.slice(-4)}] Created ${createdTasks.length}/4 tasks`);

    // 7. 返回成功响应
    const response = {
      batchId,
      tasks: createdTasks,
      taskCount: createdTasks.length,
      status: 'processing',
      message: '',
      estimatedTime: '预计 2-10 分钟完成所有处理'
    };

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [TRIAL] 处理异常:', error);
    
    // 释放使用的API key
    for (const keyId of usedApiKeys) {
      try {
        await releaseApiKey(keyId);
      } catch (releaseError) {
        console.error(`❌ [TRIAL] API Key清理失败: ${keyId}`);
      }
    }
    
    return apiResponse.serverError('批量匿名试用服务内部错误');
  }
}