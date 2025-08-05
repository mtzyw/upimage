import { getUserBenefits, UserBenefits } from "@/actions/usage/benefits";
import BaiDuAnalytics from "@/app/BaiDuAnalytics";
import GoogleAdsense from "@/app/GoogleAdsense";
import GoogleAnalytics from "@/app/GoogleAnalytics";
import PlausibleAnalytics from "@/app/PlausibleAnalytics";
import ToltScript from "@/app/ToltScript";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import { LanguageDetectionAlert } from "@/components/LanguageDetectionAlert";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { BenefitsProvider } from "@/components/providers/BenefitsProvider";
import { PricingProvider } from "@/components/providers/PricingProvider";
import { TailwindIndicator } from "@/components/TailwindIndicator";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, Locale, routing } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import "@/styles/loading.css";
import { Analytics } from "@vercel/analytics/react";
import { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Inter as FontSans } from "next/font/google";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

type MetadataProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });

  return constructMetadata({
    page: "Home",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/`,
  });
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColors,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  // --- Check if Stripe is configured ---
  let supabase = null;
  let user = null;
  let benefitsPromise: Promise<UserBenefits | null>;

  const isSupabaseEnabled = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isStripeEnabled = process.env.NEXT_PUBLIC_ENABLE_STRIPE === "true";

  if (isSupabaseEnabled) {
    supabase = await createClient();

    const { data } = await supabase.auth.getUser();

    user = data.user;
  }

  if (isSupabaseEnabled && isStripeEnabled && user?.id) {
    benefitsPromise = getUserBenefits(user.id);
  } else {
    benefitsPromise = Promise.resolve(null);
  }
  // --- End ---

  // 获取当前路径
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isHomePage = pathname === "/home" || pathname.endsWith("/home");
  const isWorkspacePage = pathname.includes("/home") || pathname.includes("workspace") || pathname.includes("dashboard") || pathname === "/" || pathname.endsWith("/en") || pathname.endsWith("/zh") || pathname.endsWith("/ja");

  return (
    <html lang={locale || DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" ? (
          <></>
        ) : (
          <>
            <ToltScript />
          </>
        )}
      </head>
      <body
        className={cn(
          "min-h-screen bg-background flex flex-col",
          fontSans.variable
        )}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme={siteConfig.defaultNextTheme}
              enableSystem
            >
              <BenefitsProvider value={benefitsPromise}>
                <PricingProvider>
                  {messages.LanguageDetection && <LanguageDetectionAlert />}

                  {messages.Header && <Header />}

                  <main className="flex-1 flex flex-col items-center">
                    {children}
                  </main>

                  {messages.Footer && !isHomePage && !isWorkspacePage && <Footer />}
                </PricingProvider>
              </BenefitsProvider>
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
        <Toaster />
        <TailwindIndicator />
        {process.env.NODE_ENV === "development" ? (
          <></>
        ) : (
          <>
            <Analytics />
            <BaiDuAnalytics />
            <GoogleAnalytics />
            <GoogleAdsense />
            <PlausibleAnalytics />
          </>
        )}
      </body>
    </html>
  );
}
