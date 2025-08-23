"use client";

import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { HeaderLink } from "@/types/common";
import { ExternalLink, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const HeaderLinks = () => {
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const headerLinks: HeaderLink[] = tHeader.raw("links");
  const pricingLink = headerLinks.find((link) => link.id === "pricing");
  if (pricingLink) {
    pricingLink.href = "/pricing"; // 使用新的独立定价页面
  }

  // 在 /app 或 /history 页面时只显示 pricing 链接
  const isHomePage = pathname === "/app";
  const isHistoryPage = pathname === "/history";
  const filteredLinks = (isHomePage || isHistoryPage)
    ? headerLinks.filter(link => link.id === 'pricing')
    : headerLinks;

  const handleDropdownToggle = (linkName: string) => {
    setOpenDropdown(openDropdown === linkName ? null : linkName);
  };

  const handleDropdownClose = () => {
    setOpenDropdown(null);
  };

  return (
    <div className="hidden md:flex flex-row items-center gap-x-2 text-sm text-white">
      {filteredLinks.map((link) => (
        <div key={link.name} className="relative">
          {link.dropdown ? (
            // 下拉菜单
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown(link.name)}
              onMouseLeave={handleDropdownClose}
            >
              <button
                onClick={() => handleDropdownToggle(link.name)}
                className={cn(
                  "rounded-xl px-4 py-2 flex items-center gap-x-1 text-white/80 hover:bg-white/10 hover:text-white",
                  openDropdown === link.name && "bg-white/10 text-white"
                )}
              >
                {link.name}
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  openDropdown === link.name && "rotate-180"
                )} />
              </button>
              
              {openDropdown === link.name && (
                <div className="absolute top-full left-0 min-w-[200px] bg-black/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl z-50">
                  {link.dropdown.map((dropdownItem) => (
                    <I18nLink
                      key={dropdownItem.name}
                      href={dropdownItem.href}
                      className="block px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white first:rounded-t-lg last:rounded-b-lg transition-colors"
                      onClick={handleDropdownClose}
                    >
                      {dropdownItem.name}
                    </I18nLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // 普通链接
            <I18nLink
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
          )}
        </div>
      ))}
    </div>
  );
};

export default HeaderLinks;
