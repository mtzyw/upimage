"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserType } from "@/types/admin/users";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

export const columns: ColumnDef<UserType>[] = [
  {
    accessorKey: "avatar_url",
    header: () => <span className="text-white">Avatar</span>,
    cell: ({ row }) => {
      const avatarUrl = row.original.avatar_url;
      const fullName = row.original.full_name || row.original.email;
      return (
        <Avatar>
          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
          <AvatarFallback>{fullName[0].toUpperCase()}</AvatarFallback>
        </Avatar>
      );
    },
  },
  {
    accessorKey: "email",
    header: () => <span className="text-white">Email</span>,
    cell: ({ row }) => (
      <span
        className="cursor-pointer text-white hover:text-pink-400"
        onClick={() => {
          navigator.clipboard.writeText(row.original.email);
          toast.success("Copied to clipboard");
        }}
      >
        {row.original.email}
      </span>
    ),
  },
  {
    accessorKey: "full_name",
    header: () => <span className="text-white">Full Name</span>,
    cell: ({ row }) => <span className="text-white">{row.original.full_name || "-"}</span>,
  },
  {
    accessorKey: "role",
    header: () => <span className="text-white">Role</span>,
    cell: ({ row }) => (
      <span
        className={`capitalize text-white ${
          row.original.role === "admin" ? "text-pink-400 font-medium" : ""
        }`}
      >
        {row.original.role}
      </span>
    ),
  },
  {
    accessorKey: "stripe_customer_id",
    header: () => <span className="text-white">Stripe Customer ID</span>,
    cell: ({ row }) => (
      <span
        className="cursor-pointer text-white hover:text-pink-400"
        onClick={() => {
          navigator.clipboard.writeText(row.original.stripe_customer_id || "");
          toast.success("Copied to clipboard");
        }}
      >
        {row.original.stripe_customer_id || "-"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: () => <span className="text-white">Joined</span>,
    cell: ({ row }) => (
      <span className="text-slate-300">
        {dayjs(row.original.created_at).format("YYYY-MM-DD HH:mm")}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="text-white">Actions</span>,
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.email)}
            >
              Copy email
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(user.stripe_customer_id || "")
              }
            >
              Copy Stripe Customer ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
