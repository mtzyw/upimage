import HistoryComponent from "@/components/history";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "历史记录 - AI 图像增强",
  description: "查看您的图像增强历史记录和处理结果",
};

export default function HistoryPage() {
  return <HistoryComponent />;
}