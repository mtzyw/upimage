"use client";

import FAQ from "@/components/home/FAQ";
import Hero from "@/components/home/Hero";
import ClientPricing from "@/components/home/ClientPricing";
import Testimonials from "@/components/home/Testimonials";
import { BG1 } from "@/components/shared/BGs";
import { PricingPlan } from "@/types/pricing";
import { useEffect, useState } from "react";

export default function ClientHomeComponent() {
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
    <div className="w-full">
      <BG1 />
      <Hero />
      <ClientPricing initialPlans={pricingPlans} />
      <Testimonials />
      <FAQ />
    </div>
  );
}