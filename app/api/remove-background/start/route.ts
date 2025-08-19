import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { getAvailableFreepikApiKey, releaseApiKey } from '@/lib/freepik/api-key-manager';
import { 
  generateTaskIdentifier,
  getImageExtension 
} from '@/lib/freepik/utils';
import { getUserBenefits } from '@/actions/usage/benefits';
import { deductCredits } from '@/actions/usage/deduct';
import { serverUploadFile, getDataFromDataUrl } from '@/lib/cloudflare/r2';
import { uploadOptimizedImageStreamToR2 } from '@/lib/freepik/utils';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 请求参数验证 schema
const removeBackgroundRequestSchema = z.object({
  image: z.string().min(1, 'base64 图片数据不能为空'),
});

type RemoveBackgroundRequest = z.infer<typeof removeBackgroundRequestSchema>;

// 去除背景固定消耗2积分
const REMOVE_BACKGROUND_CREDITS = 2;

export async function POST(req: NextRequest) {
  console.log('🎨 [REMOVE_BG_START] ===== 收到去除背景请求 =====');
  
  let apiKeyToRelease: string | undefined;
  let tempTaskId: string | undefined;
  let user: any = null; // 在更高作用域声明 user 变量
  
  try {
    // 1. 用户认证
    console.log('🔐 [REMOVE_BG_START] 步骤1: 开始用户认证验证...');
    const supabase = await createClient();
    const { data: { user: authenticatedUser }, error: authError } = await supabase.auth.getUser();
    user = authenticatedUser; // 赋值给作用域更高的变量

    if (authError || !user) {
      console.log('❌ [REMOVE_BG_START] 用户认证失败，返回401');
      return apiResponse.unauthorized('用户未认证');
    }

    console.log(`✅ [REMOVE_BG_START] 用户认证成功: ${user.id}`);

    // 2. 解析请求
    console.log('📝 [REMOVE_BG_START] 步骤2: 解析请求...');
    const body = await req.json();
    
    const validationResult = removeBackgroundRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [REMOVE_BG_START] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { image: base64Image } = validationResult.data;
    console.log('✅ [REMOVE_BG_START] 参数验证成功，图片大小:', base64Image.length);

    // 3. 验证积分余额
    console.log('💰 [REMOVE_BG_START] 步骤3: 验证积分余额...');
    const userBenefits = await getUserBenefits(user.id);
    
    if (!userBenefits || userBenefits.totalAvailableCredits < REMOVE_BACKGROUND_CREDITS) {
      const availableCredits = userBenefits?.totalAvailableCredits || 0;
      console.log('❌ [REMOVE_BG_START] 积分余额不足');
      return apiResponse.badRequest(
        `积分余额不足。需要 ${REMOVE_BACKGROUND_CREDITS} 积分，当前余额 ${availableCredits} 积分`
      );
    }

    // 4. 获取API密钥
    console.log('🔑 [REMOVE_BG_START] 步骤4: 获取可用的API密钥...');
    const apiKey = await getAvailableFreepikApiKey();
    if (!apiKey) {
      console.log('❌ [REMOVE_BG_START] 没有可用的API密钥');
      return apiResponse.error('服务暂时不可用，请稍后重试', 503);
    }

    console.log(`✅ [REMOVE_BG_START] 使用API密钥: ${apiKey.name}`);
    apiKeyToRelease = apiKey.id;

    // 5. 扣减积分
    console.log('💰 [REMOVE_BG_START] 步骤5: 扣减用户积分...');
    tempTaskId = generateTaskIdentifier(user.id, '');
    const deductResult = await deductCredits(
      REMOVE_BACKGROUND_CREDITS, 
      `AI去除背景处理 - 任务ID: ${tempTaskId}`
    );
    
    if (!deductResult.success) {
      console.log('❌ [REMOVE_BG_START] 积分扣减失败');
      return apiResponse.error(`积分扣减失败: ${deductResult.error}`);
    }

    console.log(`✅ [REMOVE_BG_START] 积分扣减成功，用户: ${user.id}`);

    // 6. 上传原图到R2获取公开URL
    console.log('📤 [REMOVE_BG_START] 步骤6: 上传原图到R2...');
    const imageData = getDataFromDataUrl(base64Image);
    if (!imageData) {
      throw new Error('Invalid base64 format');
    }

    const originalKey = `remove-background/${user.id}/${Date.now()}-original.jpg`;
    const uploadResult = await serverUploadFile({
      data: imageData.buffer,
      contentType: imageData.contentType,
      key: originalKey
    });

    const originalImageUrl = `${process.env.R2_PUBLIC_URL}/${originalKey}`;
    console.log(`✅ [REMOVE_BG_START] 原图上传完成: ${originalImageUrl}`);

    // 7. 调用Freepik去除背景API
    console.log('🎨 [REMOVE_BG_START] 步骤7: 调用Freepik去除背景API...');
    
    const freepikResponse = await fetch('https://api.freepik.com/v1/ai/beta/remove-background', {
      method: 'POST',
      headers: {
        'x-freepik-api-key': apiKey.key,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        image_url: originalImageUrl
      })
    });

    console.log('🎨 [REMOVE_BG_START] Freepik API响应状态:', freepikResponse.status);

    if (!freepikResponse.ok) {
      const errorText = await freepikResponse.text();
      console.error('❌ [REMOVE_BG_START] Freepik API错误:', errorText);
      throw new Error(`Freepik API error: ${freepikResponse.status}`);
    }

    const freepikData = await freepikResponse.json();
    console.log('🎨 [REMOVE_BG_START] Freepik API响应:', {
      hasOriginal: !!freepikData.original,
      hasHighRes: !!freepikData.high_resolution,
      hasPreview: !!freepikData.preview,
      hasUrl: !!freepikData.url
    });

    if (!freepikData.high_resolution) {
      throw new Error('Freepik API未返回处理结果');
    }

    // 8. 生成任务ID并创建数据库记录
    console.log('💾 [REMOVE_BG_START] 步骤8: 创建任务记录...');
    const taskId = `rbg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error: insertError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .insert({
        id: taskId,
        user_id: user.id,
        status: 'processing',
        r2_original_key: originalKey,
        scale_factor: '2x', // 兼容数据库约束，实际不涉及缩放
        engine: 'remove_background', // 标识任务类型
        optimized_for: 'remove_background',
        api_key_id: apiKey.id,
        api_key: apiKey.key,
        credits_consumed: REMOVE_BACKGROUND_CREDITS,
        // 其他字段设为默认值
        creativity: 0,
        hdr: 0,
        resemblance: 0,
        fractality: 0,
        prompt: null
      });
    
    if (insertError) {
      console.error('❌ [REMOVE_BG_START] 数据库记录创建失败:', insertError);
      throw new Error('任务创建失败');
    }

    // 9. 流式下载并上传处理结果
    console.log('📥 [REMOVE_BG_START] 步骤9: 流式下载并上传处理结果...');
    
    const resultImageResponse = await fetch(freepikData.high_resolution);
    if (!resultImageResponse.ok) {
      throw new Error('无法下载处理结果');
    }

    const resultUpload = await uploadOptimizedImageStreamToR2(
      resultImageResponse,
      user.id,
      taskId,
      'png', // 去除背景通常返回PNG透明图片
      true // 启用回退，流式上传失败时降级到本地文件方案
    );

    console.log(`✅ [REMOVE_BG_START] 结果图片流式上传完成: ${resultUpload.url}`);

    // 10. 更新任务为完成状态
    console.log('✅ [REMOVE_BG_START] 步骤10: 更新任务状态为完成...');
    await supabaseAdmin
      .from('image_enhancement_tasks')
      .update({
        status: 'completed',
        cdn_url: resultUpload.url,
        r2_optimized_key: resultUpload.key,
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    // 11. 释放API密钥
    if (apiKeyToRelease) {
      await releaseApiKey(apiKeyToRelease);
      apiKeyToRelease = undefined;
    }

    // 12. 返回成功结果
    console.log('🎉 [REMOVE_BG_START] 步骤12: 返回成功结果...');
    const response = {
      taskId,
      status: 'completed',
      originalUrl: originalImageUrl,
      cdnUrl: resultUpload.url,
      creditsConsumed: REMOVE_BACKGROUND_CREDITS,
      uploadMethod: resultUpload.uploadMethod
    };

    console.log('🎉 [REMOVE_BG_START] 处理完成:', response);
    console.log('🎉 [REMOVE_BG_START] ===== 去除背景请求处理完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [REMOVE_BG_START] ===== 处理过程中发生异常 =====');
    console.error('💥 [REMOVE_BG_START] 错误详情:', error);
    
    // 清理资源
    if (apiKeyToRelease) {
      try {
        await releaseApiKey(apiKeyToRelease);
        console.log('🔄 [REMOVE_BG_START] 异常处理中释放API key');
      } catch (releaseError) {
        console.error('❌ [REMOVE_BG_START] 释放API key失败:', releaseError);
      }
    }

    // 退还积分 
    if (tempTaskId && user) {
      try {
        // 使用 grant_one_time_credits_and_log 函数添加积分来实现退还
        const { error: refundError } = await supabaseAdmin.rpc('grant_one_time_credits_and_log', {
          p_user_id: user.id,
          p_credits_to_add: REMOVE_BACKGROUND_CREDITS,
          p_related_order_id: undefined
        });
        
        if (refundError) {
          console.error('❌ [REMOVE_BG_START] 退还积分失败:', refundError);
        } else {
          console.log('💰 [REMOVE_BG_START] 异常处理中退还积分成功');
          
          // 更新积分日志记录的类型和备注
          await supabaseAdmin
            .from('credit_logs')
            .update({
              type: 'processing_refund',
              notes: `AI去除背景处理失败退还 - 任务ID: ${tempTaskId}`
            })
            .eq('user_id', user.id)
            .eq('amount', REMOVE_BACKGROUND_CREDITS)
            .eq('type', 'one_time_purchase')
            .gte('created_at', new Date(Date.now() - 60000).toISOString()); // 1分钟内的记录
        }
      } catch (refundError) {
        console.error('❌ [REMOVE_BG_START] 退还积分异常:', refundError);
      }
    }
    
    return apiResponse.serverError('去除背景服务内部错误');
  }
}