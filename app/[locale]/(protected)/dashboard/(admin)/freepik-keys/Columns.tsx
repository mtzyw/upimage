"use client";

import { Database } from "@/lib/supabase/types";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
import { Badge } from "@/components/ui/badge";
import { KeyActions } from "./KeyActions";

type FreepikApiKey = Database["public"]["Tables"]["freepik_api_keys"]["Row"];

export const columns: ColumnDef<FreepikApiKey>[] = [
  {
    accessorKey: "name",
    header: () => <span className="text-white">Name</span>,
    cell: ({ row }) => {
      return <span className="text-white">{row.getValue("name") || "-"}</span>;
    },
  },
  {
    accessorKey: "key",
    header: () => <span className="text-white">API Key</span>,
    cell: ({ row }) => {
      const key = row.getValue("key") as string;
      return (
        <code className="text-xs bg-white/10 text-white px-2 py-1 rounded">
          {key.substring(0, 8)}...{key.substring(key.length - 8)}
        </code>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: () => <span className="text-white">Status</span>,
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-600 text-white" : "bg-slate-600 text-slate-300"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "usage",
    header: () => <span className="text-white">Usage Today</span>,
    cell: ({ row }) => {
      const used = row.original.used_today || 0;
      const limit = row.original.daily_limit || 100;
      const percentage = (used / limit) * 100;
      
      return (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-white">{used} / {limit}</span>
          <div className="w-20 bg-white/20 rounded-full h-2">
            <div
              className="bg-pink-600 h-2 rounded-full"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "last_reset_date",
    header: () => <span className="text-white">Last Reset</span>,
    cell: ({ row }) => {
      const date = row.getValue("last_reset_date") as string;
      if (!date) return <span className="text-slate-300">-</span>;
      return <span className="text-slate-300">{dayjs(date).fromNow()}</span>;
    },
  },
  {
    accessorKey: "created_at",
    header: () => <span className="text-white">Created</span>,
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      if (!date) return <span className="text-slate-300">-</span>;
      return <span className="text-slate-300">{dayjs(date).fromNow()}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <KeyActions apiKey={row.original} />,
  },
];