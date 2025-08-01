import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { getUserBenefits } from '@/actions/usage/benefits';

export async function GET(request: NextRequest) {
  console.log('🔍 [USER BENEFITS] ===== 获取用户权益信息 =====');
  
  try {
    // 验证用户身份
    console.log('🔐 [USER BENEFITS] 验证用户身份...');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('🔐 [USER BENEFITS] 用户认证结果:', { 
      userId: user?.id, 
      userEmail: user?.email,
      hasError: !!authError 
    });

    if (authError || !user) {
      console.log('❌ [USER BENEFITS] 用户身份验证失败');
      return apiResponse.unauthorized('用户未认证');
    }

    // 获取用户权益信息
    console.log('📊 [USER BENEFITS] 获取用户权益信息...');
    const benefits = await getUserBenefits(user.id);
    
    console.log('📊 [USER BENEFITS] 权益信息:', benefits);

    if (!benefits) {
      console.log('❌ [USER BENEFITS] 无法获取用户权益信息');
      return apiResponse.error('无法获取用户权益信息');
    }

    // 构建响应数据
    const responseData = {
      credits: benefits.totalAvailableCredits || 0,
      isPro: benefits.isPro || false,
      maxUploadSize: benefits.isPro ? 50 : 10, // Pro用户50MB，普通用户10MB
      dailyLimit: benefits.isPro ? 100 : 10,   // Pro用户100次/天，普通用户10次/天
      dailyUsed: 0 // TODO: 实现每日使用统计
    };

    console.log('✅ [USER BENEFITS] 响应数据:', responseData);
    console.log('✅ [USER BENEFITS] ===== 获取用户权益信息完成 =====');

    return apiResponse.success(responseData);

  } catch (error) {
    console.error('💥 [USER BENEFITS] ===== 获取用户权益信息异常 =====');
    console.error('💥 [USER BENEFITS] 错误详情:', error);
    return apiResponse.serverError('获取用户权益信息失败');
  }
}