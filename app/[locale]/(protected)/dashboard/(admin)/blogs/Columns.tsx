"use client";

import { type PostWithTags } from "@/actions/blogs/posts";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Pin } from "lucide-react";
import { BlogListActions } from "./BlogListActions";

const getStatusBadgeVariant = (
  status: string
): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
};

const getVisibilityBadgeVariant = (
  visibility: string
): "default" | "secondary" | "outline" | "destructive" => {
  switch (visibility) {
    case "public":
      return "secondary";
    case "logged_in":
      return "outline";
    case "subscribers":
      return "default";
    default:
      return "secondary";
  }
};

export const columns: ColumnDef<PostWithTags>[] = [
  {
    accessorKey: "title",
    header: () => <span className="text-white">Title</span>,
    cell: ({ row }) => {
      return <div className="font-medium text-white">{row.getValue("title")}</div>;
    },
  },
  {
    accessorKey: "language",
    header: () => <span className="text-white">Language</span>,
    cell: ({ row }) => (
      <Badge variant="outline" className="border-white/30 text-white bg-white/10">{row.getValue("language")}</Badge>
    ),
  },
  {
    accessorKey: "is_pinned",
    header: () => <span className="text-white">Pinned</span>,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.getValue("is_pinned") ? <Pin className="w-4 h-4 text-pink-400" /> : <span className="text-slate-300">-</span>}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <span className="text-white">Status</span>,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusColor = (status: string) => {
        switch (status) {
          case "published":
            return "bg-green-600 text-white";
          case "draft":
            return "bg-yellow-600 text-white";
          case "archived":
            return "bg-gray-600 text-white";
          default:
            return "bg-slate-600 text-slate-300";
        }
      };
      return <Badge className={getStatusColor(status)}>{status}</Badge>;
    },
  },
  {
    accessorKey: "visibility",
    header: () => <span className="text-white">Visibility</span>,
    cell: ({ row }) => {
      const visibility = row.getValue("visibility") as string;
      const getVisibilityColor = (visibility: string) => {
        switch (visibility) {
          case "public":
            return "bg-blue-600 text-white";
          case "logged_in":
            return "bg-purple-600 text-white";
          case "subscribers":
            return "bg-pink-600 text-white";
          default:
            return "bg-slate-600 text-slate-300";
        }
      };
      return (
        <Badge className={getVisibilityColor(visibility)}>
          {visibility}
        </Badge>
      );
    },
  },
  {
    accessorKey: "tags",
    header: () => <span className="text-white">Tags</span>,
    cell: ({ row }) => {
      const tags = row.original.tags || [];
      if (tags.length === 0)
        return <span className="text-slate-300">-</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag.id} className="text-xs bg-slate-700 text-slate-200">
              {tag.name}
            </Badge>
          ))}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "published_at",
    header: () => <span className="text-white">Published</span>,
    cell: ({ row }) => {
      const date = row.getValue("published_at") as string | Date;
      try {
        return date ? <span className="text-slate-300">{dayjs(date).format("YYYY-MM-DD HH:mm")}</span> : <span className="text-slate-300">-</span>;
      } catch {
        return <span className="text-slate-300">-</span>;
      }
    },
  },
  {
    id: "actions",
    header: () => <span className="text-white">Actions</span>,
    cell: ({ row }) => {
      const post = row.original;
      return <BlogListActions post={post} />;
    },
  },
];
