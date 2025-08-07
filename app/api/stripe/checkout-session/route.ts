import { apiResponse } from '@/lib/api-response';
import { getErrorMessage } from '@/lib/error-utils';
import { getOrCreateStripeCustomer } from '@/lib/stripe/actions';
import stripe from '@/lib/stripe/stripe';
import { createClient } from '@/lib/supabase/server';
import { getURL } from '@/lib/utils';
import type { Stripe } from 'stripe';

type RequestData = {
  priceId: string;
  couponCode?: string;
  referral?: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('User not authenticated.');
    return apiResponse.unauthorized()
  }
  const userId = user.id;

  let requestData: RequestData;
  try {
    requestData = await req.json();
  } catch (error) {
    console.error('Invalid request body:', error);
    return apiResponse.badRequest()
  }

  const { priceId, couponCode, referral } = requestData;

  if (!priceId) {
    return apiResponse.badRequest('Missing priceId')
  }

  try {
    const customerId = await getOrCreateStripeCustomer(userId);

    // 检查用户是否有活跃的订阅，如果购买的是订阅类型，需要先取消旧订阅
    const { data: activeSub, error: activeSubError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status, plan_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSubError) {
      console.error('Error checking for active subscriptions:', activeSubError);
    }

    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('id, card_title, payment_type, trial_period_days, benefits_jsonb, stripe_product_id')
      .eq('stripe_price_id', priceId)
      .single();

    if (planError || !plan) {
      console.error(`Plan not found for priceId ${priceId}:`, planError);
      return apiResponse.notFound('Plan not found');
    }

    const isSubscription = plan.payment_type === 'recurring';
    const mode = isSubscription ? 'subscription' : 'payment';

    // 如果是订阅类型且用户已有活跃订阅，先取消旧订阅（避免同时有多个活跃订阅）
    if (isSubscription && activeSub && activeSub.stripe_subscription_id) {
      console.log(`用户 ${userId} 已有活跃订阅 ${activeSub.stripe_subscription_id}，准备升级到新套餐 ${plan.id}`);
      
      if (!stripe) {
        console.error('Stripe is not initialized. Cannot cancel old subscription.');
        return apiResponse.serverError('Stripe is not initialized. Please check your environment variables.');
      }
      
      try {
        // 立即取消旧订阅（不等到账单周期结束）
        const canceledSubscription = await stripe.subscriptions.cancel(activeSub.stripe_subscription_id, {
          prorate: false // 不按比例退款
        });
        console.log(`成功取消旧订阅 ${activeSub.stripe_subscription_id}，状态: ${canceledSubscription.status}`);
      } catch (cancelError) {
        console.error(`取消旧订阅失败 ${activeSub.stripe_subscription_id}:`, cancelError);
        // 如果取消失败，仍继续创建新订阅，因为用户可能通过Stripe portal手动取消了
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: getURL('payment/success?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: getURL(process.env.NEXT_PUBLIC_PRICING_PATH!),
      // payment_method_types: ["wechat_pay", "alipay", "card"],
      // payment_method_options: {
      //   wechat_pay: {
      //     client: "web",
      //   },
      //   alipay: {},
      // },
      metadata: {
        userId: userId,
        planId: plan.id,
        planName: plan.card_title,
        priceId: priceId,
        ...(referral && { tolt_referral: referral }),
      },
    };

    if (couponCode) {
      sessionParams.discounts = [{ coupon: couponCode }];
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    if (isSubscription) {
      sessionParams.subscription_data = {
        trial_period_days: plan.trial_period_days ?? undefined,
        metadata: {
          userId: userId,
          planId: plan.id,
          planName: plan.card_title,
          priceId: priceId,
        },
      };
    } else {
      sessionParams.payment_intent_data = {
        metadata: {
          userId: userId,
          planId: plan.id,
          planName: plan.card_title,
          priceId: priceId,
        },
      };
    }

    if (!stripe) {
      return apiResponse.serverError('Stripe is not initialized. Please check your environment variables.');
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url && !session.id) {
      console.error('Stripe session creation failed: No URL or ID returned.');
      return apiResponse.serverError('Error creating checkout session');
    }
    return apiResponse.success({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('Error creating Stripe Checkout Session:', error);
    const errorMessage = getErrorMessage(error);
    return apiResponse.serverError(errorMessage)
  }
} 