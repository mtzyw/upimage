"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { BenefitsContext } from "@/components/providers/BenefitsProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BG1 } from "@/components/shared/BGs";
import { CreditCard, History, Settings, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { use, useContext } from "react";
import { UserBenefits } from "@/actions/usage/benefits";

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations();
  const benefitsPromise = useContext(BenefitsContext);
  const benefits: UserBenefits | null = benefitsPromise ? use(benefitsPromise) : null;

  const quickActions = [
    {
      title: "图像增强",
      description: "AI 驱动的图像放大和增强",
      icon: Zap,
      href: "/upscaler",
      color: "text-pink-400",
      bgColor: "bg-pink-400/10 border-pink-400/20"
    },
    {
      title: "去除背景",
      description: "AI 自动去除图片背景",
      icon: Zap,
      href: "/quitarfondo",
      color: "text-purple-400",
      bgColor: "bg-purple-400/10 border-purple-400/20"
    },
    {
      title: "订阅管理",
      description: "管理您的订阅和计费",
      icon: CreditCard,
      href: "/dashboard/subscription",
      color: "text-cyan-400",
      bgColor: "bg-cyan-400/10 border-cyan-400/20"
    },
    {
      title: "积分历史",
      description: "查看积分使用记录",
      icon: History,
      href: "/dashboard/credit-history",
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10 border-yellow-400/20"
    },
    {
      title: "账户设置",
      description: "管理个人资料和偏好",
      icon: Settings,
      href: "/dashboard/settings",
      color: "text-purple-400",
      bgColor: "bg-purple-400/10 border-purple-400/20"
    }
  ];

  return (
    <div className="min-h-screen">
      <BG1 />
      
      <div className="container mx-auto px-6 py-16">
        {/* 欢迎标题 */}
        <div className="space-y-8 mb-12">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-white">欢迎回来，</span>
              <br />
              <span className="text-pink-400">{user?.email?.split('@')[0] || '用户'}</span>
              <span className="text-white"> ✨</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl">
              在您的专属仪表板中管理账户、订阅和使用情况
            </p>
          </div>
          
          {/* 账户状态卡片 */}
          {benefits && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  账户状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/20">
                    <div className="text-2xl font-bold text-cyan-400">
                      {benefits.totalAvailableCredits || 0}
                    </div>
                    <div className="text-sm text-slate-300">可用积分</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-pink-400/10 border border-pink-400/20">
                    <div className="text-2xl font-bold text-pink-400">
                      {benefits.subscriptionCreditsBalance || 0}
                    </div>
                    <div className="text-sm text-slate-300">订阅积分</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                    <div className="text-2xl font-bold text-yellow-400">
                      {benefits.oneTimeCreditsBalance || 0}
                    </div>
                    <div className="text-sm text-slate-300">一次性积分</div>
                  </div>
                </div>
                
                {benefits.subscriptionStatus && (
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div>
                      <div className="text-white font-medium">订阅状态</div>
                      <div className="text-sm text-slate-300">
                        {benefits.subscriptionStatus === 'active' ? '活跃' : 
                         benefits.subscriptionStatus === 'trialing' ? '试用中' : '未订阅'}
                      </div>
                    </div>
                    <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <Link href="/dashboard/subscription">
                        管理订阅
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 快捷操作 */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">快捷操作</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Card key={index} className={`${action.bgColor} border hover:scale-105 transition-transform cursor-pointer`}>
                    <CardHeader className="pb-2">
                      <Icon className={`w-8 h-8 ${action.color}`} />
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-white text-lg mb-2">
                        {action.title}
                      </CardTitle>
                      <CardDescription className="text-slate-300 mb-4">
                        {action.description}
                      </CardDescription>
                      <Button asChild className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20">
                        <Link href={action.href}>
                          前往
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}