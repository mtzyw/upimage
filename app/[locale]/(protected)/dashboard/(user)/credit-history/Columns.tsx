"use client";

import type { CreditLog } from "@/actions/usage/logs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

const formatLogType = (type: string, t: (key: string) => string) => {
  switch (type) {
    case "one_time_purchase":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          {t("type_one_time_purchase")}
        </Badge>
      );
    case "subscription_grant":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          {t("type_subscription_grant")}
        </Badge>
      );
    case "feature_usage":
      return <Badge variant="secondary" className="bg-slate-600 text-white">{t("type_feature_usage")}</Badge>;
    case "refund_revoke":
      return <Badge variant="destructive" className="bg-red-600 text-white">{t("type_refund_revoke")}</Badge>;
    case "subscription_cancel_revoke":
      return (
        <Badge variant="destructive" className="bg-red-600 text-white">
          {t("type_subscription_cancel_revoke")}
        </Badge>
      );
    case "welcome_bonus":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          {t("type_welcome_bonus")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className="border-white/20 text-white">{type}</Badge>;
  }
};

export const getColumns = (
  t: (key: string) => string
): ColumnDef<CreditLog>[] => [
  {
    accessorKey: "created_at",
    header: t("header_date"),
    cell: ({ row }) => (
      <div className="text-white">
        {dayjs(row.getValue("created_at")).format("YYYY-MM-DD HH:mm:ss")}
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: t("header_type"),
    cell: ({ row }) => formatLogType(row.getValue("type"), t),
  },
  {
    accessorKey: "notes",
    header: t("header_details"),
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="max-w-[200px] truncate text-white">
              {row.getValue("notes")}
            </div>
          </TooltipTrigger>
          <TooltipContent>{row.getValue("notes")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right text-white">{t("header_amount")}</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = amount > 0 ? `+${amount}` : amount.toString();
      return (
        <div
          className={`text-right font-medium ${
            amount > 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {formatted}
        </div>
      );
    },
  },
  {
    accessorKey: "one_time_balance_after",
    header: () => (
      <div className="text-right text-white">{t("header_balance_one_time")}</div>
    ),
    cell: ({ row }) => (
      <div className="text-right text-slate-300">
        {row.getValue("one_time_balance_after")}
      </div>
    ),
  },
  {
    accessorKey: "subscription_balance_after",
    header: () => (
      <div className="text-right text-white">{t("header_balance_subscription")}</div>
    ),
    cell: ({ row }) => (
      <div className="text-right text-slate-300">
        {row.getValue("subscription_balance_after")}
      </div>
    ),
  },
];
