/**
 * Cloudflare Turnstile 验证工具
 * 用于服务端验证 Turnstile token
 */

export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[];
  challengeTs?: string;
  hostname?: string;
}

/**
 * 验证 Turnstile token
 * @param token Turnstile token
 * @param userIP 用户IP地址（可选）
 * @returns 验证结果
 */
export async function verifyTurnstileToken(
  token: string, 
  userIP?: string
): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('❌ [TURNSTILE] Secret key not configured');
    throw new Error('Turnstile secret key not configured');
  }

  // 如果token是我们的虚拟绕过token，直接返回成功
  if (token === 'trusted_user_bypass') {
    console.log('✅ [TURNSTILE] 智能检测通过，绕过验证');
    return {
      success: true,
      challengeTs: new Date().toISOString(),
      hostname: 'bypass'
    };
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (userIP) {
    formData.append('remoteip', userIP);
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('❌ [TURNSTILE] Verification request failed:', response.status);
      return { success: false, errorCodes: ['request-failed'] };
    }

    const result = await response.json() as TurnstileVerificationResult;
    
    if (result.success) {
      console.log('✅ [TURNSTILE] Token verification successful');
    } else {
      console.log('❌ [TURNSTILE] Token verification failed:', result.errorCodes);
    }

    return result;
  } catch (error) {
    console.error('❌ [TURNSTILE] Verification error:', error);
    return { success: false, errorCodes: ['network-error'] };
  }
}

/**
 * 从请求中提取用户IP地址
 * @param request Next.js request object
 * @returns 用户IP地址
 */
export function extractUserIP(request: Request): string | undefined {
  // 尝试从多个头部获取真实IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return undefined;
}