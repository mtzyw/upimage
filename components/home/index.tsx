import FAQ from "@/components/home/FAQ";
import Hero from "@/components/home/Hero";
import Pricing from "@/components/home/Pricing";
import Testimonials from "@/components/home/Testimonials";
import { BG1 } from "@/components/shared/BGs";
import { getMessages } from "next-intl/server";

export default async function HomeComponent() {
  const messages = await getMessages();

  return (
    <div className="w-full">
      <BG1 />

      {messages.Landing.Hero && <Hero />}

      {messages.Landing.Pricing && <Pricing />}

      {messages.Landing.Testimonials && <Testimonials />}

      {messages.Landing.FAQ && <FAQ />}
    </div>
  );
}
