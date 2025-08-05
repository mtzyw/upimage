"use client";

import { UserBenefits } from "@/actions/usage/benefits";
import { BenefitsContext } from "@/components/providers/BenefitsProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { PricingModal } from "@/components/pricing/PricingModal";
import { Coins, Plus } from "lucide-react";
import { use, useContext, useState } from "react";

export default function HeaderCreditsDisplay() {
  const { user } = useAuth();
  const benefitsPromise = useContext(BenefitsContext);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // 只有登录用户才显示积分
  if (!user || !benefitsPromise) {
    return null;
  }

  const benefits: UserBenefits | null = use(benefitsPromise);

  if (!benefits) {
    return null;
  }

  return (
    <>
      <button 
        onClick={() => setIsPricingModalOpen(true)}
        className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-md hover:bg-yellow-500/20 transition-colors cursor-pointer"
        title="点击购买更多积分"
      >
        <Coins className="h-3.5 w-3.5 text-yellow-500" />
        <span className="text-yellow-500 text-xs font-medium">{benefits.totalAvailableCredits}</span>
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