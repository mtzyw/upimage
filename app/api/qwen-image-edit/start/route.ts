import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { generateTaskIdentifier } from '@/lib/freepik/utils';
import { getUserBenefits } from '@/actions/usage/benefits';
import { deductCredits } from '@/actions/usage/deduct';
import { serverUploadFile, getDataFromDataUrl } from '@/lib/cloudflare/r2';
import { redis } from '@/lib/upstash';
import { Client } from '@upstash/qstash';
import { fal } from '@fal-ai/client';

// 强制使用 Node.js runtime
export const runtime = 'nodejs';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const qstash = process.env.QSTASH_TOKEN ? new Client({
  token: process.env.QSTASH_TOKEN
}) : null;

// 配置 fal.ai 客户端
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  });
}

// 请求参数验证 schema
const qwenImageEditRequestSchema = z.object({
  image: z.string().min(1, 'base64 图片数据不能为空'),
  prompt: z.string().min(1, '编辑指令不能为空'),
  negative_prompt: z.string().optional(),
  num_images: z.number().min(1).max(4).optional().default(1),
  guidance_scale: z.number().min(1).max(20).optional().default(4),
  num_inference_steps: z.number().min(10).max(50).optional().default(30),
  aspectRatio: z.enum(['1:1', '3:2', '2:3']).optional().default('1:1')
});

type QwenImageEditRequest = z.infer<typeof qwenImageEditRequestSchema>;

// Qwen图像编辑固定消耗2积分
const QWEN_IMAGE_EDIT_CREDITS = 2;

/**
 * 长宽比到具体尺寸的映射
 */
function getImageDimensions(aspectRatio: '1:1' | '3:2' | '2:3'): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024 };
    case '3:2':
      return { width: 1152, height: 768 };
    case '2:3':
      return { width: 768, height: 1152 };
    default:
      return { width: 1024, height: 1024 }; // 默认方形
  }
}

/**
 * fal.ai API 调用接口
 */
interface FalApiResponse {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  url?: string;
}

/**
 * 调用 fal.ai Qwen Image Edit API (使用官方客户端)
 */
async function submitFalTask(
  imageUrl: string,
  prompt: string,
  options: {
    negative_prompt?: string;
    num_images?: number;
    guidance_scale?: number;
    num_inference_steps?: number;
    width?: number;
    height?: number;
  } = {}
): Promise<FalApiResponse> {
  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY environment variable not configured');
  }

  const webhookUrl = `${process.env.WEBHOOK_URL || process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/fal`;

  const input = {
    image_url: imageUrl,
    prompt,
    negative_prompt: options.negative_prompt,
    num_images: options.num_images || 1,
    guidance_scale: options.guidance_scale || 4,
    num_inference_steps: options.num_inference_steps || 30,
    width: options.width || 1024,
    height: options.height || 1024
  };

  console.log('🎨 [FAL_API] 调用 fal.ai Qwen Image Edit API:', {
    imageUrl,
    prompt,
    ...options,
    webhookUrl
  });
  console.log('🎨 [FAL_API] 发送的输入数据:', JSON.stringify(input, null, 2));

  try {
    // 使用 fal.ai 官方客户端提交任务到队列
    const result = await fal.queue.submit("fal-ai/qwen-image-edit", {
      input,
      webhookUrl
    });

    console.log('✅ [FAL_API] fal.ai API响应:', result);

    return {
      request_id: result.request_id,
      status: 'IN_QUEUE'
    };
  } catch (error) {
    console.error('❌ [FAL_API] fal.ai API错误:', error);
    throw new Error(`fal.ai API error: ${error}`);
  }
}

