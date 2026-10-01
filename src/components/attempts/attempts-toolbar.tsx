"use client";

import { ChevronDown, Download, Grid3x3, Loader2, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SKILLS, SKILL_LABELS, type Skill } from "@/lib/constants";
import { type DatePreset } from "@/lib/dates";
import { bookKeyToString, filtersToParams, hasActiveFilters, parseBookKey } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { useAttemptFilters } from "./attempts-shell";
import { TagPicker } from "./tag-picker";

type StudentOpt = { id: string; name: string; color: string };

const RANGE_LABELS: Record<DatePreset, string> = {
  all: "All time",
  week: "This week",
  month: "This month",
  year: "This year",
  custom: "Custom range",
};

function MultiSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  renderOption,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  renderOption?: (v: T) => React.ReactNode;
}) {
  const summary =
    value.length === 0
      ? `All ${label.toLowerCase()}`
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label
        : `${value.length} ${label.toLowerCase()}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("justify-between font-normal", value.length && "border-primary/50 bg-primary-soft/40")}>
          <span className="truncate">{summary}</span>
          <ChevronDown className="opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={value.includes(o.value)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(checked ? [...value, o.value] : value.filter((v) => v !== o.value))
            }
          >
            {renderOption ? renderOption(o.value) : o.label}
          </DropdownMenuCheckboxItem>
        ))}
        {value.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => onChange([])}>
              Clear
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterControls({
  students,
  books,
  tags,
  stacked = false,
}: {
  students: StudentOpt[];
  books: { value: string; label: string }[];
  tags: string[];
  stacked?: boolean;
}) {
  const { filters, update } = useAttemptFilters();
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");

  const wrap = (label: string, node: React.ReactNode, id?: string) =>
    stacked ? (
      <div className="grid gap-1.5">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        {node}
      </div>
    ) : (
      node
    );

  return (
    <div className={cn(stacked ? "grid gap-4" : "flex flex-wrap items-center gap-2")}>
      {wrap(
        "Date range",
        <Select
          value={filters.preset}
          onValueChange={(v) => update({ preset: v as DatePreset, from: null, to: null })}
        >
          <SelectTrigger id="f-range" className={cn(!stacked && "w-36", filters.preset !== "all" && "border-primary/50 bg-primary-soft/40")} aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RANGE_LABELS) as DatePreset[]).map((p) => (
              <SelectItem key={p} value={p}>
                {RANGE_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
        "f-range",
      )}
      {filters.preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="From date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            onBlur={() => from !== (filters.from ?? "") && update({ from: from || null })}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onBlur={() => to !== (filters.to ?? "") && update({ to: to || null })}
            className="w-auto"
          />
        </div>
      )}
      {wrap(
        "Students",
        <MultiSelect
          label="Students"
          options={students.map((s) => ({ value: s.id, label: s.name }))}
          value={filters.students}
          onChange={(v) => update({ students: v })}
          renderOption={(id) => {
            const s = students.find((x) => x.id === id)!;
            return (
              <span className="flex items-center gap-2">
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            );
          }}
        />,
      )}
      {wrap(
        "Skills",
        <MultiSelect<Skill>
          label="Skills"
          options={SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }))}
          value={filters.skills}
          onChange={(v) => update({ skills: v })}
        />,
      )}
      {wrap(
        "Book",
        <Select value={filters.book ? bookKeyToString(filters.book) : "any"} onValueChange={(v) => update({ book: v === "any" ? null : parseBookKey(v) })}>
          <SelectTrigger id="f-book" className={cn(!stacked && "w-44", filters.book && "border-primary/50 bg-primary-soft/40")} aria-label="Book">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="any">Any book</SelectItem>
            {books.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
        "f-book",
      )}
      {wrap(
        "Mistake tags",
        <TagPicker
          value={filters.tags}
          onChange={(t) => update({ tags: t })}
          suggestions={tags}
          allowCreate={false}
          placeholder="Any tag"
          className={cn(!stacked && "w-44 [&_ul]:hidden")}
        />,
      )}
    </div>
  );
}

function SearchBox() {
  const { filters, update } = useAttemptFilters();
  const [q, setQ] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  // Follow external changes (e.g. "Clear filters") without fighting the user's typing.
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    setQ(filters.q);
  }

  useEffect(() => {
    if (q.trim() === filters.q) return;
    const t = setTimeout(() => update({ q: q.trim() }), 350);
    return () => clearTimeout(t);
  }, [q, filters.q, update]);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        placeholder="Search…"
        aria-label="Search attempts"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

export function AttemptsToolbar({
  students,
  books,
  tags,
  total,
}: {
  students: StudentOpt[];
  books: { value: string; label: string }[];
  tags: string[];
  total: number;
}) {
  const { filters, update, pending } = useAttemptFilters();
  const active = hasActiveFilters(filters);
  const activeCount =
    (filters.preset !== "all" ? 1 : 0) +
    (filters.students.length ? 1 : 0) +
    (filters.skills.length ? 1 : 0) +
    (filters.book ? 1 : 0) +
    (filters.tags.length ? 1 : 0);
  const exportHref = `/api/export/attempts?${filtersToParams({ ...filters, page: 1 }).toString()}`;

  return (
    <div className="mb-5 grid gap-3">
      <div className="flex items-center gap-2">
        <SearchBox />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="md:hidden">
              <SlidersHorizontal aria-hidden />
              Filters{activeCount ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Results update as you change them.</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-4 pb-6">
              <FilterControls students={students} books={books} tags={tags} stacked />
            </div>
          </SheetContent>
        </Sheet>
        <div className="ml-auto flex items-center gap-2">
          <div role="group" aria-label="View" className="inline-flex rounded-md border p-0.5">
            {(
              [
                ["table", "Table", Rows3],
                ["grid", "Grid", Grid3x3],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={filters.view === v}
                onClick={() => update({ view: v })}
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 text-sm font-medium text-muted-foreground transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                  filters.view === v && "bg-surface text-foreground shadow-xs ring-1 ring-border",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
                <span className="sr-only sm:hidden">{label} view</span>
              </button>
            ))}
          </div>
          <Button asChild variant="outline">
            <a href={exportHref} download>
              <Download aria-hidden />
              <span className="hidden sm:inline">Export</span>
              <span className="sr-only sm:hidden">Export to Excel</span>
            </a>
          </Button>
        </div>
      </div>
      <div className="hidden md:block">
        <FilterControls students={students} books={books} tags={tags} />
      </div>
      <div className="flex min-h-5 items-center gap-3 text-sm text-muted-foreground" aria-live="polite">
        {pending ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Updating…
          </span>
        ) : (
          <span>
            {total.toLocaleString()} {filters.view === "grid" ? (total === 1 ? "day" : "days") : total === 1 ? "attempt" : "attempts"}
          </span>
        )}
        {active && (
          <button
            type="button"
            onClick={() => update({ preset: "all", from: null, to: null, students: [], skills: [], book: null, tags: [], q: "" })}
            className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline"
          >
            <X className="size-3.5" aria-hidden /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
