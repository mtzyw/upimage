"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import ClientHomeComponent from "@/components/home/ClientHomeComponent";
import WorkspaceComponent from "@/components/workspace";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function HomePageRouter() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // 如果用户已登录且在根路径，自动跳转到 /home
    if (!loading && user && (pathname === '/' || pathname.endsWith('/'))) {
      setIsRedirecting(true);
      router.push('/home');
    }
  }, [user, loading, router, pathname]);

  // 不显示加载状态，直接渲染内容

  // 如果用户已登录，显示工作台（这个条件在根路径时基本不会触发，因为上面的 useEffect 会跳转）
  if (user) {
    return <WorkspaceComponent />;
  }

  // 如果用户未登录，显示营销首页
  return <ClientHomeComponent />;
}