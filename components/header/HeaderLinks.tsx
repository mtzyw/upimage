"use client";

import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { HeaderLink } from "@/types/common";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

const HeaderLinks = () => {
  const tHeader = useTranslations("Header");
  const pathname = usePathname();

  const headerLinks: HeaderLink[] = tHeader.raw("links");
  const pricingLink = headerLinks.find((link) => link.id === "pricing");
  if (pricingLink) {
    pricingLink.href = process.env.NEXT_PUBLIC_PRICING_PATH!;
  }

  // 在 /home 或 /history 页面时只显示 pricing 链接
  const isHomePage = pathname === "/home";
  const isHistoryPage = pathname === "/history";
  const filteredLinks = (isHomePage || isHistoryPage)
    ? headerLinks.filter(link => link.id === 'pricing')
    : headerLinks;

  return (
    <div className="hidden md:flex flex-row items-center gap-x-2 text-sm text-white">
      {filteredLinks.map((link) => (
        <I18nLink
          key={link.name}
          href={link.href}
          title={link.name}
          prefetch={link.target && link.target === "_blank" ? false : true}
          target={link.target || "_self"}
          rel={link.rel || undefined}
          className={cn(
            "rounded-xl px-4 py-2 flex items-center gap-x-1 text-white/80 hover:bg-white/10 hover:text-white",
            pathname === link.href && "font-medium text-white bg-white/10"
          )}
        >
          {link.name}
          {link.target && link.target === "_blank" && (
            <span className="text-xs">
              <ExternalLink className="w-4 h-4" />
            </span>
          )}
        </I18nLink>
      ))}
    </div>
  );
};

export default HeaderLinks;
