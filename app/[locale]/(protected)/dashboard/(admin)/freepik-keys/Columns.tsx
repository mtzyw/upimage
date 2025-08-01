"use client";

import { Database } from "@/lib/supabase/types";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistance } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { KeyActions } from "./KeyActions";

type FreepikApiKey = Database["public"]["Tables"]["freepik_api_keys"]["Row"];

export const columns: ColumnDef<FreepikApiKey>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      return row.getValue("name") || "-";
    },
  },
  {
    accessorKey: "key",
    header: "API Key",
    cell: ({ row }) => {
      const key = row.getValue("key") as string;
      return (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {key.substring(0, 8)}...{key.substring(key.length - 8)}
        </code>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "usage",
    header: "Usage Today",
    cell: ({ row }) => {
      const used = row.original.used_today || 0;
      const limit = row.original.daily_limit || 100;
      const percentage = (used / limit) * 100;
      
      return (
        <div className="flex items-center space-x-2">
          <span className="text-sm">{used} / {limit}</span>
          <div className="w-20 bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "last_reset_date",
    header: "Last Reset",
    cell: ({ row }) => {
      const date = row.getValue("last_reset_date") as string;
      if (!date) return "-";
      return formatDistance(new Date(date), new Date(), { addSuffix: true });
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      if (!date) return "-";
      return formatDistance(new Date(date), new Date(), { addSuffix: true });
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <KeyActions apiKey={row.original} />,
  },
];