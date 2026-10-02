"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SeriesInfo } from "@/lib/books";
import { SKILLS, SKILL_LABELS } from "@/lib/constants";
import { hasMaterial, materialToParams, type MaterialFilter } from "@/lib/material";
import { cn } from "@/lib/utils";

const ANY = "any";

/** "Compare on": book → volume → test → part (+ skill). Lives in the URL. */
export function MaterialFilters({
  value,
  series,
  periodParams,
}: {
  value: MaterialFilter;
  series: SeriesInfo[];
  periodParams: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const selected = value.book ? series.find((s) => s.id === value.book!.seriesId) : undefined;

  function go(next: MaterialFilter) {
    const p = new URLSearchParams({ ...periodParams, ...materialToParams(next) });
    start(() => router.push(`/scoreboard?${p.toString()}`, { scroll: false }));
  }

  const active = hasMaterial(value) || value.skill != null;
  const highlight = "border-primary/50 bg-primary-soft/40";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-70")} aria-busy={pending}>
      <span className="text-sm font-medium text-muted-foreground">Compare on</span>
      <Select
        value={value.book ? String(value.book.seriesId) : ANY}
        onValueChange={(v) => v && go({ ...value, book: v === ANY ? null : { seriesId: Number(v), volume: null }, test: null })}
      >
        <SelectTrigger className={cn("w-40", value.book && highlight)} aria-label="Book">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any book</SelectItem>
          {series.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected?.volumes != null && (
        <Select
          value={value.book?.volume != null ? String(value.book.volume) : ANY}
          onValueChange={(v) => v && go({ ...value, book: { seriesId: selected.id, volume: v === ANY ? null : Number(v) } })}
        >
          <SelectTrigger className={cn("w-40", value.book?.volume != null && highlight)} aria-label="Volume">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>All volumes</SelectItem>
            {Array.from({ length: selected.volumes }, (_, i) => selected.volumes! - i).map((v) => (
              <SelectItem key={v} value={String(v)}>
                {selected.name} {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {selected && (
        <Select value={value.test != null ? String(value.test) : ANY} onValueChange={(v) => v && go({ ...value, test: v === ANY ? null : Number(v) })}>
          <SelectTrigger className={cn("w-32", value.test != null && highlight)} aria-label="Test">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>Any test</SelectItem>
            {Array.from({ length: selected.testsPerBook }, (_, i) => i + 1).map((t) => (
              <SelectItem key={t} value={String(t)}>
                Test {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={value.part ?? ANY} onValueChange={(v) => v && go({ ...value, part: v === ANY ? null : v })}>
        <SelectTrigger className={cn("w-32", value.part && highlight)} aria-label="Part">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any part</SelectItem>
          {["1", "2", "3", "4"].map((p) => (
            <SelectItem key={p} value={p}>
              Part {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.skill ?? ANY} onValueChange={(v) => v && go({ ...value, skill: v === ANY ? null : (v as MaterialFilter["skill"]) })}>
        <SelectTrigger className={cn("w-36", value.skill && highlight)} aria-label="Skill">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All skills</SelectItem>
          {SKILLS.map((s) => (
            <SelectItem key={s} value={s}>
              {SKILL_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <Button variant="ghost" size="sm" onClick={() => go({ book: null, test: null, part: null, skill: null })}>
          <X aria-hidden /> Clear
        </Button>
      )}
    </div>
  );
}
