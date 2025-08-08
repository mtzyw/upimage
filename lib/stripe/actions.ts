'use server';

import { InvoicePaymentFailedEmail } from '@/emails/invoice-payment-failed';
import { getErrorMessage } from '@/lib/error-utils';
import resend from '@/lib/resend';
import stripe from '@/lib/stripe/stripe';
import { createClient } from '@/lib/supabase/server';
import { TablesInsert } from '@/lib/supabase/types';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getOrCreateStripeCustomer(
  userId: string
): Promise<string> {
  const supabase = await createClient();

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    throw new Error(`Could not fetch user profile for ${userId}`);
  }

  if (!stripe) {
    console.error('Stripe is not initialized. Please check your environment variables.');
    throw new Error(`Stripe is not initialized. Please check your environment variables.`);
  }

  if (userProfile?.stripe_customer_id) {
    const customer = await stripe.customers.retrieve(userProfile.stripe_customer_id);
    if (customer && !customer.deleted) {
      return userProfile.stripe_customer_id;
    }
  }

  const userEmail = userProfile?.email
  if (!userEmail) {
    throw new Error(`Could not retrieve email for user ${userId}`);
  }

  try {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        userId: userId,
      },
    });

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user profile with Stripe customer ID:', updateError);
      // cleanup in Stripe if this fails critically
      await stripe.customers.del(customer.id);
      throw new Error(`Failed to update user ${userId} with Stripe customer ID ${customer.id}`);
    }

    return customer.id;

  } catch (error) {
    console.error('Error creating Stripe customer or updating Supabase:', error);
    const errorMessage = getErrorMessage(error);
    throw new Error(`Stripe customer creation/update failed: ${errorMessage}`);
  }
}

export async function createStripePortalSession(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let portalUrl: string | null = null;
  try {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      throw new Error(`Could not find Stripe customer ID: ${profileError?.message || 'No profile found'}`);
    }
    const customerId = profile.stripe_customer_id;

    const headersList = await headers();
    const domain = headersList.get('x-forwarded-host') || headersList.get('host') || process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '');
    const protocol = headersList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    if (!domain) throw new Error("Could not determine domain for return URL.");
    const returnUrl = `${protocol}://${domain}/${process.env.STRIPE_CUSTOMER_PORTAL_URL}`;

    if (!stripe) {
      console.error('Stripe is not initialized. Please check your environment variables.');
      throw new Error(`Stripe is not initialized. Please check your environment variables.`);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!portalSession.url) {
      throw new Error('Failed to create Stripe portal session (URL missing).');
    }
    portalUrl = portalSession.url;

  } catch (error) {
    console.error('Error preparing Stripe portal session:', error);
    const errorMessage = getErrorMessage(error);
    redirect(`/stripe-error?message=Failed to open subscription management: ${encodeURIComponent(errorMessage)}`);
  }

  if (portalUrl) {
    redirect(portalUrl);
  } else {
    redirect(`/stripe-error?message=Failed to get portal URL after creation attempt.`);
  }
}

/**
 * Fetches the latest subscription data from Stripe and updates/creates the corresponding
 * record in the public.orders table to represent the subscription's state.
 *
 * @param subscriptionId The Stripe Subscription ID (sub_...).
 * @param customerId The Stripe Customer ID (cus_...). Used for logging/context.
 * @param initialMetadata Optional metadata from checkout session for initial sync.
 */
