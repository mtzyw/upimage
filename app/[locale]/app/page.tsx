"use client";

import WorkspaceComponent from "@/components/workspace";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { redirect } from "next/navigation";

export default function AppPage() {
  const searchParams = useSearchParams();
  const target = searchParams.get("target");

  useEffect(() => {
    // 如果没有 target 参数，重定向到默认的图像增强功能
    if (!target) {
      redirect("/app?target=upscaler");
    }
  }, [target]);

  // 根据 target 参数决定默认标签
  const getDefaultTab = () => {
    switch (target) {
      case "background-remover":
        return "removeBackground";
      case "upscaler":
      default:
        return undefined; // 使用 WorkspaceComponent 的默认值
    }
  };

  return <WorkspaceComponent defaultTab={getDefaultTab()} />;
}