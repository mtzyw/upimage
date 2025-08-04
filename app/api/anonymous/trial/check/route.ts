import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 请求参数验证
const checkTrialSchema = z.object({
  browserFingerprint: z.string().min(8, '浏览器指纹无效')
});

/**
 * 检查匿名用户试用资格
 * POST /api/anonymous/trial/check
 */
export async function POST(req: NextRequest) {
  console.log('🔍 [ANONYMOUS TRIAL CHECK] ===== 检查试用资格 =====');
  
  try {
    // 1. 解析请求参数
    const body = await req.json();
    console.log('📝 [ANONYMOUS TRIAL CHECK] 请求参数:', { 
      hasBrowserFingerprint: !!body.browserFingerprint,
      fingerprintLength: body.browserFingerprint?.length || 0
    });

    // 2. 验证参数
    const validationResult = checkTrialSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [ANONYMOUS TRIAL CHECK] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { browserFingerprint } = validationResult.data;
    console.log('✅ [ANONYMOUS TRIAL CHECK] 参数验证成功:', { browserFingerprint });

    // 3. 调用数据库函数检查试用资格
    console.log('🔍 [ANONYMOUS TRIAL CHECK] 调用数据库函数检查试用资格...');
    const { data: eligibilityResult, error: eligibilityError } = await supabaseAdmin
      .rpc('check_anonymous_trial_eligibility', {
        p_browser_fingerprint: browserFingerprint
      });

    if (eligibilityError) {
      console.error('❌ [ANONYMOUS TRIAL CHECK] 数据库查询失败:', eligibilityError);
      return apiResponse.error('检查试用资格失败，请重试');
    }

    console.log('✅ [ANONYMOUS TRIAL CHECK] 试用资格检查结果:', eligibilityResult);

    // 4. 返回结果
    const response = {
      eligible: eligibilityResult.eligible,
      reason: eligibilityResult.reason,
      message: eligibilityResult.message
    };

    console.log('🎉 [ANONYMOUS TRIAL CHECK] 返回结果:', response);
    console.log('🎉 [ANONYMOUS TRIAL CHECK] ===== 试用资格检查完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [ANONYMOUS TRIAL CHECK] ===== 检查过程中发生异常 =====');
    console.error('💥 [ANONYMOUS TRIAL CHECK] 错误详情:', error);
    console.error('💥 [ANONYMOUS TRIAL CHECK] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    
    return apiResponse.serverError('试用资格检查服务内部错误');
  }
}