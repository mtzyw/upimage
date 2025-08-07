"use client";

import LocaleSwitcher from "@/components/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE, routing } from "@/i18n/routing";
import { useLocaleStore } from "@/stores/localeStore";
import { Globe, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

export function LanguageDetectionAlert() {
  const [countdown, setCountdown] = useState(7); // countdown 7s and dismiss
  const locale = useLocale();
  const [currentLocale, setCurrentLocale] = useState(locale);
  const {
    showLanguageAlert,
    setShowLanguageAlert,
    dismissLanguageAlert,
    getLangAlertDismissed,
  } = useLocaleStore();

  useEffect(() => {
    const detectedLang = navigator.language; // Get full language code, e.g., zh_HK
    const storedDismiss = getLangAlertDismissed();

    if (!storedDismiss) {
      let supportedLang = routing.locales.find((l) => l === detectedLang);

      if (!supportedLang) {
        const mainLang = detectedLang.split("-")[0];
        supportedLang = routing.locales.find((l) => l.startsWith(mainLang));
      }

      setCurrentLocale(supportedLang || DEFAULT_LOCALE);
      setShowLanguageAlert(supportedLang !== locale);
    }
  }, [locale, getLangAlertDismissed, setCurrentLocale, setShowLanguageAlert]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (showLanguageAlert && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showLanguageAlert, countdown]);

  useEffect(() => {
    if (countdown === 0 && showLanguageAlert) {
      dismissLanguageAlert();
    }
  }, [countdown, showLanguageAlert, dismissLanguageAlert]);

  if (!showLanguageAlert) return null;

  const messages = require(`@/i18n/messages/${currentLocale}/common.json`);
  const alertMessages = messages.LanguageDetection;

  return (
    <div className="fixed top-16 right-4 z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {alertMessages.title}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={dismissLanguageAlert}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {alertMessages.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="[&_button]:!text-black [&_button]:!border-gray-300 [&_svg]:!text-black">
            <LocaleSwitcher />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {alertMessages.countdown.replace("{countdown}", countdown.toString())}
          </span>
        </div>
      </div>
    </div>
  );
}
