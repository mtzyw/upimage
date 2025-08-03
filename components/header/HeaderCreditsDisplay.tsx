"use client";

import { UserBenefits } from "@/actions/usage/benefits";
import { BenefitsContext } from "@/components/providers/BenefitsProvider";
import { Coins } from "lucide-react";
import { use, useContext } from "react";

export default function HeaderCreditsDisplay() {
  const benefitsPromise = useContext(BenefitsContext);

  if (!benefitsPromise) {
    return null;
  }

  const benefits: UserBenefits | null = use(benefitsPromise);

  if (!benefits) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-md">
      <Coins className="h-3.5 w-3.5 text-yellow-500" />
      <span className="text-yellow-500 text-xs font-medium">{benefits.totalAvailableCredits}</span>
    </div>
  );
}