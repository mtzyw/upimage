import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { getAvailableFreepikApiKey, releaseApiKey } from '@/lib/freepik/api-key-manager';
import { setTaskStatus, generateTaskIdentifier } from '@/lib/freepik/utils';
import { validateUserCredits, deductUserCredits } from '@/lib/freepik/credits';
import { redis } from '@/lib/upstash';
import { Client } from '@upstash/qstash';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 初始化 QStash client
const qstash = process.env.QSTASH_TOKEN ? new Client({
  token: process.env.QSTASH_TOKEN
}) : null;

// Flux Dev 请求参数验证 schema
const fluxDevRequestSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空').max(1000, '提示词不能超过1000个字符'),
  aspect_ratio: z.enum([
    'square_1_1',
    'classic_4_3', 
    'traditional_3_4',
    'widescreen_16_9',
    'social_story_9_16',
    'standard_3_2',
    'portrait_2_3',
    'horizontal_2_1',
    'vertical_1_2',
    'social_post_4_5'
  ]).default('square_1_1'),
  seed: z.number().int().min(1).max(4294967295).optional(),
  styling: z.object({}).optional(), // 预留样式配置
  tempTaskId: z.string().optional() // 多任务支持的临时任务ID
});

type FluxDevRequest = z.infer<typeof fluxDevRequestSchema>;

// Flux Dev 固定消耗 1 积分
const FLUX_DEV_CREDITS = 1;

/**
 * 将 Flux Dev 参数映射到现有数据库字段
 */
function mapFluxDevParamsToDbFields(params: FluxDevRequest) {
  return {
    // 复用现有字段，用特殊值标识这是 text-to-image 任务
    scale_factor: params.aspect_ratio,          // 存储宽高比
    optimized_for: 'text-to-image',             // 固定值标识任务类型
    prompt: params.prompt,                      // 完全复用
    creativity: params.seed || 0,               // 复用字段存储seed
    hdr: 0,                                     // 未使用
    resemblance: 0,                             // 未使用  
    fractality: 0,                              // 未使用
    engine: 'flux-dev',                         // 任务类型标识
    credits_consumed: FLUX_DEV_CREDITS,         // 固定1积分
    r2_original_key: null                       // text-to-image不需要原图
  };
}

/**
 * 构建 Freepik Flux Dev API 请求载荷
 */
function buildFreepikPayload(params: FluxDevRequest, webhookUrl: string) {
  const payload: any = {
    prompt: params.prompt,
    aspect_ratio: params.aspect_ratio,
    webhook_url: webhookUrl
  };

  // 可选参数
  if (params.seed) {
    payload.seed = params.seed;
  }

  if (params.styling) {
    payload.styling = params.styling;
  }

  return payload;
}

