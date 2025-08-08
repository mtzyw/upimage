"use client";

import { UserBenefits } from "@/actions/usage/benefits";
import { BenefitsContext } from "@/components/providers/BenefitsProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import CurrentUserBenefitsDisplay from "@/components/layout/CurrentUserBenefitsDisplay";
import { PricingModal } from "@/components/pricing/PricingModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link as I18nLink } from "@/i18n/routing";
import { createStripePortalSession } from "@/lib/stripe/actions";
import { use, useContext, useState, useEffect } from "react";
import { redirect } from "next/navigation";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const benefitsPromise = useContext(BenefitsContext);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // 只有登录用户才能访问此页面
  if (!user) {
    redirect("/login");
  }

  // 获取 benefits 数据
  const benefits: UserBenefits | null = user && benefitsPromise ? use(benefitsPromise) : null;

  if (!benefits) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Subscription</h1>
          <p className="text-slate-300">
            Loading your subscription details...
          </p>
        </div>
      </div>
    );
  }

  const isMember =
    benefits.subscriptionStatus === "active" ||
    benefits.subscriptionStatus === "trialing";
  
  // 检查订阅是否正在取消中（设置了在周期结束时取消）
  const isSubscriptionCanceling = benefits.cancelAtPeriodEnd === true;

  // 处理取消订阅确认
  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  // 执行取消订阅
  const handleConfirmCancel = async () => {
    setIsLoading(true);
    setShowCancelDialog(false);
    
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        // 刷新页面以显示更新后的订阅状态
        window.location.reload();
      } else {
        // 这里可以添加 toast 通知或其他UI反馈
        console.error('Failed to cancel subscription:', result.message);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 重新激活订阅
  const handleReactivateSubscription = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        // 刷新页面以显示更新后的订阅状态
        window.location.reload();
      } else {
        // 这里可以添加 toast 通知或其他UI反馈
        console.error('Failed to reactivate subscription:', result.message);
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Subscription</h1>
        <p className="text-slate-300">
          Manage your subscription plan and billing details.
        </p>
      </div>

      <div className="rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm p-6 space-y-4">
        {isMember ? (
          <>
            <CurrentUserBenefitsDisplay />
            
            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button 
                onClick={() => setIsPricingModalOpen(true)}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                Upgrade Plan
              </Button>
              
              {/* 根据取消状态显示不同按钮 */}
              {!isSubscriptionCanceling ? (
                <Button 
                  onClick={handleCancelClick}
                  disabled={isLoading}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  {isLoading ? "Processing..." : "Cancel Subscription"}
                </Button>
              ) : (
                <Button 
                  onClick={handleReactivateSubscription}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? "Processing..." : "Reactivate Subscription"}
                </Button>
              )}
            </div>
            
            <p className="text-xs text-slate-300">
              {isSubscriptionCanceling 
                ? "Your subscription has been cancelled and will expire at the end of the current billing period. You can still upgrade to a different plan."
                : "Upgrade your plan or cancel your subscription. Cancelling will stop future billing but preserve access until the end of the current period."
              }
            </p>
          </>
        ) : (
          <>
            <p className="text-white">You are currently not subscribed to any plan.</p>
            <Button 
              onClick={() => setIsPricingModalOpen(true)}
              className="h-11 px-6 font-medium highlight-button"
            >
              Choose Plan
            </Button>
          </>
        )}
      </div>

      {/* PricingModal */}
      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        defaultTab="annual"
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Cancel Subscription
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period, but your subscription will not renew.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="border-gray-600 text-black hover:bg-gray-800"
            >
              Keep Subscription
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Processing..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
