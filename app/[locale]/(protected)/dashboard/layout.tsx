"use client";

import React from "react";
import { MobileSidebar } from "./MobileSidebar";
import { Sidebar } from "./Sidebar";
import { BG1 } from "@/components/shared/BGs";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Dashboard 主页使用全屏布局，子页面使用侧边栏布局
  const isMainDashboard = pathname?.endsWith('/dashboard');

  if (isMainDashboard) {
    return (
      <div className="w-full">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col w-full">
      <BG1 />
      <div className="md:hidden border-b px-4 py-3 sticky top-0 z-10 bg-white/10 backdrop-blur-sm border-white/20">
        <MobileSidebar />
      </div>
      <div className="flex flex-1">
        <Sidebar className="hidden md:block w-56 border-r p-4 sticky top-12 h-screen overflow-auto scrollbar-thin bg-white/5 backdrop-blur-sm border-white/20" />
        <main className="flex-1 p-4 md:p-6 mx-auto">{children}</main>
      </div>
    </div>
  );
}
