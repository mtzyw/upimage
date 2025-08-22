"use client";

import FAQ from "@/components/home/FAQ";
import FeaturesCards from "@/components/home/FeaturesCards";
import FinalCTA from "@/components/home/FinalCTA";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import ProductAdvantages from "@/components/home/ProductAdvantages";
import Testimonials from "@/components/home/Testimonials";
import UserStats from "@/components/home/UserStats";
import { BG1 } from "@/components/shared/BGs";

export default function ClientHomeComponent() {
  return (
    <div className="w-full">
      <BG1 />
      <Hero />
      <HowItWorks />
      <FeaturesCards />
      <ProductAdvantages />
      <UserStats />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </div>
  );
}