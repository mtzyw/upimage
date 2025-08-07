"use client";

import { UserBenefits } from "@/actions/usage/benefits";
import { useAuth } from "@/components/providers/AuthProvider";
import { BenefitsContext } from "@/components/providers/BenefitsProvider";
import { usePricing } from "@/components/providers/PricingProvider";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE, useRouter } from "@/i18n/routing";
import { handleLogin } from "@/lib/utils";
import { PricingPlan } from "@/types/pricing";
import { CheckCircle, Loader2, MousePointerClick } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { use, useContext, useMemo, useState } from "react";
import { toast } from "sonner";

type Params = {
  plan: PricingPlan;
  localizedPlan: any;
  allowDowngrade?: boolean; // 可选参数：是否允许降级，默认为 true
};

export default function PricingCTA({ plan, localizedPlan, allowDowngrade = false }: Params) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const { showLoginDialog, user } = useAuth();
  const t = useTranslations('Pricing.buttons');
  
  // 获取用户订阅状态和所有套餐信息
  const benefitsPromise = useContext(BenefitsContext);
  const benefits: UserBenefits | null = benefitsPromise ? use(benefitsPromise) : null;
  const { plans } = usePricing();

  // 计算当前套餐的订阅状态
  const subscriptionStatus = useMemo(() => {
    if (!user || !benefits) {
      return { canPurchase: true, buttonText: localizedPlan?.button_text || plan.button_text, disabled: false };
    }

    const isCurrentlySubscribed = benefits.activePlanId === plan.id;
    const hasActiveSubscription = benefits.subscriptionStatus === 'active' || benefits.subscriptionStatus === 'trialing';

    if (isCurrentlySubscribed && hasActiveSubscription) {
      return { 
        canPurchase: false, 
        buttonText: t('subscribed'), 
        disabled: true,
        isSubscribed: true 
      };
    }

    // 如果用户有其他套餐的订阅，判断是升级、降级还是切换
    if (hasActiveSubscription && benefits.activePlanId !== plan.id) {
      const currentPlan = plans.find(p => p.id === benefits.activePlanId);
      const targetPlan = plan;

      let buttonText = t('switchToThis');
      let isUpgrade = false;

      if (currentPlan && targetPlan) {
        // 基于价格比较（如果价格存在）
        if (currentPlan.price && targetPlan.price) {
          if (targetPlan.price > currentPlan.price) {
            buttonText = t('upgradeToThis');
            isUpgrade = true;
          } else if (targetPlan.price < currentPlan.price) {
            if (!allowDowngrade) {
              return { 
                canPurchase: false, 
                buttonText: t('cannotDowngrade'), 
                disabled: true 
              };
            }
            buttonText = t('downgradeToThis');
          } else {
            buttonText = t('switchToThis');
          }
        }
        // 基于显示顺序比较（价格不存在时）
        else if (targetPlan.display_order > currentPlan.display_order) {
          buttonText = t('upgradeToThis');
          isUpgrade = true;
        } else if (targetPlan.display_order < currentPlan.display_order) {
          if (!allowDowngrade) {
            return { 
              canPurchase: false, 
              buttonText: t('cannotDowngrade'), 
              disabled: true 
            };
          }
          buttonText = t('downgradeToThis');
        }
      }

      return { 
        canPurchase: true, 
        buttonText, 
        disabled: false,
        isUpgrade 
      };
    }

    return { 
      canPurchase: true, 
      buttonText: localizedPlan?.button_text || plan.button_text, 
      disabled: false 
    };
  }, [user, benefits, plan, plans, localizedPlan?.button_text, allowDowngrade, t]);

  const handleCheckout = async (applyCoupon = true) => {
    // 检查是否允许购买
    if (!subscriptionStatus.canPurchase) {
      toast.info(t('alreadySubscribed'));
      return;
    }

    const stripePriceId = plan.stripe_price_id ?? null;
    if (!stripePriceId) {
      toast.error("Price ID is missing for this plan.");
      return;
    }

    const couponCode = plan.stripe_coupon_id;

    setIsLoading(true);
    try {
      const toltReferral = (window as any).tolt_referral;

      const requestBody: {
        priceId: string;
        couponCode?: string;
        referral?: string;
      } = {
        priceId: stripePriceId,
      };

      if (applyCoupon && couponCode) {
        requestBody.couponCode = couponCode;
      }

      if (toltReferral) {
        requestBody.referral = toltReferral;
      }

      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": (locale || DEFAULT_LOCALE) as string,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          handleLogin(router, showLoginDialog);
          toast.error("You must be logged in to purchase a plan.");
          return;
        }
        throw new Error(
          result.error || "HTTP error! status: " + response.status
        );
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to create checkout session.");
      }

      const data = result.data;

      if (data.url) {
        router.push(data.url);
        setIsLoading(false);
      } else {
        throw new Error("Checkout URL not received.");
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        asChild={!!plan.button_link}
        disabled={isLoading || subscriptionStatus.disabled}
        className={`w-full flex items-center justify-center gap-2 text-white py-5 font-medium ${
          subscriptionStatus.isSubscribed
            ? "bg-green-600 hover:bg-green-600 cursor-not-allowed"
            : subscriptionStatus.isUpgrade
            ? "bg-blue-600 hover:bg-blue-700"
            : plan.is_highlighted
            ? "highlight-button"
            : "bg-gray-800 hover:bg-gray-700"
        } ${
          plan.stripe_coupon_id && plan.enable_manual_input_coupon
            ? "mb-2"
            : "mb-6"
        }`}
        {...(!plan.button_link && !subscriptionStatus.disabled && {
          onClick: () => handleCheckout(),
        })}
      >
        {plan.button_link ? (
          <Link
            href={plan.button_link}
            title={subscriptionStatus.buttonText}
            rel="noopener noreferrer nofollow"
            target="_blank"
            prefetch={false}
          >
            {subscriptionStatus.buttonText}
            {plan.is_highlighted && <MousePointerClick className="w-5 h-5" />}
          </Link>
        ) : (
          <>
            {subscriptionStatus.isSubscribed && !isLoading && (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              subscriptionStatus.buttonText
            )}
            {plan.is_highlighted && !isLoading && !subscriptionStatus.isSubscribed && (
              <MousePointerClick className="w-5 h-5 ml-2" />
            )}
          </>
        )}
      </Button>
      {plan.stripe_coupon_id && plan.enable_manual_input_coupon && !subscriptionStatus.disabled && (
        <div className="text-center mb-2">
          <button
            onClick={() => handleCheckout(false)}
            disabled={isLoading || subscriptionStatus.disabled}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 underline underline-offset-2"
          >
            I have a different coupon code
          </button>
        </div>
      )}
    </div>
  );
}
