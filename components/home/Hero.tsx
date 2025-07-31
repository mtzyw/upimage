'use client'

import FeatureBadge from "@/components/shared/FeatureBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { MousePointerClick, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { SiDiscord } from "react-icons/si";
import { LoginModal } from "@/components/auth/LoginModal";
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
            <FeatureBadge
              label={t("badge.label")}
              text={t("badge.text")}
              href={t("badge.href")}
            />
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
              <Button
                className="h-14 rounded-lg px-8 py-2 bg-transparent text-cyan-400 hover:text-cyan-300 border-2 border-cyan-400 hover:border-cyan-300"
                variant="outline"
                asChild
              >
                <Link
                  href={
                    siteConfig.socialLinks?.discord ||
                    "https://discord.com/invite/R7bUxWKRqZ"
                  }
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  title="Join Discord"
                  prefetch={false}
                  className="flex items-center gap-2"
                >
                  <SiDiscord className="w-4 h-4" />
                  Join Discord
                </Link>
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

        {/* Features Section */}
        <div className="grid lg:grid-cols-3 gap-12 mt-24">
          {/* Feature 1 - Control Panel */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-pink-400">{t("feature1.title", { default: "Let Our Platform" })}</h3>
              <h3 className="text-2xl font-bold text-pink-400">{t("feature1.subtitle", { default: "Innovate" })}</h3>
            </div>

            <Card className="bg-black/40 border-gray-700 p-6 max-w-sm mx-auto">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{t("slider1.label", { default: "Performance" })}</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-white text-sm">9</span>
                  </div>
                  <Slider defaultValue={[90]} max={100} step={1} className="w-full" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{t("slider2.label", { default: "Scalability" })}</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-white text-sm">8</span>
                  </div>
                  <Slider defaultValue={[80]} max={100} step={1} className="w-full" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{t("slider3.label", { default: "Innovation" })}</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-white text-sm">10</span>
                  </div>
                  <Slider defaultValue={[100]} max={100} step={1} className="w-full" />
                </div>
              </div>
            </Card>
          </div>

          {/* Feature 2 - Generative AI */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-cyan-400">{t("feature2.title", { default: "Powered by" })}</h3>
              <h3 className="text-2xl font-bold text-cyan-400">{t("feature2.subtitle", { default: "Advanced AI" })}</h3>
            </div>

            <div className="relative max-w-sm mx-auto">
              <Image
                src="/placeholder.svg?height=300&width=300"
                alt="AI generated content"
                width={300}
                height={300}
                className="rounded-lg object-cover w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-red-500/20 rounded-lg"></div>
            </div>
          </div>

          {/* Feature 3 - Magic Results */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-orange-400">{t("feature3.title", { default: "Results that are" })}</h3>
              <h3 className="text-2xl font-bold text-orange-400">{t("feature3.subtitle", { default: "Simply Amazing" })}</h3>
            </div>

            <div className="max-w-sm mx-auto">
              <Image
                src="/placeholder.svg?height=300&width=300"
                alt="High quality results"
                width={300}
                height={300}
                className="rounded-lg object-cover w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}
