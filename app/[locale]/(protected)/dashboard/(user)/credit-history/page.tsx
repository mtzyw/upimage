import { getCreditLogs } from "@/actions/usage/logs";
import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CreditHistoryDataTable } from "./CreditHistoryDataTable";

const PAGE_SIZE = 20;

export default async function CreditHistoryPage() {
  const t = await getTranslations("CreditHistory");
  const initialResult = await getCreditLogs({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">{t("title")}</h1>
        <p className="text-slate-300">{t("description")}</p>
      </div>
      {initialResult.success && initialResult.data ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center rounded-md border border-white/20 bg-white/5 backdrop-blur-sm p-8">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          }
        >
          <CreditHistoryDataTable
            initialData={initialResult.data.logs}
            initialTotalCount={initialResult.data.count}
            pageSize={PAGE_SIZE}
          />
        </Suspense>
      ) : (
        <p className="text-red-400">
          {initialResult.error || t("load_error")}
        </p>
      )}
    </div>
  );
}
