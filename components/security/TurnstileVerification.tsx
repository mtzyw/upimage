'use client';

import { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Shield, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TurnstileVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  reason?: string;
  suspiciousScore?: number;
}

export default function TurnstileVerification({
  isOpen,
  onClose,
  onSuccess,
  onError,
  reason,
  suspiciousScore
}: TurnstileVerificationProps) {
  const t = useTranslations('Security');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  const handleSuccess = (token: string) => {
    console.log('🛡️ [TURNSTILE] 验证成功:', token);
    setIsVerifying(true);
    
    // 模拟验证过程
    setTimeout(() => {
      onSuccess(token);
      setIsVerifying(false);
    }, 500);
  };

  const handleError = (errorCode: string) => {
    console.error('🛡️ [TURNSTILE] 验证失败:', errorCode);
    setError(errorCode);
    setIsLoading(false);
    onError?.(errorCode);
  };

  const handleLoad = () => {
    console.log('🛡️ [TURNSTILE] 组件加载完成');
    setIsLoading(false);
  };

  if (!siteKey) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              配置错误
            </DialogTitle>
          </DialogHeader>
          <div className="text-gray-300 text-sm">
            Turnstile Site Key 未配置，请检查环境变量。
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            {t('title', { default: '安全验证' })}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {reason ? (
              <div className="space-y-2">
                <p>{t('detectionReason', { default: '检测到以下情况：' })}</p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-400 text-sm">
                  {reason}
                  {suspiciousScore && (
                    <div className="mt-1 text-xs text-yellow-300">
                      {t('suspiciousScore', { 
                        score: suspiciousScore, 
                        default: '可疑评分：{score}/100' 
                      })}
                    </div>
                  )}
                </div>
                <p className="text-sm">
                  {t('verificationDescription', { 
                    default: '请完成安全验证以确认您是真实用户。这只需要几秒钟时间。' 
                  })}
                </p>
              </div>
            ) : (
              t('defaultDescription', { 
                default: '为了确保服务质量，请完成安全验证。' 
              })
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 验证状态显示 */}
          {isVerifying && (
            <div className="flex items-center justify-center gap-2 text-green-400 bg-green-500/10 rounded-lg p-4">
              <CheckCircle className="w-5 h-5" />
              <span>{t('verificationSuccess', { default: '验证成功！正在处理...' })}</span>
            </div>
          )}

          {/* Turnstile 组件 */}
          {!isVerifying && (
            <div className="flex flex-col items-center space-y-4">
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('loading', { default: '正在加载验证组件...' })}</span>
                </div>
              )}

              <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                <Turnstile
                  sitekey={siteKey}
                  onVerify={handleSuccess}
                  onError={handleError}
                  onLoad={handleLoad}
                  theme="dark"
                  size="normal"
                  retry="auto"
                />
              </div>

              {error && (
                <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-center">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  {t('errorMessage', { 
                    error, 
                    default: '验证失败：{error}' 
                  })}
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-red-400 border-red-400 hover:bg-red-500/10"
                    >
                      {t('retry', { default: '刷新重试' })}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 底部说明 */}
          <div className="text-xs text-gray-400 text-center space-y-1">
            <p>{t('privacyNotice', { default: '此验证由 Cloudflare 提供，保护您的隐私安全' })}</p>
            <p>{t('securityInfo', { default: '我们使用智能算法识别恶意行为，正常用户通常可以快速通过验证' })}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { TurnstileVerification };