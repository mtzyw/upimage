"use client";

import ClientPricing from "@/components/home/ClientPricing";
import PricingFAQ from "@/components/pricing/PricingFAQ";
import { BG1 } from "@/components/shared/BGs";
import { PricingPlan } from "@/types/pricing";
import { useEffect, useState } from "react";

export default function PricingPage() {
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

  useEffect(() => {
    // 获取价格数据
    fetch('/api/pricing/public')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPricingPlans(data.data || []);
        }
      })
      .catch(err => {
        console.error('Failed to fetch pricing plans:', err);
      });
  }, []);

  return (
    <div className="w-full min-h-screen">
      <BG1 />
      <div className="relative z-10">
        {/* 价格组件 */}
        <ClientPricing initialPlans={pricingPlans} />
        
        {/* FAQ 组件 */}
        <PricingFAQ />
      </div>
    </div>
  );
}