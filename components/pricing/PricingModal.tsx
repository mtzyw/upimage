"use client";

import { Modal } from "@/components/ui/Modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingPlan } from "@/types/pricing";
import { Gift } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PricingModalCard } from "./PricingModalCard";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import { usePricing } from "@/components/providers/PricingProvider";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'monthly' | 'annual';
}

export function PricingModal({ isOpen, onClose, defaultTab = 'annual' }: PricingModalProps) {
  const t = useTranslations("Landing.Pricing");
  const locale = useLocale();
  const { plans, isLoading, error } = usePricing();

  const monthlyPlans = plans.filter(
    (plan) =>
      plan.payment_type === "recurring" && plan.recurring_interval === "month"
  );

  const annualPlans = plans.filter(
    (plan) =>
      plan.payment_type === "recurring" && plan.recurring_interval === "year"
  );

  const renderPlans = (planList: PricingPlan[]) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-black/40 border border-gray-600 rounded-xl p-6 h-96 animate-pulse">
              <div className="h-6 bg-gray-600 rounded mb-4"></div>
              <div className="h-4 bg-gray-600 rounded mb-6 w-3/4"></div>
              <div className="h-10 bg-gray-600 rounded mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-600 rounded"></div>
                <div className="h-4 bg-gray-600 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">加载定价信息失败</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      );
    }

    if (planList.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-400">暂无可用的定价方案</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {planList.map((plan) => {
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
            <PricingModalCard
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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t("modal.title")}
      className="max-w-6xl"
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-gray-300 text-lg">
            {t("modal.description")}
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
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
        </Tabs>
      </div>
    </Modal>
  );
}