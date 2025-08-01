import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { checkRateLimit } from '@/lib/upstash';
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

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 请求参数验证 schema (支持 FormData)
const enhanceRequestSchema = z.object({
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
  creativity: z.string().transform(val => parseInt(val) || 0).pipe(z.number().int().min(-10).max(10)),
  hdr: z.string().transform(val => parseInt(val) || 0).pipe(z.number().int().min(-10).max(10)),
  resemblance: z.string().transform(val => parseInt(val) || 0).pipe(z.number().int().min(-10).max(10)),
  fractality: z.string().transform(val => parseInt(val) || 0).pipe(z.number().int().min(-10).max(10)),
  engine: z.enum(['automatic', 'magnific_illusio', 'magnific_sharpy', 'magnific_sparkle']).default('automatic')
});

type EnhanceRequest = z.infer<typeof enhanceRequestSchema>;

// 限流配置
const RATE_LIMIT_CONFIG = {
  prefix: 'enhance_rate_limit',
  maxRequests: parseInt(process.env.DAY_MAX_SUBMISSIONS || '10'),
  window: '1 d' as const
};

export async function POST(req: NextRequest) {
  console.log('🚀 [ENHANCE START] ===== 收到图像增强请求 =====');
  
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

    // 2. 解析FormData
    console.log('📝 [ENHANCE START] 步骤2: 解析FormData...');
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    console.log('📝 [ENHANCE START] FormData内容:', {
      hasImageFile: !!imageFile,
      imageFileName: imageFile?.name,
      imageFileSize: imageFile?.size,
      imageFileType: imageFile?.type,
      scaleFactor: formData.get('scaleFactor'),
      optimizedFor: formData.get('optimizedFor'),
      engine: formData.get('engine'),
      creativity: formData.get('creativity'),
      hdr: formData.get('hdr'),
      resemblance: formData.get('resemblance'),
      fractality: formData.get('fractality'),
      prompt: formData.get('prompt')
    });

    if (!imageFile) {
      console.log('❌ [ENHANCE START] 未找到图片文件');
      return apiResponse.badRequest('请上传图片文件');
    }

    // 3. 验证参数
    console.log('🔍 [ENHANCE START] 步骤3: 验证请求参数...');
    const params = {
      scaleFactor: formData.get('scaleFactor') as string,
      optimizedFor: formData.get('optimizedFor') as string || 'standard',
      engine: formData.get('engine') as string || 'automatic',
      creativity: formData.get('creativity') as string || '0',
      hdr: formData.get('hdr') as string || '0',
      resemblance: formData.get('resemblance') as string || '0',
      fractality: formData.get('fractality') as string || '0',
      prompt: formData.get('prompt') as string || ''
    };

    console.log('🔍 [ENHANCE START] 解析后的参数:', params);

    const validationResult = enhanceRequestSchema.safeParse(params);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [ENHANCE START] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const validatedParams: EnhanceRequest = validationResult.data;
    console.log('✅ [ENHANCE START] 参数验证成功:', validatedParams);

    // 4. 限流检查
    console.log('⏱️ [ENHANCE START] 步骤4: 检查限流...');
    const rateLimitSuccess = await checkRateLimit(user.id, RATE_LIMIT_CONFIG);
    console.log('⏱️ [ENHANCE START] 限流检查结果:', { success: rateLimitSuccess });
    
    if (!rateLimitSuccess) {
      console.log('❌ [ENHANCE START] 请求过于频繁');
      return apiResponse.error('请求过于频繁，请稍后再试', 429);
    }

    // 5. 验证积分余额
    console.log('💰 [ENHANCE START] 步骤5: 验证积分余额...');
    const creditValidation = await validateUserCredits(user.id, validatedParams.scaleFactor);
    console.log('💰 [ENHANCE START] 积分验证结果:', creditValidation);
    
    if (!creditValidation.hasEnoughCredits) {
      console.log('❌ [ENHANCE START] 积分余额不足');
      return apiResponse.badRequest(
        `积分余额不足。需要 ${creditValidation.requiredCredits} 积分，当前余额 ${creditValidation.availableCredits} 积分`
      );
    }

    // 6. 检查 API Key 可用性
    console.log('🔑 [ENHANCE START] 步骤6: 获取可用的API密钥...');
    const apiKey = await getAvailableFreepikApiKey();
    console.log('🔑 [ENHANCE START] API密钥获取结果:', { hasApiKey: !!apiKey, keyId: apiKey?.id });
    if (!apiKey) {
      console.log('❌ [ENHANCE START] 没有可用的API密钥');
      return apiResponse.error('服务暂时不可用，请稍后重试', 503);
    }

    console.log(`✅ [ENHANCE START] 使用API密钥: ${apiKey.name} (剩余 ${apiKey.remaining} 次)`);

    // 7. 上传图片到 R2
    console.log('☁️ [ENHANCE START] 步骤7: 上传图片到R2存储...');
    const { uploadToR2 } = await import('@/lib/r2');
    let r2Key: string;
    let base64Image: string;
    
    try {
      // 生成唯一的R2 key
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = imageFile.name.split('.').pop() || 'jpg';
      r2Key = `enhance/${user.id}/${timestamp}-${randomString}.${fileExtension}`;
      
      console.log('☁️ [ENHANCE START] 准备上传到R2:', { r2Key, fileSize: imageFile.size });
      
      // 上传到 R2
      const uploadResult = await uploadToR2(imageFile, r2Key);
      console.log('☁️ [ENHANCE START] R2上传结果:', uploadResult);
      
      // 将图片转换为 base64
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Image = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
      
      console.log('✅ [ENHANCE START] 图片上传和转换完成');
    } catch (error) {
      console.error('❌ [ENHANCE START] 图片上传失败:', error);
      return apiResponse.error('图片上传失败，请重试');
    }

    // 8. 生成临时任务ID并创建数据库记录
    console.log('🆔 [ENHANCE START] 步骤8: 生成临时任务ID并创建数据库记录...');
    const temporaryTaskId = generateTaskIdentifier(user.id, r2Key);
    console.log(`🆔 [ENHANCE START] 临时任务ID: ${temporaryTaskId}`);

    // 先创建数据库记录（使用临时ID）
    const { error: insertError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .insert({
        id: temporaryTaskId,
        user_id: user.id,
        status: 'processing',
        r2_original_key: r2Key,
        scale_factor: validatedParams.scaleFactor,
        optimized_for: validatedParams.optimizedFor,
        prompt: validatedParams.prompt || null,
        creativity: validatedParams.creativity,
        hdr: validatedParams.hdr,
        resemblance: validatedParams.resemblance,
        fractality: validatedParams.fractality,
        engine: validatedParams.engine,
        api_key_id: apiKey.id,
        credits_consumed: creditValidation.requiredCredits
      });

    if (insertError) {
      console.error('❌ [ENHANCE START] 数据库记录创建失败:', insertError);
      return apiResponse.error('任务创建失败，请重试');
    }
    console.log('✅ [ENHANCE START] 临时数据库记录创建成功');

    // 9. 扣减积分
    console.log('💰 [ENHANCE START] 步骤9: 扣减用户积分...');
    const deductResult = await deductUserCredits(user.id, validatedParams.scaleFactor, temporaryTaskId);
    console.log('💰 [ENHANCE START] 积分扣减结果:', deductResult);
    
    if (!deductResult.success) {
      console.log('❌ [ENHANCE START] 积分扣减失败，删除临时记录');
      // 删除刚创建的记录
      await supabaseAdmin
        .from('image_enhancement_tasks')
        .delete()
        .eq('id', temporaryTaskId);
      return apiResponse.error(`积分扣减失败: ${deductResult.error}`);
    }

    console.log(`✅ [ENHANCE START] 积分扣减成功，用户: ${user.id}`);

    // 10. 调用 Freepik API
    console.log('🚀 [ENHANCE START] 步骤10: 调用Freepik API...');
    
    // 确保 webhook URL 是公开可访问的
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/freepik`;
    console.log('🔗 [ENHANCE START] Webhook URL:', webhookUrl);
    
    // 验证 webhook URL 格式
    if (!webhookUrl || webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      console.error('❌ [ENHANCE START] 无效的 webhook URL:', webhookUrl);
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
      
      // 处理超时错误 - 不释放API key，因为Freepik可能已经接收到请求
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log('⚠️ [ENHANCE START] API请求超时，但Freepik可能已接收请求，保留任务记录等待webhook');
        
        // 更新任务状态为等待webhook
        await supabaseAdmin
          .from('image_enhancement_tasks')
          .update({ 
            status: 'processing',
            error_message: '请求超时，等待处理结果...' 
          })
          .eq('id', temporaryTaskId);
        
        // 设置Redis缓存（使用临时ID）
        if (redis) {
          await Promise.all([
            redis.set(`task:${temporaryTaskId}:user_id`, user.id, { ex: 3600 }),
            redis.set(`task:${temporaryTaskId}:api_key_id`, apiKey.id, { ex: 3600 }),
            redis.set(`task:${temporaryTaskId}:r2_key`, r2Key, { ex: 3600 })
          ]);
        }
        
        // 返回临时任务ID，让前端可以轮询状态
        const updatedBenefits = await import('@/actions/usage/benefits')
          .then(m => m.getUserBenefits(user.id));
        
        const originalUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;
        
        return apiResponse.success({
          taskId: temporaryTaskId,
          status: 'processing',
          creditsConsumed: creditValidation.requiredCredits,
          remainingCredits: updatedBenefits?.totalAvailableCredits || 0,
          estimatedTime: `${validatedParams.scaleFactor === '2x' ? '30-60秒' : 
                           validatedParams.scaleFactor === '4x' ? '1-2分钟' : 
                           validatedParams.scaleFactor === '8x' ? '2-5分钟' : 
                           '5-10分钟'}`,
          originalUrl,
          message: '请求已提交，正在等待处理结果...'
        });
      }
      
      // 其他网络错误，释放 API key
      if (apiKey?.id) {
        await releaseApiKey(apiKey.id);
      }
      
      // 删除临时记录并退回积分
      await supabaseAdmin
        .from('image_enhancement_tasks')
        .delete()
        .eq('id', temporaryTaskId);
      
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, validatedParams.scaleFactor, temporaryTaskId);
      
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
      
      // API 调用失败，退回积分
      console.log('💰 [ENHANCE START] API调用失败，退回积分...');
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, validatedParams.scaleFactor, 'api-error');
      
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
      
      // 没有获到 task_id，退回积分
      console.log('💰 [ENHANCE START] 未获取到task_id，退回积分...');
      const { refundUserCredits } = await import('@/lib/freepik/credits');
      await refundUserCredits(user.id, validatedParams.scaleFactor, 'no-task-id');
      
      return apiResponse.error('图像处理请求失败，请重试');
    }

    console.log(`✅ [ENHANCE START] Freepik任务创建成功: ${freepikTaskId}`);

    // 11. 用Freepik的task_id创建正式记录，删除临时记录
    console.log('💾 [ENHANCE START] 步骤11: 创建正式任务记录...');
    
    // 获取临时记录的数据
    const { data: tempTask, error: fetchError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', temporaryTaskId)
      .single();
    
    if (fetchError || !tempTask) {
      console.error('❌ [ENHANCE START] 获取临时记录失败:', fetchError);
      return apiResponse.error('任务创建失败，请重试');
    }
    
    // 创建新的记录（使用Freepik的task_id）
    const { error: finalInsertError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .insert({
        id: freepikTaskId,
        user_id: tempTask.user_id,
        status: tempTask.status,
        r2_original_key: tempTask.r2_original_key,
        scale_factor: tempTask.scale_factor,
        optimized_for: tempTask.optimized_for,
        prompt: tempTask.prompt,
        creativity: tempTask.creativity,
        hdr: tempTask.hdr,
        resemblance: tempTask.resemblance,
        fractality: tempTask.fractality,
        engine: tempTask.engine,
        api_key_id: tempTask.api_key_id,
        credits_consumed: tempTask.credits_consumed,
        created_at: tempTask.created_at
      });
    
    if (finalInsertError) {
      console.error('❌ [ENHANCE START] 创建正式记录失败:', finalInsertError);
      // 如果创建失败，保留临时记录但记录错误
      console.log('⚠️ [ENHANCE START] 使用临时记录继续，但webhook可能无法匹配');
    } else {
      console.log('✅ [ENHANCE START] 正式任务记录创建成功');
      
      // 删除临时记录
      await supabaseAdmin
        .from('image_enhancement_tasks')
        .delete()
        .eq('id', temporaryTaskId);
      
      console.log('✅ [ENHANCE START] 临时记录已清理');
    }
    
    // 设置Redis缓存（使用Freepik的task_id）
    if (redis) {
      console.log('💾 [ENHANCE START] 保存Redis缓存...');
      await Promise.all([
        redis.set(`task:${freepikTaskId}:user_id`, user.id, { ex: 3600 }),
        redis.set(`task:${freepikTaskId}:api_key_id`, apiKey.id, { ex: 3600 }),
        redis.set(`task:${freepikTaskId}:r2_key`, r2Key, { ex: 3600 })
      ]);
      console.log('✅ [ENHANCE START] Redis缓存保存完成');
    }

    // 11. 设置初始状态
    console.log('📊 [ENHANCE START] 步骤11: 设置任务初始状态...');
    await setTaskStatus(freepikTaskId, 'processing');
    console.log('✅ [ENHANCE START] 任务状态设置完成');

    // 12. 返回成功响应
    console.log('🎉 [ENHANCE START] 步骤12: 准备返回成功响应...');
    const updatedBenefits = await import('@/actions/usage/benefits')
      .then(m => m.getUserBenefits(user.id));
    
    const originalUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;

    const response = {
      taskId: freepikTaskId,
      status: 'processing',
      creditsConsumed: creditValidation.requiredCredits,
      remainingCredits: updatedBenefits?.totalAvailableCredits || 0,
      estimatedTime: `${validatedParams.scaleFactor === '2x' ? '30-60秒' : 
                       validatedParams.scaleFactor === '4x' ? '1-2分钟' : 
                       validatedParams.scaleFactor === '8x' ? '2-5分钟' : 
                       '5-10分钟'}`,
      originalUrl
    };
    
    console.log('🎉 [ENHANCE START] 成功响应数据:', response);
    console.log('🎉 [ENHANCE START] ===== 图像增强请求处理完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [ENHANCE START] ===== 处理过程中发生异常 =====');
    console.error('💥 [ENHANCE START] 错误详情:', error);
    console.error('💥 [ENHANCE START] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    return apiResponse.serverError('图像增强服务内部错误');
  }
}