"use client";

import FAQ from "@/components/home/FAQ";
import Hero from "@/components/home/Hero";
import Testimonials from "@/components/home/Testimonials";
import { BG1 } from "@/components/shared/BGs";

export default function ClientHomeComponent() {
  return (
    <div className="w-full">
      <BG1 />
      <Hero />
      <Testimonials />
      <FAQ />
    </div>
  );
}