"use client";

import { GoogleIcon } from "@/components/icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
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
  const { signInWithGoogle } = useAuth();
  const router = useRouter();

  const t = useTranslations("Login");

  const handleLoginSuccess = () => {
    onSuccess?.();
    // 对于某些登录方式（如邮箱登录），可能需要客户端跳转
    setTimeout(() => {
      router.push('/app?target=upscaler');
    }, 1000);
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


  return (
    <div className={`grid gap-6 ${className}`}>
      <Button variant="outline" onClick={handleGoogleLogin}>
        <GoogleIcon className="mr-2 h-4 w-4" />
        {t("signInMethods.signInWithGoogle")}
      </Button>
    </div>
  );
}