export async function POST(req: NextRequest) {
  console.log('🎨 [QWEN_EDIT_START] ===== 收到Qwen图像编辑请求 =====');
  
  let tempTaskId: string | undefined;
  let user: any = null;
  
  try {
    // 1. 用户认证
    console.log('🔐 [QWEN_EDIT_START] 步骤1: 开始用户认证验证...');
    const supabase = await createClient();
    const { data: { user: authenticatedUser }, error: authError } = await supabase.auth.getUser();
    user = authenticatedUser;

    if (authError || !user) {
      console.log('❌ [QWEN_EDIT_START] 用户认证失败，返回401');
      return apiResponse.unauthorized('用户未认证');
    }

    console.log(`✅ [QWEN_EDIT_START] 用户认证成功: ${user.id}`);

    // 2. 解析请求
    console.log('📝 [QWEN_EDIT_START] 步骤2: 解析请求...');
    const body = await req.json();
    
    const validationResult = qwenImageEditRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [QWEN_EDIT_START] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const requestData = validationResult.data;
    console.log('✅ [QWEN_EDIT_START] 参数验证成功:', {
      imageSize: requestData.image.length,
      prompt: requestData.prompt,
      aspectRatio: requestData.aspectRatio,
      numImages: requestData.num_images,
      guidanceScale: requestData.guidance_scale
    });

    // 3. 验证积分余额
    console.log('💰 [QWEN_EDIT_START] 步骤3: 验证积分余额...');
    const userBenefits = await getUserBenefits(user.id);
    
    if (!userBenefits || userBenefits.totalAvailableCredits < QWEN_IMAGE_EDIT_CREDITS) {
      const availableCredits = userBenefits?.totalAvailableCredits || 0;
      console.log('❌ [QWEN_EDIT_START] 积分余额不足');
      return apiResponse.badRequest(
        `积分余额不足。需要 ${QWEN_IMAGE_EDIT_CREDITS} 积分，当前余额 ${availableCredits} 积分`
      );
    }

    // 4. 检查并发任务限制
    console.log('📊 [QWEN_EDIT_START] 步骤4: 检查并发任务限制...');
    const { count: processingCount } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'processing');

    if (processingCount && processingCount >= 4) {
      console.log(`❌ [QWEN_EDIT_START] 用户 ${user.id} 当前有 ${processingCount} 个任务正在进行中，已达到限制`);
      return apiResponse.badRequest('当前任务队列已满，请等待之前的任务完成后再试');
    }

    console.log(`✅ [QWEN_EDIT_START] 并发检查通过，用户当前有 ${processingCount || 0} 个任务正在进行中`);

    // 5. 扣减积分
    console.log('💰 [QWEN_EDIT_START] 步骤5: 扣减用户积分...');
    tempTaskId = generateTaskIdentifier(user.id, '');
    const deductResult = await deductCredits(
      QWEN_IMAGE_EDIT_CREDITS, 
      `AI图像编辑处理 - 任务ID: ${tempTaskId}`
    );
    
    if (!deductResult.success) {
      console.log('❌ [QWEN_EDIT_START] 积分扣减失败');
      return apiResponse.error(`积分扣减失败: ${deductResult.error}`);
    }

    console.log(`✅ [QWEN_EDIT_START] 积分扣减成功，用户: ${user.id}`);

    // 6. 上传原图到R2获取公开URL
    console.log('📤 [QWEN_EDIT_START] 步骤6: 上传原图到R2...');
    const imageData = getDataFromDataUrl(requestData.image);
    if (!imageData) {
      throw new Error('Invalid base64 format');
    }

    const originalKey = `qwen-image-edit/${user.id}/${Date.now()}-original.jpg`;
    const uploadResult = await serverUploadFile({
      data: imageData.buffer,
      contentType: imageData.contentType,
      key: originalKey
    });

    const originalImageUrl = `${process.env.R2_PUBLIC_URL}/${originalKey}`;
    console.log(`✅ [QWEN_EDIT_START] 原图上传完成: ${originalImageUrl}`);

    // 7. 调用 fal.ai Qwen Image Edit API
    console.log('🎨 [QWEN_EDIT_START] 步骤7: 调用 fal.ai Qwen Image Edit API...');
    
    // 根据长宽比获取对应的尺寸
    const dimensions = getImageDimensions(requestData.aspectRatio);
    console.log(`🎨 [QWEN_EDIT_START] 长宽比 ${requestData.aspectRatio} 对应尺寸:`, dimensions);
    
    const falResponse = await submitFalTask(originalImageUrl, requestData.prompt, {
      negative_prompt: requestData.negative_prompt,
      num_images: requestData.num_images,
      guidance_scale: requestData.guidance_scale,
      num_inference_steps: requestData.num_inference_steps,
      width: dimensions.width,
      height: dimensions.height
    });

    const falRequestId = falResponse.request_id;
    if (!falRequestId) {
      console.error('❌ [QWEN_EDIT_START] fal.ai API未返回request_id:', falResponse);
      throw new Error('fal.ai API未返回request_id');
    }

    console.log(`✅ [QWEN_EDIT_START] fal.ai任务创建成功: ${falRequestId}`);
    console.log('🎨 [QWEN_EDIT_START] fal.ai API响应:', falResponse);

    // 8. 直接使用 fal.ai request_id 创建数据库记录（简化设计，无需映射）
    console.log('💾 [QWEN_EDIT_START] 步骤8: 创建任务记录...');
    
    const { error: insertError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .insert({
        id: falRequestId, // 直接使用 fal.ai request_id，无需映射复杂度
        user_id: user.id,
        status: 'processing',
        r2_original_key: originalKey,
        scale_factor: '1x', // 兼容数据库约束
        engine: 'qwen_image_edit', // 标识任务类型
        optimized_for: 'qwen_image_edit',
        api_key_id: null, // fal.ai 使用环境变量
        api_key: null,
        credits_consumed: QWEN_IMAGE_EDIT_CREDITS,
        prompt: requestData.prompt,
        // 复用现有字段存储额外参数
        creativity: requestData.guidance_scale,
        hdr: requestData.num_inference_steps,
        resemblance: requestData.num_images,
        fractality: null // 保留扩展
      });
    
    if (insertError) {
      console.error('❌ [QWEN_EDIT_START] 数据库记录创建失败:', insertError);
      throw new Error('任务创建失败');
    }

    // 8. 设置 Redis 缓存（使用 fal.ai request_id，与 Freepik 保持一致）
    if (redis) {
      console.log('💾 [QWEN_EDIT_START] 保存Redis缓存...');
      await Promise.all([
        redis.set(`task:${falRequestId}:user_id`, user.id, { ex: 3600 }),
        redis.set(`task:${falRequestId}:credits_consumed`, QWEN_IMAGE_EDIT_CREDITS, { ex: 3600 })
      ]);
      console.log('✅ [QWEN_EDIT_START] Redis缓存保存完成');
    }

    // 9. 启动轮询备份机制 (QStash)
    if (qstash) {
      console.log('🔄 [QWEN_EDIT_START] 步骤9: 启动轮询备份机制...');
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/poll-fal-task`,
        body: { 
          taskId: falRequestId, // 使用 fal.ai request_id
          requestId: falRequestId, // 相同的 ID
          userId: user.id,
          creditsConsumed: QWEN_IMAGE_EDIT_CREDITS
        },
        delay: 30 // 30秒后开始轮询
      });
      console.log(`✅ [QWEN_EDIT_START] 轮询备份任务已调度`);
    }

    // 10. 返回成功结果
    console.log('🎉 [QWEN_EDIT_START] 步骤10: 返回成功结果...');
    const response = {
      taskId: falRequestId, // 返回 fal.ai request_id，前端用此ID查询状态
      status: 'processing',
      originalUrl: originalImageUrl,
      creditsConsumed: QWEN_IMAGE_EDIT_CREDITS,
      editPrompt: requestData.prompt
    };

    console.log('🎉 [QWEN_EDIT_START] 处理完成:', response);
    console.log('🎉 [QWEN_EDIT_START] ===== Qwen图像编辑请求处理完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [QWEN_EDIT_START] ===== 处理过程中发生异常 =====');
    console.error('💥 [QWEN_EDIT_START] 错误详情:', error);
    
    // 退还积分
    if (tempTaskId && user) {
      try {
        // 使用 grant_one_time_credits_and_log 函数添加积分来实现退还
        const { error: refundError } = await supabaseAdmin.rpc('grant_one_time_credits_and_log', {
          p_user_id: user.id,
          p_credits_to_add: QWEN_IMAGE_EDIT_CREDITS,
          p_related_order_id: undefined
        });
        
        if (refundError) {
          console.error('❌ [QWEN_EDIT_START] 退还积分失败:', refundError);
        } else {
          console.log('💰 [QWEN_EDIT_START] 异常处理中退还积分成功');
          
          // 更新积分日志记录的类型和备注
          await supabaseAdmin
            .from('credit_logs')
            .update({
              type: 'processing_refund',
              notes: `AI图像编辑处理失败退还 - 任务ID: ${tempTaskId}`
            })
            .eq('user_id', user.id)
            .eq('amount', QWEN_IMAGE_EDIT_CREDITS)
            .eq('type', 'one_time_purchase')
            .gte('created_at', new Date(Date.now() - 60000).toISOString()); // 1分钟内的记录
        }
      } catch (refundError) {
        console.error('❌ [QWEN_EDIT_START] 退还积分异常:', refundError);
      }
    }
    
    return apiResponse.serverError('AI图像编辑服务内部错误');
  }
}