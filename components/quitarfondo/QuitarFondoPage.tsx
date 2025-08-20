'use client'

import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { BG1 } from "@/components/shared/BGs";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import CallToAction from "./CallToAction";
import FeaturesShowcase from "./FeaturesShowcase";
import HowItWorks from "./HowItWorks";
import ImageUploadArea from "./ImageUploadArea";
import BackgroundRemovalHistory from "./BackgroundRemovalHistory";

export default function QuitarFondoPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleRemoveBackground = () => {
    if (user) {
      // 用户已登录，执行背景移除逻辑
      console.log('执行背景移除...');
      // 这里可以添加实际的背景移除API调用
    } else {
      // 用户未登录，显示登录弹窗
      setIsLoginModalOpen(true);
    }
  };

  return (
    <div className="w-full">
      <BG1 />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-6 mb-12">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-white">智能 </span>
              <span className="text-pink-400">抠图</span>
              <br />
              <span className="text-cyan-400">AI去背景</span>
              <span className="text-white"> 秒级 </span>
              <span className="text-yellow-400">处理</span>
              <span className="text-white"> ✨</span>
            </h1>

            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
              使用我们的先进AI技术，以专业级精度去除任何图片的背景。
              完美适用于产品照片、人像摄影和商业内容。
            </p>
          </div>

        </div>

        {/* Upload Area with Side-by-Side Layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Upload Area */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">上传图片</h3>
              <p className="text-gray-400">上传您的图片以移除背景</p>
            </div>

            <ImageUploadArea
              onImageUpload={setUploadedImage}
              uploadedImage={uploadedImage}
            />

            {/* Process Button */}
            <div className="w-full">
              <Button
                onClick={handleRemoveBackground}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <div className="flex items-center justify-center gap-3">
                  <Zap className="w-6 h-6" />
                  移除背景
                </div>
              </Button>
            </div>
          </div>

          {/* Right Side - Demo Image or History */}
          <div className="space-y-6 mt-12">
            {user ? (
              // 已登录用户显示历史记录
              <BackgroundRemovalHistory />
            ) : (
              // 未登录用户显示示例图片
              <div className="rounded-xl overflow-hidden bg-gray-800 border border-gray-600 shadow-lg">
                <div className="relative aspect-[4/3]">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=400&fit=crop&crop=face"
                    alt="Demo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Showcase */}
      <FeaturesShowcase />

      {/* How It Works */}
      <HowItWorks />

      {/* Call to Action */}
      <CallToAction />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        redirectTo={pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')}
      />
    </div>
  );
}