import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const returnTo = searchParams.get('return_to') ?? '/';

  console.log('🔧 [RestoreSession] Attempting to restore session for user:', userId);

  if (!userId) {
    console.log('🔧 [RestoreSession] No user_id provided, redirecting to home');
    return NextResponse.redirect(`${origin}${returnTo}`);
  }

  try {
    const supabase = await createClient();
    
    // 验证用户存在
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.log('🔧 [RestoreSession] User not found:', userError);
      return NextResponse.redirect(`${origin}${returnTo}`);
    }

    console.log('🔧 [RestoreSession] User found, attempting to restore session for:', userData.email);

    // 这里我们不能直接恢复 session，但可以重定向到登录页面，并附带信息
    const redirectUrl = `${origin}/login?message=session_expired&return_to=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('🔧 [RestoreSession] Error:', error);
    return NextResponse.redirect(`${origin}${returnTo}`);
  }
}