"use client";

import { UserBenefits } from "@/actions/usage/benefits";
import { BenefitsContext } from "@/components/providers/BenefitsProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { PricingModal } from "@/components/pricing/PricingModal";
import { Coins, Plus } from "lucide-react";
import { use, useContext, useState, useEffect } from "react";

export default function HeaderCreditsDisplay() {
  const { user } = useAuth();
  const benefitsPromise = useContext(BenefitsContext);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);

  // 获取 benefits 数据（如果存在的话）
  const benefits: UserBenefits | null = user && benefitsPromise ? use(benefitsPromise) : null;

  // 初始化积分显示
  useEffect(() => {
    if (benefits) {
      setCurrentCredits(benefits.totalAvailableCredits);
    }
  }, [benefits]);

  // 监听积分更新事件
  useEffect(() => {
    // 只有用户存在时才添加事件监听器
    if (!user) return;

    const handleCreditsUpdate = async () => {
      try {
        const response = await fetch('/api/user/benefits');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.totalAvailableCredits !== undefined) {
            setCurrentCredits(data.data.totalAvailableCredits);
          }
        }
      } catch (error) {
        console.error('刷新积分数据失败:', error);
      }
    };

    window.addEventListener('credits-updated', handleCreditsUpdate);
    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdate);
    };
  }, [user]);

  // 只有登录用户且有 benefits 数据才显示积分
  if (!user || !benefitsPromise || !benefits) {
    return null;
  }

  // 使用当前积分状态，如果没有则使用初始的benefits数据
  const displayCredits = currentCredits !== null ? currentCredits : benefits.totalAvailableCredits;

  return (
    <>
      <button 
        onClick={() => setIsPricingModalOpen(true)}
        className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-md hover:bg-yellow-500/20 transition-colors cursor-pointer"
        title="点击购买更多积分"
      >
        <Coins className="h-3.5 w-3.5 text-yellow-500" />
        <span className="text-yellow-500 text-xs font-medium">{displayCredits}</span>
        <Plus className="h-3 w-3 text-yellow-500" />
      </button>

      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        defaultTab="annual"
      />
    </>
  );
}