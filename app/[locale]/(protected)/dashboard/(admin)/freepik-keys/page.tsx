import { getFreepikApiKeys } from "@/actions/freepik/admin";
import { constructMetadata } from "@/lib/metadata";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { Metadata } from "next";
import { Locale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { columns } from "./Columns";
import { DataTable } from "./DataTable";
import { CreateKeyDialog } from "./CreateKeyDialog";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "FreepikKeys",
  });

  return constructMetadata({
    page: "Freepik API Keys",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/dashboard/freepik-keys`,
  });
}

async function FreepikKeysTable() {
  const { data: keys, error } = await getFreepikApiKeys();

  if (error) {
    return <div className="text-red-500">Error loading API keys</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateKeyDialog />
      </div>
      <DataTable columns={columns} data={keys || []} />
    </div>
  );
}

export default function FreepikKeysPage() {
  const t = useTranslations("FreepikKeys");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }
      >
        <FreepikKeysTable />
      </Suspense>
    </div>
  );
}