export async function POST(req: NextRequest) {
  console.log('🚀 [FLUX DEV START] ===== 收到文本生成图片请求 =====');
  
  let apiKeyToRelease: string | undefined;
  
  try {
    // 1. 用户认证
    console.log('🔐 [FLUX DEV START] 步骤1: 开始用户认证验证...');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ [FLUX DEV START] 用户认证失败，返回401');
      return apiResponse.unauthorized('用户未认证');
    }

    console.log(`✅ [FLUX DEV START] 用户认证成功: ${user.id}`);

    // 2. 解析JSON请求
    console.log('📝 [FLUX DEV START] 步骤2: 解析JSON请求...');
    const body = await req.json();
    
    console.log('📝 [FLUX DEV START] 请求内容:', {
      prompt: body.prompt?.substring(0, 50) + '...',
      promptLength: body.prompt?.length || 0,
      aspect_ratio: body.aspect_ratio,
      hasSeed: !!body.seed,
      seed: body.seed,
      hasStyling: !!body.styling
    });

    // 3. 验证参数
    console.log('🔍 [FLUX DEV START] 步骤3: 验证请求参数...');
    const validationResult = fluxDevRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [FLUX DEV START] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const validatedParams = validationResult.data;
    console.log('✅ [FLUX DEV START] 参数验证成功:', {
      promptLength: validatedParams.prompt.length,
      aspect_ratio: validatedParams.aspect_ratio,
      seed: validatedParams.seed || 'auto'
    });

    // 4. 验证积分余额 (固定1积分)
    console.log('💰 [FLUX DEV START] 步骤4: 验证积分余额...');
    
    // 使用现有的积分验证函数，传入固定的 scale_factor 来获得1积分消耗
    const creditValidation = await validateUserCredits(user.id, '2x'); // 2x 对应 1 积分
    console.log('💰 [FLUX DEV START] 积分验证结果:', creditValidation);
    
    if (!creditValidation.hasEnoughCredits) {
      console.log('❌ [FLUX DEV START] 积分余额不足');
      return apiResponse.badRequest(
        `积分余额不足。需要 ${FLUX_DEV_CREDITS} 积分，当前余额 ${creditValidation.availableCredits} 积分`
      );
    }

    // 5. 检查并发任务限制
    console.log('📊 [FLUX DEV START] 步骤5: 检查并发任务限制...');
    const { count: processingCount } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'processing');

    if (processingCount && processingCount >= 4) {
      console.log(`❌ [FLUX DEV START] 用户 ${user.id} 当前有 ${processingCount} 个任务正在进行中，已达到限制`);
      return apiResponse.badRequest('当前任务队列已满，请等待之前的任务完成后再试');
    }

    console.log(`✅ [FLUX DEV START] 并发检查通过，用户当前有 ${processingCount || 0} 个任务正在进行中`);

    // 6. 获取可用的 API 密钥
    console.log('🔑 [FLUX DEV START] 步骤6: 获取可用的API密钥...');
    const apiKey = await getAvailableFreepikApiKey();
    console.log('🔑 [FLUX DEV START] API密钥获取结果:', { hasApiKey: !!apiKey, keyId: apiKey?.id });
    
    if (!apiKey) {
      console.log('❌ [FLUX DEV START] 没有可用的API密钥');
      return apiResponse.error('服务暂时不可用，请稍后重试', 503);
    }

    console.log(`✅ [FLUX DEV START] 使用API密钥: ${apiKey.name} (剩余 ${apiKey.remaining} 次)`);
    apiKeyToRelease = apiKey.id;

    // 7. 扣减积分
    console.log('💰 [FLUX DEV START] 步骤7: 扣减用户积分...');
    const tempTaskId = validatedParams.tempTaskId || generateTaskIdentifier(user.id, '');
    const deductResult = await deductUserCredits(user.id, '2x', tempTaskId); // 使用2x来获得1积分扣减
    console.log('💰 [FLUX DEV START] 积分扣减结果:', deductResult);
    
    if (!deductResult.success) {
      console.log('❌ [FLUX DEV START] 积分扣减失败');
      return apiResponse.error(`积分扣减失败: ${deductResult.error}`);
    }

    console.log(`✅ [FLUX DEV START] 积分扣减成功，用户: ${user.id}`);

    // 8. 调用 Freepik Flux Dev API
    console.log('🚀 [FLUX DEV START] 步骤8: 调用Freepik Flux Dev API...');
    
    const siteUrl = process.env.WEBHOOK_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const webhookUrl = `${siteUrl}${siteUrl?.endsWith('/') ? '' : '/'}api/webhook/freepik`;
    console.log('🔗 [FLUX DEV START] Webhook URL:', webhookUrl);
    
    if (!webhookUrl || webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      console.error('❌ [FLUX DEV START] 无效的 webhook URL:', webhookUrl);
      return apiResponse.error('服务配置错误：需要公开的 webhook URL', 500);
    }
    
    const freepikPayload = buildFreepikPayload(validatedParams, webhookUrl);
    
    console.log('🚀 [FLUX DEV START] Freepik Flux Dev API请求参数:', {
      prompt: freepikPayload.prompt.substring(0, 100) + '...',
      aspect_ratio: freepikPayload.aspect_ratio,
      webhook_url: freepikPayload.webhook_url,
      hasSeed: !!freepikPayload.seed,
      seed: freepikPayload.seed,
      hasStyling: !!freepikPayload.styling
    });
    
    let freepikResponse;
    try {
      freepikResponse = await fetch('https://api.freepik.com/v1/ai/text-to-image/flux-dev', {
        method: 'POST',
        headers: {
          'x-freepik-api-key': apiKey.key,
          'Content-Type': 'application/json',
          'User-Agent': 'NextyDev-ImageEnhancer/1.0'
        },
        body: JSON.stringify(freepikPayload),
        signal: AbortSignal.timeout(120000) // 120秒超时
      });
    } catch (error) {
      console.error('❌ [FLUX DEV START] Freepik API 请求失败:', error);
      
      // API 调用失败，释放 API key 并退回积分
      if (apiKeyToRelease) {
        await releaseApiKey(apiKeyToRelease);
        apiKeyToRelease = undefined;
      }
      
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, '2x', tempTaskId);
      
      return apiResponse.error('无法连接到图像生成服务，请稍后重试', 503);
    }

    console.log('🚀 [FLUX DEV START] Freepik API响应状态:', {
      status: freepikResponse.status,
      statusText: freepikResponse.statusText,
      ok: freepikResponse.ok
    });

    if (!freepikResponse.ok) {
      const errorText = await freepikResponse.text();
      console.error('❌ [FLUX DEV START] Freepik API错误:', freepikResponse.status, errorText);
      
      // API 调用失败，释放 API key 并退回积分
      if (apiKeyToRelease) {
        await releaseApiKey(apiKeyToRelease);
        apiKeyToRelease = undefined;
      }
      
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, '2x', tempTaskId);
      
      return apiResponse.error(
        `图像生成服务暂时不可用: ${freepikResponse.status}`,
        503
      );
    }

    const freepikData = await freepikResponse.json();
    console.log('🚀 [FLUX DEV START] Freepik API响应数据:', freepikData);
    
    const freepikTaskId = freepikData.data?.task_id;

    if (!freepikTaskId) {
      console.error('❌ [FLUX DEV START] Freepik API未返回task_id:', freepikData);
      
      if (apiKeyToRelease) {
        await releaseApiKey(apiKeyToRelease);
        apiKeyToRelease = undefined;
      }
      
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, '2x', tempTaskId);
      
      return apiResponse.error('图像生成请求失败，请重试');
    }

    console.log(`✅ [FLUX DEV START] Freepik任务创建成功: ${freepikTaskId}`);
    // API key已被使用，不再需要释放
    apiKeyToRelease = undefined;

    // 9. 创建任务记录（映射到现有数据库结构）
    console.log('💾 [FLUX DEV START] 步骤9: 创建任务记录...');
    
    const dbParams = mapFluxDevParamsToDbFields(validatedParams);
    
    const { error: insertError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .insert({
        id: freepikTaskId,
        user_id: user.id,
        status: 'processing',
        ...dbParams,
        api_key_id: apiKey.id,
        api_key: apiKey.key
      });
    
    if (insertError) {
      console.error('❌ [FLUX DEV START] 数据库记录创建失败:', insertError);
      
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, '2x', tempTaskId);
      
      return apiResponse.error('任务创建失败，请重试');
    }
    console.log('✅ [FLUX DEV START] 任务记录创建成功');
    
    // 10. 设置Redis缓存
    if (redis) {
      console.log('💾 [FLUX DEV START] 保存Redis缓存...');
      await Promise.all([
        redis.set(`task:${freepikTaskId}:user_id`, user.id, { ex: 3600 }),
        redis.set(`task:${freepikTaskId}:api_key_id`, apiKey.id, { ex: 3600 }),
        redis.set(`task:${freepikTaskId}:task_type`, 'flux-dev', { ex: 3600 })
      ]);
      console.log('✅ [FLUX DEV START] Redis缓存保存完成');
    }

    // 11. 设置初始状态
    console.log('📊 [FLUX DEV START] 步骤10: 设置任务初始状态...');
    await setTaskStatus(freepikTaskId, 'processing');
    console.log('✅ [FLUX DEV START] 任务状态设置完成');

    // 12. 注册 QStash 延迟轮询
    if (qstash) {
      try {
        console.log('🔄 [FLUX DEV START] 注册 QStash 延迟轮询...');
        
        const qstashLockKey = `qstash_lock:${freepikTaskId}`;
        let shouldCreateQStashTask = true;
        
        if (redis) {
          const lockSet = await redis.set(qstashLockKey, Date.now(), { 
            nx: true,
            ex: 1800
          });
          
          if (!lockSet) {
            console.log('🔒 [FLUX DEV START] QStash任务已被其他进程调度，跳过重复创建');
            shouldCreateQStashTask = false;
          } else {
            console.log('🆕 [FLUX DEV START] 获得 QStash 调度锁，准备创建任务');
          }
        }
        
        if (shouldCreateQStashTask) {
          const pollSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
          const pollUrl = `${pollSiteUrl}${pollSiteUrl?.endsWith('/') ? '' : '/'}api/internal/poll-task`;
          
          await qstash.publishJSON({
            url: pollUrl,
            body: {
              taskId: freepikTaskId,
              attempt: 1,
              userId: user.id,
              taskType: 'flux-dev'
            },
            delay: 60, // 60秒后第一次查询
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('✅ [FLUX DEV START] QStash 轮询已注册，1分钟后开始');
        }
      } catch (qstashError) {
        console.error('⚠️ [FLUX DEV START] QStash 注册失败，但不影响主流程:', qstashError);
      }
    } else {
      console.log('⚠️ [FLUX DEV START] QStash 未配置，仅依赖 Webhook');
    }

    // 13. 返回成功响应
    console.log('🎉 [FLUX DEV START] 步骤11: 准备返回成功响应...');
    const updatedBenefits = await import('@/actions/usage/benefits')
      .then(m => m.getUserBenefits(user.id));
    
    const response = {
      taskId: freepikTaskId,
      status: 'processing',
      creditsConsumed: FLUX_DEV_CREDITS,
      remainingCredits: updatedBenefits?.totalAvailableCredits || 0,
      estimatedTime: '1-3分钟',
      prompt: validatedParams.prompt.substring(0, 100) + (validatedParams.prompt.length > 100 ? '...' : ''),
      aspectRatio: validatedParams.aspect_ratio,
      seed: validatedParams.seed
    };
    
    console.log('🎉 [FLUX DEV START] 成功响应数据:', response);
    console.log('🎉 [FLUX DEV START] ===== 文本生成图片请求处理完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [FLUX DEV START] ===== 处理过程中发生异常 =====');
    console.error('💥 [FLUX DEV START] 错误详情:', error);
    
    // 清理资源：释放API key
    if (apiKeyToRelease) {
      try {
        await releaseApiKey(apiKeyToRelease);
        console.log('🔄 [FLUX DEV START] 异常处理中释放API key');
      } catch (releaseError) {
        console.error('❌ [FLUX DEV START] 释放API key失败:', releaseError);
      }
    }
    
    return apiResponse.serverError('图像生成服务内部错误');
  }
}