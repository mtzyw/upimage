"use client";

import ClientHomeComponent from "@/components/home/ClientHomeComponent";

export default function HomePageRouter() {
  // 无论用户是否登录，都显示营销首页
  return <ClientHomeComponent />;
}