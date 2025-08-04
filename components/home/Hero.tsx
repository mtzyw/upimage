'use client'

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MousePointerClick, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { LoginModal } from "@/components/auth/LoginModal";
import ImageProcessingDemo from "./ImageProcessingDemo";
import { useState } from "react";

export default function Hero() {
  const t = useTranslations("Landing.Hero");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="w-full min-h-screen">
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
                onClick={() => setIsLoginModalOpen(true)}
              >
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4" />
                  {t("getStarted", { default: "Get Started Now" })}
                </div>
              </Button>
            </div>
          </div>

          {/* Right Content - Before/After Images */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Image
                  src="/placeholder.svg?height=400&width=300"
                  alt="Before image"
                  width={300}
                  height={400}
                  className="rounded-lg object-cover w-full h-80"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-medium">Before</span>
                </div>
                <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Image
                  src="/placeholder.svg?height=400&width=300"
                  alt="After image"
                  width={300}
                  height={400}
                  className="rounded-lg object-cover w-full h-80"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-medium">After</span>
                </div>
                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Image Processing Demo Section */}
      <ImageProcessingDemo />

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}
