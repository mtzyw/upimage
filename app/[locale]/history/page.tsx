import HistoryComponent from "@/components/history";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "History" });
  
  return {
    title: `${t("title")} - AI 图像增强`,
    description: t("description"),
  };
}

export default function HistoryPage() {
  return <HistoryComponent />;
}