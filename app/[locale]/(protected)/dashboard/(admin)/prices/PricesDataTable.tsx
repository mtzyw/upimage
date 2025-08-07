"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PricingPlan } from "@/types/pricing";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import * as React from "react";
import { columns } from "./Columns";

const PAGE_SIZE = 20;

interface DataTableProps<TData extends PricingPlan, TValue> {
  data: TData[];
}

export function PricesDataTable<TData extends PricingPlan, TValue>({
  data,
}: DataTableProps<TData, TValue>) {
  const t = useTranslations("Prices.PricesDataTable");

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<TData, TValue>[],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: PAGE_SIZE,
      },
      sorting: [
        { id: "environment", desc: false },
        { id: "display_order", desc: false },
      ],
    },
  });

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start gap-4 py-4">
        <Input
          placeholder="Filter by title..."
          value={
            (table.getColumn("card_title")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("card_title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm bg-white/10 border-white/20 text-white placeholder:text-slate-300"
        />
        <Select
          value={
            (table.getColumn("environment")?.getFilterValue() as string) ??
            "all"
          }
          onValueChange={(value) => {
            const filterValue = value === "all" ? null : value;
            table.getColumn("environment")?.setFilterValue(filterValue);
          }}
        >
          <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Filter Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allEnvironments")}</SelectItem>
            <SelectItem value="test">{t("test")}</SelectItem>
            <SelectItem value="live">{t("live")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border border-white/20 bg-white/5 backdrop-blur-sm relative min-h-[200px] max-h-[calc(100vh-330px)] overflow-y-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width:
                          header.getSize() !== 150
                            ? undefined
                            : `${header.getSize()}px`,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-slate-300"
                >
                  {t("noPlansFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-slate-300">
          {table.getFilteredRowModel().rows.length} plan(s) found.
          {table.getFilteredSelectedRowModel().rows.length > 0 &&
            ` (${table.getFilteredSelectedRowModel().rows.length} selected)`}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-300">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="bg-pink-600 hover:bg-pink-700 text-white border-pink-600"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="bg-pink-600 hover:bg-pink-700 text-white border-pink-600"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
