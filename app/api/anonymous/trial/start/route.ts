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

// 请求参数验证
const startTrialSchema = z.object({
  browserFingerprint: z.string().min(8, '浏览器指纹无效'),
  image: z.string().min(1, 'base64 图片数据不能为空'),
  scaleFactor: z.enum(['2x', '4x', '8x', '16x']).default('4x'),
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

type StartTrialRequest = z.infer<typeof startTrialSchema>;

/**
 * 开始匿名用户试用
 * POST /api/anonymous/trial/start
 */
export async function POST(req: NextRequest) {
  console.log('🚀 [ANONYMOUS TRIAL START] ===== 开始匿名试用 =====');
  
  let apiKeyId: string | undefined;
  
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
    console.log('✅ [ANONYMOUS TRIAL START] 参数验证成功');

    // 3. 获取可用的 API Key
    console.log('🔑 [ANONYMOUS TRIAL START] 获取可用的API密钥...');
    const apiKey = await getAvailableFreepikApiKey();
    if (!apiKey) {
      console.log('❌ [ANONYMOUS TRIAL START] 没有可用的API密钥');
      return apiResponse.error('服务暂时不可用，请稍后重试', 503);
    }
    apiKeyId = apiKey.id;
    console.log(`✅ [ANONYMOUS TRIAL START] 使用API密钥: ${apiKey.name} (剩余 ${apiKey.remaining} 次)`);

    // 4. 调用 Freepik API
    console.log('🚀 [ANONYMOUS TRIAL START] 调用Freepik API...');
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/anonymous/webhook/freepik`;
    console.log('🔗 [ANONYMOUS TRIAL START] Webhook URL:', webhookUrl);
    
    // 验证 webhook URL 格式
    if (!webhookUrl || webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      console.error('❌ [ANONYMOUS TRIAL START] 无效的 webhook URL:', webhookUrl);
      return apiResponse.error('服务配置错误：需要公开的 webhook URL', 500);
    }
    
    const freepikPayload = {
      image: base64Image,
      scale_factor: validatedParams.scaleFactor,
      optimized_for: validatedParams.optimizedFor,
      webhook_url: webhookUrl,
      prompt: validatedParams.prompt || undefined,
      creativity: validatedParams.creativity,
      hdr: validatedParams.hdr,
      resemblance: validatedParams.resemblance,
      fractality: validatedParams.fractality,
      engine: validatedParams.engine
    };
    
    console.log('🚀 [ANONYMOUS TRIAL START] Freepik API请求参数:', {
      scale_factor: freepikPayload.scale_factor,
      optimized_for: freepikPayload.optimized_for,
      webhook_url: freepikPayload.webhook_url,
      hasPrompt: !!freepikPayload.prompt,
      promptLength: freepikPayload.prompt?.length || 0,
      imageDataLength: base64Image.length
    });
    
    let freepikResponse;
    try {
      freepikResponse = await fetch('https://api.freepik.com/v1/ai/image-upscaler', {
        method: 'POST',
        headers: {
          'x-freepik-api-key': apiKey.key,
          'Content-Type': 'application/json',
          'User-Agent': 'NextyDev-ImageEnhancer-Anonymous/1.0'
        },
        body: JSON.stringify(freepikPayload),
        signal: AbortSignal.timeout(120000) // 120秒超时
      });
    } catch (error) {
      console.error('❌ [ANONYMOUS TRIAL START] Freepik API 请求失败:', error);
      
      // 释放 API key
      if (apiKeyId) {
        await releaseApiKey(apiKeyId);
      }
      
      return apiResponse.error('无法连接到图像增强服务，请稍后重试', 503);
    }

    console.log('🚀 [ANONYMOUS TRIAL START] Freepik API响应状态:', {
      status: freepikResponse.status,
      statusText: freepikResponse.statusText,
      ok: freepikResponse.ok
    });

    if (!freepikResponse.ok) {
      const errorText = await freepikResponse.text();
      console.error('❌ [ANONYMOUS TRIAL START] Freepik API错误:', freepikResponse.status, errorText);
      
      // 释放 API key
      if (apiKeyId) {
        await releaseApiKey(apiKeyId);
      }
      
      return apiResponse.error(
        `图像处理服务暂时不可用: ${freepikResponse.status}`,
        503
      );
    }

    const freepikData = await freepikResponse.json();
    console.log('🚀 [ANONYMOUS TRIAL START] Freepik API响应数据:', freepikData);
    
    const freepikTaskId = freepikData.data?.task_id;

    if (!freepikTaskId) {
      console.error('❌ [ANONYMOUS TRIAL START] Freepik API未返回task_id:', freepikData);
      
      // 释放 API key
      if (apiKeyId) {
        await releaseApiKey(apiKeyId);
      }
      
      return apiResponse.error('图像处理请求失败，请重试');
    }

    console.log(`✅ [ANONYMOUS TRIAL START] Freepik任务创建成功: ${freepikTaskId}`);

    // 5. 调用数据库函数：使用试用并创建任务
    console.log('💾 [ANONYMOUS TRIAL START] 调用数据库函数创建任务...');
    const { data: trialResult, error: trialError } = await supabaseAdmin
      .rpc('use_trial_and_create_task', {
        p_browser_fingerprint: browserFingerprint,
        p_freepik_task_id: freepikTaskId
      });

    if (trialError) {
      console.error('❌ [ANONYMOUS TRIAL START] 数据库操作失败:', trialError);
      
      // 释放 API key
      if (apiKeyId) {
        await releaseApiKey(apiKeyId);
      }
      
      return apiResponse.error('试用创建失败，请重试');
    }

    if (!trialResult.success) {
      console.log('❌ [ANONYMOUS TRIAL START] 试用资格验证失败:', trialResult);
      
      // 释放 API key
      if (apiKeyId) {
        await releaseApiKey(apiKeyId);
      }
      
      return apiResponse.badRequest(trialResult.message || '试用资格验证失败');
    }

    console.log('✅ [ANONYMOUS TRIAL START] 试用和任务创建成功:', trialResult);

    // 6. 保存相关信息到 Redis（用于 webhook 处理）
    if (redis) {
      console.log('💾 [ANONYMOUS TRIAL START] 保存Redis缓存...');
      await Promise.all([
        redis.set(`anon_task:${freepikTaskId}:fingerprint`, browserFingerprint, { ex: 3600 }),
        redis.set(`anon_task:${freepikTaskId}:api_key_id`, apiKeyId, { ex: 3600 })
      ]);
      console.log('✅ [ANONYMOUS TRIAL START] Redis缓存保存完成');
    }

    // 7. 返回成功响应
    const response = {
      taskId: freepikTaskId,
      status: 'processing',
      message: '免费试用已开始，正在处理您的图片...',
      estimatedTime: `${validatedParams.scaleFactor === '2x' ? '30-60秒' : 
                       validatedParams.scaleFactor === '4x' ? '1-2分钟' : 
                       validatedParams.scaleFactor === '8x' ? '2-5分钟' : 
                       '5-10分钟'}`
    };
    
    console.log('🎉 [ANONYMOUS TRIAL START] 成功响应数据:', response);
    console.log('🎉 [ANONYMOUS TRIAL START] ===== 匿名试用开始完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [ANONYMOUS TRIAL START] ===== 处理过程中发生异常 =====');
    console.error('💥 [ANONYMOUS TRIAL START] 错误详情:', error);
    console.error('💥 [ANONYMOUS TRIAL START] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 释放 API key
    if (apiKeyId) {
      await releaseApiKey(apiKeyId);
    }
    
    return apiResponse.serverError('匿名试用服务内部错误');
  }
}