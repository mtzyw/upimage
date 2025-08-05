'use client'

import { Button } from "@/components/ui/button";
import { MousePointerClick } from "lucide-react";
import { useTranslations } from "next-intl";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/providers/AuthProvider";
import ImageProcessingDemo from "./ImageProcessingDemo";
import ImageComparisonSlider from "@/components/workspace/ImageComparisonSlider";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Hero() {
  const t = useTranslations("Landing.Hero");
  const { user } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const router = useRouter();

  const handleGetStartedClick = () => {
    if (user) {
      // 已登录用户直接跳转到首页
      router.push('/home');
    } else {
      // 未登录用户打开登录模态框
      setIsLoginModalOpen(true);
    }
  };

  return (
    <div className={`w-full ${!user ? 'min-h-screen' : ''}`}>
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-white">{t("title.part1", { default: "The " })}</span>
                <span className="text-pink-400">{t("title.part2", { default: "Next-Gen" })}</span>
                <span className="text-white">,</span>
                <br />
                <span className="text-cyan-400">{t("title.part3", { default: "SaaS" })}</span>
                <span className="text-white"> & </span>
                <span className="text-pink-400">{t("title.part4", { default: "AI Platform" })}</span>
                <br />
                <span className="text-white">{t("title.part5", { default: "that feels like " })}</span>
                <span className="text-yellow-400">{t("title.part6", { default: "Magic" })}</span>
                <span className="text-white"> ✨</span>
              </h1>

              <p className="text-gray-300 text-lg max-w-lg leading-relaxed">
                {t("description", { default: "The most advanced AI tech to achieve insanely high-performance solutions. Not only build, scale, and deploy! Our platform can reimagine as many possibilities as you wish guided by your vision and parameters!" })}
              </p>
            </div>

            <div className="flex flex-row gap-4">
              <Button 
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-6 text-lg rounded-lg"
                onClick={handleGetStartedClick}
              >
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4" />
                  {user ? t("goToWorkspace", { default: "Go to Workspace" }) : t("getStarted", { default: "Get Started Now" })}
                </div>
              </Button>
            </div>
          </div>

          {/* Right Content - Interactive Before/After Comparison */}
          <div className="space-y-6">
            <ImageComparisonSlider
              beforeImage="https://cdn.imgenhancer.ai/enhance/aefcdaf3-2a8c-4dd7-b17e-8f008f5f376c/1754382753378-6cf9cd67-9a33-40b0-b4c7-a2940859c76c.jpg"
              afterImage="https://cdn.imgenhancer.ai/users/anonymous/image-enhancements/optimized-0b862ff0-4512-4aca-8803-b1e81cd801c2.png"
              beforeLabel="Before"
              afterLabel="After"
              className="max-w-lg mx-auto"
              aspectRatio={1}
              initialPosition={50}
            />
          </div>
        </div>

      </div>

      {/* Image Processing Demo Section - 仅对匿名用户显示 */}
      {!user && <ImageProcessingDemo />}

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}
