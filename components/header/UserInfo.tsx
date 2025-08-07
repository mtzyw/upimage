"use client";

import { BenefitsErrorBoundary } from "@/components/layout/BenefitsErrorBoundary";
import CurrentUserBenefitsDisplay from "@/components/layout/CurrentUserBenefitsDisplay";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/routing";
import { LoginModal } from "@/components/auth/LoginModal";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";

type Menu = {
  name: string;
  href: string;
  target?: string;
};

interface UserInfoProps {
  mobile?: boolean;
  renderContainer?: (children: React.ReactNode) => React.ReactNode;
}

export function UserInfo({ mobile = false, renderContainer }: UserInfoProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const t = useTranslations("Login");

  const userMenus: Menu[] = t.raw("UserMenus");

  const adminMenus: Menu[] = t.raw("AdminMenus");

  if (!user) {
    return (
      <>
        <Button
          onClick={() => setIsLoginModalOpen(true)}
          variant="outline"
          className={`highlight-button text-white hover:text-white shadow-lg ${
            mobile ? "w-full" : ""
          }`}
        >
          {t("Button.signIn")}
        </Button>
        
        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
      </>
    );
  }

  const isStripeEnabled = process.env.NEXT_PUBLIC_ENABLE_STRIPE === "true";

  const BenefitsLoadingFallback = () => (
    <Skeleton className="h-6 w-20 rounded-md" />
  );
  const BenefitsErrorFallback = () => (
    <div className="text-xs text-destructive">Error loading info</div>
  );

  const fallbackLetter = (user.email || "N")[0].toUpperCase();
  const userInfoContent = (
    <>
      <div>
        <div className="flex items-center space-x-2 pb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback>{fallbackLetter}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium leading-none text-white">
              {user.user_metadata?.full_name || "User"}
            </p>
            <p className="text-xs leading-none text-slate-300">
              {user.email}
            </p>
          </div>
        </div>

        {isStripeEnabled && (
          <div className="pt-1 pb-2">
            <BenefitsErrorBoundary fallback={<BenefitsErrorFallback />}>
              <Suspense fallback={<BenefitsLoadingFallback />}>
                <CurrentUserBenefitsDisplay />
              </Suspense>
            </BenefitsErrorBoundary>
          </div>
        )}
      </div>

      <DropdownMenuSeparator />

      {userMenus.map((menu) => (
        <DropdownMenuItem
          key={menu.name}
          onClick={() => {
            if (menu.target) {
              window.open(menu.href, "_blank");
            } else {
              router.push(menu.href);
            }
          }}
          className="cursor-pointer text-white hover:bg-slate-700 focus:bg-slate-700"
        >
          {menu.name}
          {menu.target && <ExternalLink className="w-4 h-4" />}
        </DropdownMenuItem>
      ))}
      {/* </>
      )} */}

      {user.role === "admin" && (
        <>
          <DropdownMenuLabel className="text-xs font-semibold text-slate-300">
            Admin Menu
          </DropdownMenuLabel>
          {adminMenus.map((menu) => (
            <DropdownMenuItem
              key={menu.name}
              onClick={() => router.push(menu.href)}
              className="cursor-pointer text-white hover:bg-slate-700 focus:bg-slate-700"
            >
              {menu.name}
            </DropdownMenuItem>
          ))}
        </>
      )}

      <DropdownMenuItem
        onClick={() => signOut()}
        className="cursor-pointer text-red-400 hover:bg-slate-700 focus:bg-slate-700 hover:text-red-300"
      >
        {t("Button.signOut")}
      </DropdownMenuItem>
    </>
  );

  if (renderContainer) {
    return renderContainer(userInfoContent);
  }

  return userInfoContent;
}
