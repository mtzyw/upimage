"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

type Menu = {
  name: string;
  href: string;
  target?: string;
};

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  setOpenMobile?: (open: boolean) => void;
}

export function Sidebar({ className, setOpenMobile }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const t = useTranslations("Login");

  const userMenus: Menu[] = t.raw("UserMenus");
  const adminMenus: Menu[] = t.raw("AdminMenus");

  const isActive = (href: string) => pathname === href;

  const handleLinkClick = () => {
    if (setOpenMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <div className={cn("pb-12 flex flex-col h-full", className)}>
      <div className="mt-4 flex-1">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {userMenus.map((menu) => (
              <Button
                key={menu.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-x-2 font-normal text-white hover:bg-white/10 hover:text-white",
                  isActive(menu.href) &&
                    "bg-white/20 text-pink-400 hover:bg-white/25 hover:text-pink-400 font-medium"
                )}
                asChild
                onClick={handleLinkClick}
              >
                <I18nLink
                  href={menu.href}
                  title={menu.name}
                  prefetch={true}
                  target={menu.target}
                >
                  <span>{menu.name}</span>
                  {menu.target && <ExternalLink className="w-4 h-4" />}
                </I18nLink>
              </Button>
            ))}
          </div>
        </div>

        {user?.role === "admin" && (
          <>
            <Separator className="my-4 bg-white/20" />
            <div className="px-3 py-2">
              <div className="text-xs font-semibold text-slate-300 tracking-wider uppercase mb-2 px-4">
                Admin Menus
              </div>
              <div className="space-y-1">
                {adminMenus.map((menu) => (
                  <Button
                    key={menu.href}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-x-2 font-normal text-white hover:bg-white/10 hover:text-white",
                      isActive(menu.href) &&
                        "bg-white/20 text-cyan-400 hover:bg-white/25 hover:text-cyan-400 font-medium"
                    )}
                    asChild
                    onClick={handleLinkClick}
                  >
                    <I18nLink
                      href={menu.href}
                      title={menu.name}
                      prefetch={false}
                    >
                      <span>{menu.name}</span>
                    </I18nLink>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
