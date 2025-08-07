import { getUserBenefits } from "@/actions/usage/benefits";
import CurrentUserBenefitsDisplay from "@/components/layout/CurrentUserBenefitsDisplay";
import { Button } from "@/components/ui/button";
import { Link as I18nLink } from "@/i18n/routing";
import { createStripePortalSession } from "@/lib/stripe/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const benefits = await getUserBenefits(user.id);

  const isMember =
    benefits.subscriptionStatus === "active" ||
    benefits.subscriptionStatus === "trialing";

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
            <form action={createStripePortalSession}>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">
                Manage Subscription & Billing
              </Button>
            </form>
            <p className="text-xs text-slate-300">
              You will be redirected to Stripe to manage your subscription
              details.
            </p>
          </>
        ) : (
          <>
            <p className="text-white">You are currently not subscribed to any plan.</p>
            <Button asChild className="h-11 px-6 font-medium highlight-button">
              <I18nLink
                href={process.env.NEXT_PUBLIC_PRICING_PATH!}
                title="Upgrade Plan"
              >
                Upgrade Plan
              </I18nLink>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
