import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
// 已删除限流检查导入
import { getAvailableFreepikApiKey, releaseApiKey } from '@/lib/freepik/api-key-manager';
import { 
  convertR2ImageToBase64, 
  setTaskStatus, 
  isValidImageFormat,
  generateTaskIdentifier 
} from '@/lib/freepik/utils';
import { 
  validateUserCredits, 
  deductUserCredits, 
  isValidScaleFactor 
} from '@/lib/freepik/credits';
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

// 请求参数验证 schema (JSON 格式)
const enhanceRequestSchema = z.object({
  image: z.string().min(1, 'base64 图片数据不能为空'),
  scaleFactor: z.enum(['2x', '4x', '8x', '16x'], {
    errorMap: () => ({ message: '放大倍数必须是 2x, 4x, 8x 或 16x' })
  }),
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

type EnhanceRequest = z.infer<typeof enhanceRequestSchema>;

// 删除限流配置 - 只依赖积分验证
// 简化架构：直接使用 Freepik task_id 作为数据库主键，无需复杂的ID映射

export async function POST(req: NextRequest) {
  console.log('🚀 [ENHANCE START] ===== 收到图像增强请求 =====');
  
  let apiKeyToRelease: string | undefined;
  
  try {
    // 1. 用户认证
    console.log('🔐 [ENHANCE START] 步骤1: 开始用户认证验证...');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('🔐 [ENHANCE START] 用户认证结果:', { 
      userId: user?.id, 
      userEmail: user?.email,
      hasError: !!authError,
      errorMessage: authError?.message 
    });

    if (authError || !user) {
      console.log('❌ [ENHANCE START] 用户认证失败，返回401');
      return apiResponse.unauthorized('用户未认证');
    }

    console.log(`✅ [ENHANCE START] 用户认证成功: ${user.id}`);

    // 2. 解析JSON请求
    console.log('📝 [ENHANCE START] 步骤2: 解析JSON请求...');
    const body = await req.json();
    
    console.log('📝 [ENHANCE START] 请求内容:', {
      hasImage: !!body.image,
      imageLength: body.image?.length || 0,
      scaleFactor: body.scaleFactor,
      optimizedFor: body.optimizedFor,
      engine: body.engine,
      creativity: body.creativity,
      hdr: body.hdr,
      resemblance: body.resemblance,
      fractality: body.fractality,
      hasPrompt: !!body.prompt
    });

    // 3. 验证参数
    console.log('🔍 [ENHANCE START] 步骤3: 验证请求参数...');
    const validationResult = enhanceRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [ENHANCE START] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { image: base64Image, ...validatedParams } = validationResult.data;
    console.log('✅ [ENHANCE START] 参数验证成功:', {
      ...validatedParams,
      imageLength: base64Image.length
    });

    // 4. 跳过限流检查 - 只依赖积分验证
    console.log('⏱️ [ENHANCE START] 步骤4: 跳过限流检查，只依赖积分验证...');

    // 4. 验证积分余额
    console.log('💰 [ENHANCE START] 步骤4: 验证积分余额...');
    const creditValidation = await validateUserCredits(user.id, validatedParams.scaleFactor);
    console.log('💰 [ENHANCE START] 积分验证结果:', creditValidation);
    
    if (!creditValidation.hasEnoughCredits) {
      console.log('❌ [ENHANCE START] 积分余额不足');
      return apiResponse.badRequest(
        `积分余额不足。需要 ${creditValidation.requiredCredits} 积分，当前余额 ${creditValidation.availableCredits} 积分`
      );
    }

    // 5. 检查 API Key 可用性
    console.log('🔑 [ENHANCE START] 步骤5: 获取可用的API密钥...');
    const apiKey = await getAvailableFreepikApiKey();
    console.log('🔑 [ENHANCE START] API密钥获取结果:', { hasApiKey: !!apiKey, keyId: apiKey?.id });
    if (!apiKey) {
      console.log('❌ [ENHANCE START] 没有可用的API密钥');
      return apiResponse.error('服务暂时不可用，请稍后重试', 503);
    }

    console.log(`✅ [ENHANCE START] 使用API密钥: ${apiKey.name} (剩余 ${apiKey.remaining} 次)`);
    apiKeyToRelease = apiKey.id;

    // 6. 扣减积分（使用临时ID用于记录）
    console.log('💰 [ENHANCE START] 步骤6: 扣减用户积分...');
    const tempTaskId = generateTaskIdentifier(user.id, ''); // 仅用于积分扣减记录
    const deductResult = await deductUserCredits(user.id, validatedParams.scaleFactor, tempTaskId);
    console.log('💰 [ENHANCE START] 积分扣减结果:', deductResult);
    
    if (!deductResult.success) {
      console.log('❌ [ENHANCE START] 积分扣减失败');
      return apiResponse.error(`积分扣减失败: ${deductResult.error}`);
    }

    console.log(`✅ [ENHANCE START] 积分扣减成功，用户: ${user.id}`);

    // 7. 调用 Freepik API
    console.log('🚀 [ENHANCE START] 步骤7: 调用Freepik API...');
    
    // 确保 webhook URL 是公开可访问的
    const siteUrl = process.env.WEBHOOK_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const webhookUrl = `${siteUrl}${siteUrl?.endsWith('/') ? '' : '/'}api/webhook/freepik`;
    console.log('🔗 [ENHANCE START] Webhook URL:', webhookUrl);
    
    // 验证 webhook URL 格式
    if (!webhookUrl || webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      console.error('❌ [ENHANCE START] 无效的 webhook URL:', webhookUrl);
      return apiResponse.error('服务配置错误：需要公开的 webhook URL', 500);
    }
    
    const freepikPayload = {
      image: base64Image, // 直接使用前端传来的 base64
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
    
    console.log('🚀 [ENHANCE START] Freepik API请求参数:', {
      scale_factor: freepikPayload.scale_factor,
      optimized_for: freepikPayload.optimized_for,
      webhook_url: freepikPayload.webhook_url,
      hasPrompt: !!freepikPayload.prompt,
      promptLength: freepikPayload.prompt?.length || 0,
      creativity: freepikPayload.creativity,
      hdr: freepikPayload.hdr,
      resemblance: freepikPayload.resemblance,
      fractality: freepikPayload.fractality,
      engine: freepikPayload.engine,
      imageDataLength: base64Image.length
    });
    
    let freepikResponse;
    try {
      freepikResponse = await fetch('https://api.freepik.com/v1/ai/image-upscaler', {
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
      console.error('❌ [ENHANCE START] Freepik API 请求失败:', error);
      
      // Freepik API 调用失败，释放 API key（因为配额未被消耗）
      if (apiKeyToRelease) {
        console.log('🔄 [API_KEY_RELEASE] Freepik API 调用失败，释放 API key:', apiKeyToRelease);
        await releaseApiKey(apiKeyToRelease);
        apiKeyToRelease = undefined;
      }
      
      // 退回积分
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, validatedParams.scaleFactor, tempTaskId);
      
      return apiResponse.error('无法连接到图像增强服务，请稍后重试', 503);
    }

    console.log('🚀 [ENHANCE START] Freepik API响应状态:', {
      status: freepikResponse.status,
      statusText: freepikResponse.statusText,
      ok: freepikResponse.ok
    });

    if (!freepikResponse.ok) {
      const errorText = await freepikResponse.text();
      console.error('❌ [ENHANCE START] Freepik API错误:', freepikResponse.status, errorText);
      
      // API 调用失败，释放 API key 并退回积分
      if (apiKeyToRelease) {
        await releaseApiKey(apiKeyToRelease);
        apiKeyToRelease = undefined;
      }
      
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, validatedParams.scaleFactor, tempTaskId);
      
      return apiResponse.error(
        `图像处理服务暂时不可用: ${freepikResponse.status}`,
        503
      );
    }

    const freepikData = await freepikResponse.json();
    console.log('🚀 [ENHANCE START] Freepik API响应数据:', freepikData);
    
    const freepikTaskId = freepikData.data?.task_id;

    if (!freepikTaskId) {
      console.error('❌ [ENHANCE START] Freepik API未返回task_id:', freepikData);
      
      // 没有获到 task_id，释放 API key 并退回积分
      if (apiKeyToRelease) {
        await releaseApiKey(apiKeyToRelease);
        apiKeyToRelease = undefined;
      }
      
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, validatedParams.scaleFactor, tempTaskId);
      
      return apiResponse.error('图像处理请求失败，请重试');
    }

    console.log(`✅ [ENHANCE START] Freepik任务创建成功: ${freepikTaskId}`);
    // API key已被使用，不再需要释放
    apiKeyToRelease = undefined;

    // 8. 直接创建任务记录（使用Freepik task_id）
    console.log('💾 [ENHANCE START] 步骤8: 创建任务记录...');
    
    const { error: insertError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .insert({
        id: freepikTaskId, // 直接使用 Freepik task_id，没有映射复杂度
        user_id: user.id,
        status: 'processing',
        r2_original_key: null, // 稍后异步上传
        scale_factor: validatedParams.scaleFactor,
        optimized_for: validatedParams.optimizedFor,
        prompt: validatedParams.prompt || null,
        creativity: validatedParams.creativity,
        hdr: validatedParams.hdr,
        resemblance: validatedParams.resemblance,
        fractality: validatedParams.fractality,
        engine: validatedParams.engine,
        api_key_id: apiKey.id,
        api_key: apiKey.key, // Store actual API key for fallback queries
        credits_consumed: creditValidation.requiredCredits
      });
    
    if (insertError) {
      console.error('❌ [ENHANCE START] 数据库记录创建失败:', insertError);
      
      // 退回积分
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, validatedParams.scaleFactor, tempTaskId);
      
      return apiResponse.error('任务创建失败，请重试');
    }
    console.log('✅ [ENHANCE START] 任务记录创建成功');
    
    // 9. 异步上传原图到 R2（不阻塞响应）
    uploadOriginalImageAsync(base64Image, freepikTaskId, user.id);
    
    // 10. 设置Redis缓存（使用Freepik的task_id）
    if (redis) {
      console.log('💾 [ENHANCE START] 保存Redis缓存...');
      await Promise.all([
        redis.set(`task:${freepikTaskId}:user_id`, user.id, { ex: 3600 }),
        redis.set(`task:${freepikTaskId}:api_key_id`, apiKey.id, { ex: 3600 })
      ]);
      console.log('✅ [ENHANCE START] Redis缓存保存完成');
    }

    // 11. 设置初始状态
    console.log('📊 [ENHANCE START] 步骤11: 设置任务初始状态...');
    await setTaskStatus(freepikTaskId, 'processing');
    console.log('✅ [ENHANCE START] 任务状态设置完成');

    // 11.5 注册 QStash 延迟轮询（兜底机制）
    if (qstash) {
      try {
        console.log('🔄 [ENHANCE START] 注册 QStash 延迟轮询...');
        const pollSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        const pollUrl = `${pollSiteUrl}${pollSiteUrl?.endsWith('/') ? '' : '/'}api/internal/poll-task`;
        
        await qstash.publishJSON({
          url: pollUrl,
          body: {
            taskId: freepikTaskId,
            attempt: 1,
            userId: user.id,
            scaleFactor: validatedParams.scaleFactor
          },
          delay: 60, // 60秒后第一次查询
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ [ENHANCE START] QStash 轮询已注册，1分钟后开始');
      } catch (qstashError) {
        console.error('⚠️ [ENHANCE START] QStash 注册失败，但不影响主流程:', qstashError);
        // QStash 失败不影响主流程，Webhook 仍然可以工作
      }
    } else {
      console.log('⚠️ [ENHANCE START] QStash 未配置，仅依赖 Webhook');
    }

    // 12. 返回成功响应
    console.log('🎉 [ENHANCE START] 步骤12: 准备返回成功响应...');
    const updatedBenefits = await import('@/actions/usage/benefits')
      .then(m => m.getUserBenefits(user.id));
    
    const response = {
      taskId: freepikTaskId,
      status: 'processing',
      creditsConsumed: creditValidation.requiredCredits,
      remainingCredits: updatedBenefits?.totalAvailableCredits || 0,
      estimatedTime: `${validatedParams.scaleFactor === '2x' ? '30-60秒' : 
                       validatedParams.scaleFactor === '4x' ? '1-2分钟' : 
                       validatedParams.scaleFactor === '8x' ? '2-5分钟' : 
                       '5-10分钟'}`
      // originalUrl 将在异步上传完成后可用
    };
    
    console.log('🎉 [ENHANCE START] 成功响应数据:', response);
    console.log('🎉 [ENHANCE START] ===== 图像增强请求处理完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [ENHANCE START] ===== 处理过程中发生异常 =====');
    console.error('💥 [ENHANCE START] 错误详情:', error);
    console.error('💥 [ENHANCE START] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 清理资源：释放API key
    if (apiKeyToRelease) {
      try {
        await releaseApiKey(apiKeyToRelease);
        console.log('🔄 [ENHANCE START] 异常处理中释放API key');
      } catch (releaseError) {
        console.error('❌ [ENHANCE START] 释放API key失败:', releaseError);
      }
    }
    
    return apiResponse.serverError('图像增强服务内部错误');
  }
}

// 异步上传原图函数（复用现有工具）
async function uploadOriginalImageAsync(base64Image: string, taskId: string, userId: string) {
  try {
    const { getDataFromDataUrl, serverUploadFile } = await import('@/lib/cloudflare/r2');
    
    // 解析 base64
    const result = getDataFromDataUrl(base64Image);
    if (!result) {
      throw new Error('Invalid base64 format');
    }
    
    // 生成 R2 key
    const r2Key = `enhance/${userId}/${Date.now()}-${taskId}.jpg`;
    
    // 上传到 R2
    await serverUploadFile({
      data: result.buffer,
      contentType: result.contentType,
      key: r2Key
    });
    
    // 更新数据库记录
    await supabaseAdmin
      .from('image_enhancement_tasks')
      .update({ r2_original_key: r2Key })
      .eq('id', taskId);
      
    console.log(`✅ [ASYNC UPLOAD] 原图异步上传完成: ${taskId}`);
  } catch (error) {
    console.error(`❌ [ASYNC UPLOAD] 原图异步上传失败: ${taskId}`, error);
    // 记录错误但不影响主流程
  }
}