export async function syncSubscriptionData(
  subscriptionId: string,
  customerId: string,
  initialMetadata?: Record<string, any>
): Promise<void> {
  try {
    if (!stripe) {
      console.error('Stripe is not initialized. Please check your environment variables.');
      throw new Error(`Stripe is not initialized. Please check your environment variables.`);
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'customer']
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found in Stripe.`);
    }
    if (subscription.items.data.length === 0 || !subscription.items.data[0].price) {
      throw new Error(`Subscription ${subscriptionId} is missing line items or price data.`);
    }

    let userId = subscription.metadata?.userId;
    let planId = subscription.metadata?.planId;

    if (!userId && initialMetadata?.userId) {
      userId = initialMetadata.userId;
    }
    if (!planId && initialMetadata?.planId) {
      planId = initialMetadata.planId;
    }

    if (!userId && customerId) {
      try {
        const customer = subscription.customer as Stripe.Customer;

        if (customer && !customer.deleted) {
          userId = customer.metadata?.userId;
        } else {
          console.warn(`Stripe customer ${customerId} is deleted or not found.`);
        }
      } catch (customerError) {
        console.error(`Error fetching Stripe customer ${customerId}:`, customerError);
      }
    }

    if (!userId) {
      console.warn(`User ID still missing for sub ${subscriptionId}. Trying DB lookup via customer ID ${customerId}.`);
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profileError || !userProfile) {
        console.error(`DB lookup failed for customer ${customerId}:`, profileError);
        throw new Error(`Cannot determine Supabase userId for subscription ${subscriptionId}. Critical metadata missing and DB lookup failed.`);
      }
      userId = userProfile.id;
    }
    if (!planId) {
      const priceId = subscription.items.data[0].price.id;
      console.warn(`Plan ID is missing for subscription ${subscriptionId}. Attempting lookup via price ${priceId}.`);
      const { data: planData, error: planError } = await supabaseAdmin
        .from('pricing_plans')
        .select('id')
        .eq('stripe_price_id', priceId)
        .maybeSingle();

      if (planError) {
        console.error(`Error looking up plan by price ID ${priceId}:`, planError);
      } else if (planData) {
        planId = planData.id;
      } else {
        console.error(`FATAL: Cannot determine planId for subscription ${subscriptionId}. Metadata missing and DB lookup by price failed.`);
        throw new Error(`Cannot determine planId for subscription ${subscriptionId}.`);
      }
    }

    const priceId = subscription.items.data[0]?.price.id;

    const subscriptionData: TablesInsert<'subscriptions'> = {
      user_id: userId,
      plan_id: planId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      price_id: priceId,
      status: subscription.status,
      current_period_start: subscription.items.data[0].current_period_start ? new Date(subscription.items.data[0].current_period_start * 1000).toISOString() : null,
      current_period_end: subscription.items.data[0].current_period_end ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      metadata: {
        ...subscription.metadata,
        ...(initialMetadata && { checkoutSessionMetadata: initialMetadata })
      },
    };

    const { error: upsertError } = await supabaseAdmin
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'stripe_subscription_id',
      });

    if (upsertError) {
      console.error(`Error upserting subscription ${subscriptionId} into subscriptions table:`, upsertError);
      throw new Error(`Error upserting subscription data: ${upsertError.message}`);
    }

  } catch (error) {
    console.error(`Error in syncSubscriptionData for sub ${subscriptionId}, cust ${customerId}:`, error);
    const errorMessage = getErrorMessage(error);
    throw new Error(`Subscription sync failed (${subscriptionId}): ${errorMessage}`);
  }
}

/**
 * Sends a notification email using the configured email provider (Resend).
 */
/**
 * 取消用户的订阅，在当前计费周期结束时生效
 * 这样用户可以继续使用服务直到付费期结束，但不会续费
 */
export async function cancelSubscriptionAtPeriodEnd(userId: string): Promise<{
  success: boolean;
  message: string;
  subscriptionId?: string;
}> {
  try {
    const supabase = await createClient();
    
    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return {
        success: false,
        message: '用户身份验证失败'
      };
    }

    if (!stripe) {
      console.error('Stripe is not initialized. Please check your environment variables.');
      return {
        success: false,
        message: 'Stripe 服务不可用'
      };
    }

    // 获取用户的活跃订阅
    const { data: activeSubscriptions, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, status, cancel_at_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false });

    if (subscriptionError) {
      console.error('Error fetching user subscriptions:', subscriptionError);
      return {
        success: false,
        message: '获取订阅信息失败'
      };
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return {
        success: false,
        message: '未找到活跃的订阅'
      };
    }

    const subscription = activeSubscriptions[0];
    
    // 检查是否已经设置了周期结束时取消
    if (subscription.cancel_at_period_end) {
      return {
        success: true,
        message: '订阅已设置为在当前周期结束时取消',
        subscriptionId: subscription.stripe_subscription_id
      };
    }

    // 在 Stripe 中设置订阅在周期结束时取消
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    );

    // 更新本地数据库
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    if (updateError) {
      console.error('Error updating local subscription data:', updateError);
      // Stripe 已经更新了，但本地数据库更新失败
      // 这不是致命错误，因为 webhook 会同步数据
      console.warn('Local database update failed, but Stripe subscription was updated. Webhook will sync the data.');
    }

    return {
      success: true,
      message: '订阅已成功设置为在当前周期结束时取消。您可以继续使用服务直到付费期结束。',
      subscriptionId: subscription.stripe_subscription_id
    };

  } catch (error) {
    console.error('Error cancelling subscription at period end:', error);
    const errorMessage = getErrorMessage(error);
    return {
      success: false,
      message: `取消订阅失败: ${errorMessage}`
    };
  }
}

/**
 * 重新激活已取消的订阅，移除 cancel_at_period_end 设置
 */
export async function reactivateSubscription(userId: string): Promise<{
  success: boolean;
  message: string;
  subscriptionId?: string;
}> {
  try {
    const supabase = await createClient();
    
    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return {
        success: false,
        message: 'User authentication failed'
      };
    }

    if (!stripe) {
      console.error('Stripe is not initialized. Please check your environment variables.');
      return {
        success: false,
        message: 'Stripe service unavailable'
      };
    }

    // 获取用户的订阅，查找设置了 cancel_at_period_end 的活跃订阅
    const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, status, cancel_at_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .eq('cancel_at_period_end', true)
      .order('created_at', { ascending: false });

    if (subscriptionError) {
      console.error('Error fetching user subscriptions:', subscriptionError);
      return {
        success: false,
        message: 'Failed to fetch subscription information'
      };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return {
        success: false,
        message: 'No cancelled subscription found to reactivate'
      };
    }

    const subscription = subscriptions[0];

    // 在 Stripe 中移除 cancel_at_period_end 设置
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: false
      }
    );

    // 更新本地数据库
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    if (updateError) {
      console.error('Error updating local subscription data:', updateError);
      // Stripe 已经更新了，但本地数据库更新失败
      // 这不是致命错误，因为 webhook 会同步数据
      console.warn('Local database update failed, but Stripe subscription was updated. Webhook will sync the data.');
    }

    return {
      success: true,
      message: 'Subscription has been successfully reactivated. It will continue to renew automatically.',
      subscriptionId: subscription.stripe_subscription_id
    };

  } catch (error) {
    console.error('Error reactivating subscription:', error);
    const errorMessage = getErrorMessage(error);
    return {
      success: false,
      message: `Failed to reactivate subscription: ${errorMessage}`
    };
  }
}

export async function sendInvoicePaymentFailedEmail({
  invoice,
  subscriptionId,
  customerId,
  invoiceId
}: {
  invoice: Stripe.Invoice;
  subscriptionId: string;
  customerId: string;
  invoiceId: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API Key is not configured. Skipping email send.');
    return;
  }
  if (!process.env.ADMIN_EMAIL) {
    console.error('FROM_EMAIL environment variable is not set. Cannot send email.');
    return;
  }

  if (!stripe) {
    console.error('Stripe is not initialized. Please check your environment variables.');
    throw new Error(`Stripe is not initialized. Please check your environment variables.`);
  }

  let userEmail: string | null = null;
  let planName: string = 'Your Subscription Plan';
  let userId: string | null = null;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    userId = subscription.metadata?.userId || null;

    if (!userId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted) {
        userId = customer.metadata?.userId;
      }
    }

    if (!userId) {
      return;
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();


    if (userError || !userData?.email) {
      console.error(`Error fetching email for user ${userId}:`, userError);
      return
    }

    userEmail = userData.email;

    const planId = subscription.metadata?.planId;
    if (planId) {
      const { data: planData, error: planError } = await supabaseAdmin
        .from('pricing_plans')
        .select('card_title')
        .eq('id', planId)
        .single();

      if (!planError && planData && planData.card_title) {
        planName = planData.card_title;
      }
    }

    if (userEmail && userId) {
      const updatePaymentMethodLink = `${process.env.NEXT_PUBLIC_SITE_URL}${process.env.STRIPE_CUSTOMER_PORTAL_URL}`;
      const supportLink = `${process.env.NEXT_PUBLIC_SITE_URL}`;

      const nextPaymentAttemptTimestamp = invoice.next_payment_attempt;
      const nextPaymentAttemptDate = nextPaymentAttemptTimestamp
        ? new Date(nextPaymentAttemptTimestamp * 1000).toLocaleDateString()
        : undefined;

      const emailProps = {
        invoiceId: invoiceId,
        subscriptionId: subscriptionId,
        planName: planName,
        amountDue: invoice.amount_due / 100,
        currency: invoice.currency,
        nextPaymentAttemptDate: nextPaymentAttemptDate,
        updatePaymentMethodLink: updatePaymentMethodLink,
        supportLink: supportLink,
      };

      try {
        const subject = `Action Required: Payment Failed / 操作提醒：支付失败 / 要対応：お支払いが失敗`; // Example subject

        if (!resend) {
          console.error('Resend client is not initialized. Cannot send invoice payment failed email.');
          return;
        }

        await resend.emails.send({
          from: `${process.env.ADMIN_NAME} <${process.env.ADMIN_EMAIL}>`,
          to: userEmail,
          subject: subject,
          react: await InvoicePaymentFailedEmail(emailProps),
        });
      } catch (emailError) {
        console.error(`Failed to send payment failed email for invoice ${invoiceId} to ${userEmail}:`, emailError);
      }
    }
  } catch (exception) {
    console.error(`Exception occurred while sending email to ${userEmail}:`, exception);
  }
}

