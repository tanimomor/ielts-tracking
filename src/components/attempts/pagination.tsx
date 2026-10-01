"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZES } from "@/lib/filters";
import { useAttemptFilters } from "./attempts-shell";

export function Pagination({ total, unit }: { total: number; unit: string }) {
  const { filters, hrefFor, update } = useAttemptFilters();
  const pages = Math.max(1, Math.ceil(total / filters.size));
  const page = Math.min(filters.page, pages);
  const start = total ? (page - 1) * filters.size + 1 : 0;
  const end = Math.min(total, page * filters.size);

  return (
    <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground tabular">
        {start}–{end} of {total.toLocaleString()} {unit}
      </p>
      <div className="flex items-center gap-2">
        <Select value={String(filters.size)} onValueChange={(v) => update({ size: Number(v) })}>
          <SelectTrigger size="sm" className="w-28" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild={page > 1} variant="outline" size="icon-sm" disabled={page <= 1} aria-label="Previous page">
          {page > 1 ? (
            <Link href={hrefFor({ page: page - 1 })} scroll={false}>
              <ChevronLeft />
            </Link>
          ) : (
            <ChevronLeft />
          )}
        </Button>
        <span className="min-w-16 text-center tabular">
          {page} / {pages}
        </span>
        <Button asChild={page < pages} variant="outline" size="icon-sm" disabled={page >= pages} aria-label="Next page">
          {page < pages ? (
            <Link href={hrefFor({ page: page + 1 })} scroll={false}>
              <ChevronRight />
            </Link>
          ) : (
            <ChevronRight />
          )}
        </Button>
      </div>
    </nav>
  );
}
