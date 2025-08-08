import { cancelSubscriptionAtPeriodEnd } from '@/lib/stripe/actions';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 验证用户认证
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: '用户未认证' },
        { status: 401 }
      );
    }

    // 调用取消订阅函数
    const result = await cancelSubscriptionAtPeriodEnd(user.id);
    
    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });
    
  } catch (error) {
    console.error('Error in cancel subscription API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '服务器内部错误' 
      },
      { status: 500 }
    );
  }
}