"use client";

import { PricingCardDisplay } from "@/components/home/PricingCardDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import { PricingPlan } from "@/types/pricing";
import { Gift } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";

interface ClientPricingProps {
  initialPlans?: PricingPlan[];
}

export default function ClientPricing({ initialPlans = [] }: ClientPricingProps) {
  const t = useTranslations("Landing.Pricing");
  const locale = useLocale();
  const [allPlans, setAllPlans] = useState<PricingPlan[]>(initialPlans);

  // 如果没有初始数据，从 API 获取
  useEffect(() => {
    if (allPlans.length === 0) {
      // 这里应该调用客户端 API 获取数据
      // 但为了简化，我们暂时使用空数组
      // 实际生产中应该有一个客户端 API 端点
      fetch('/api/pricing/public')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAllPlans(data.data || []);
          }
        })
        .catch(err => {
          console.error('Failed to fetch pricing plans:', err);
        });
    }
  }, [allPlans.length]);

  const annualPlans = allPlans.filter(
    (plan) =>
      plan.payment_type === "recurring" && plan.recurring_interval === "year"
  );

  const monthlyPlans = allPlans.filter(
    (plan) =>
      plan.payment_type === "recurring" && plan.recurring_interval === "month"
  );

  const oneTimePlans = allPlans.filter(
    (plan) => plan.payment_type === "one_time"
  );

  const renderPlans = (plans: PricingPlan[]) => {
    return (
      <div
        className={`grid gap-8 justify-center ${
          plans.length === 1
            ? "grid-cols-1 max-w-sm mx-auto"
            : plans.length === 2
            ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto"
            : "grid-cols-1 lg:grid-cols-3 max-w-7xl mx-auto"
        }`}
      >
        {plans.map((plan) => {
          const localizedPlan =
            plan.lang_jsonb?.[locale] || plan.lang_jsonb?.[DEFAULT_LOCALE];

          if (!localizedPlan) {
            console.warn(
              `Missing localization for locale '${
                locale || DEFAULT_LOCALE
              }' for plan ID ${plan.id}`
            );
            return null;
          }

          return (
            <PricingCardDisplay
              id={plan.is_highlighted ? "highlight-card" : undefined}
              key={plan.id}
              plan={plan}
              localizedPlan={localizedPlan}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section id="pricing" className="py-20 bg-slate-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-center z-10 text-3xl md:text-5xl font-bold mb-4">
            <span className="text-white">
              {t("title")}
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t("description")}
          </p>
        </div>

        <Tabs defaultValue="annual" className="w-full mx-auto">
          <TabsList className="grid w-fit mx-auto grid-cols-2 h-12 p-1 bg-black/40 border border-gray-600 rounded-lg">
            {monthlyPlans.length > 0 && (
              <TabsTrigger
                value="monthly"
                className="px-6 py-2 text-sm font-normal rounded-md data-[state=active]:bg-pink-500 data-[state=active]:shadow-sm text-gray-300 data-[state=active]:text-white"
              >
                {t("monthly")}
              </TabsTrigger>
            )}
            {annualPlans.length > 0 && (
              <TabsTrigger
                value="annual"
                className="px-6 py-2 text-sm font-normal rounded-md data-[state=active]:bg-pink-500 data-[state=active]:shadow-sm text-gray-300 data-[state=active]:text-white relative"
              >
                <span className="flex items-center gap-2">
                  {t("annual")}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold">
                    <Gift className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400">{t("saveTip")}</span>
                  </span>
                </span>
              </TabsTrigger>
            )}
            {oneTimePlans.length > 0 && (
              <TabsTrigger
                value="one_time"
                className="px-6 py-2 text-sm font-normal rounded-md data-[state=active]:bg-pink-500 data-[state=active]:shadow-sm text-gray-300 data-[state=active]:text-white"
              >
                {t("onetime")}
              </TabsTrigger>
            )}
          </TabsList>
          {monthlyPlans.length > 0 && (
            <TabsContent value="monthly" className="mt-8">
              {renderPlans(monthlyPlans)}
            </TabsContent>
          )}
          {annualPlans.length > 0 && (
            <TabsContent value="annual" className="mt-8">
              {renderPlans(annualPlans)}
            </TabsContent>
          )}
          {oneTimePlans.length > 0 && (
            <TabsContent value="one_time" className="mt-8">
              {renderPlans(oneTimePlans)}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </section>
  );
}