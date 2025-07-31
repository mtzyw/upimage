"use client";

import { GoogleIcon } from "@/components/icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@marsidev/react-turnstile";
import { Github, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export default function LoginForm({
  onSuccess,
  className = "",
}: LoginFormProps) {
  const { signInWithGoogle, signInWithGithub, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const router = useRouter();

  const t = useTranslations("Login");

  const handleLoginSuccess = () => {
    onSuccess?.();
    // 对于某些登录方式（如邮箱登录），可能需要客户端跳转
    setTimeout(() => {
      router.push('/home');
    }, 1000);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signInWithEmail(email, captchaToken);
      if (error) throw error;
      toast.success(t("Toast.Email.successTitle"), {
        description: t("Toast.Email.successDescription"),
      });
      handleLoginSuccess();
    } catch (error) {
      toast.error(t("Toast.Email.errorTitle"), {
        description: t("Toast.Email.errorDescription"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      handleLoginSuccess();
    } catch (error) {
      toast.error(t("Toast.Google.errorTitle"), {
        description: t("Toast.Google.errorDescription"),
      });
    }
  };

  const handleGithubLogin = async () => {
    try {
      const { error } = await signInWithGithub();
      if (error) throw error;
      handleLoginSuccess();
    } catch (error) {
      toast.error(t("Toast.Github.errorTitle"), {
        description: t("Toast.Github.errorDescription"),
      });
    }
  };

  return (
    <div className={`grid gap-6 ${className}`}>
      <div className="grid gap-4">
        <Button variant="outline" onClick={handleGoogleLogin}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          {t("signInMethods.signInWithGoogle")}
        </Button>
        <Button variant="outline" onClick={handleGithubLogin}>
          <Github className="mr-2 h-4 w-4" />
          {t("signInMethods.signInWithGithub")}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("signInMethods.or")}
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailLogin}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                }}
              />
            )}
          </div>
          <Button disabled={isLoading}>
            {t("signInMethods.signInWithEmail")}
            {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
