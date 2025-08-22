"use client";

import { useTranslations } from "next-intl";

interface FAQItem {
  question: string;
  answer: string;
}

const PricingFAQ = () => {
  const t = useTranslations("Landing.PricingFAQ");
  const faqItems: FAQItem[] = t.raw("items");

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 hover:bg-white/15"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  {item.question}
                </h3>
                <p className="text-white/80 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingFAQ;