"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn, readableTextOn } from "@/lib/utils";
import { syncCompareAction } from "@/server/actions/snapshots";
import { PeriodPicker, type PeriodParams } from "./period-picker";
import { SnapshotFrame } from "./snapshot-frame";

type Props = {
  selected: string[];
  period: PeriodParams;
  today: string;
  students: { id: string; name: string; color: string }[];
  lastSynced: string | null;
  syncedBy: string | null;
  snapshotId: string | null;
  children: React.ReactNode;
};

export function CompareFrame({ selected, period, today, students, lastSynced, syncedBy, snapshotId, children }: Props) {
  const router = useRouter();
  const [, start] = useTransition();

  function navigate(next: { selected?: string[]; period?: PeriodParams }) {
    const p = new URLSearchParams();
    p.set("students", (next.selected ?? selected).join(","));
    for (const [k, v] of Object.entries(next.period ?? period)) if (v) p.set(k, v);
    start(() => router.push(`/compare?${p.toString()}`, { scroll: false }));
  }

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    navigate({ selected: students.map((s) => s.id).filter((s) => next.includes(s)) });
  }

  return (
    <SnapshotFrame
      sync={() => syncCompareAction({ students: selected, ...period })}
      lastSynced={lastSynced}
      syncedBy={syncedBy}
      exportHref={snapshotId ? `/api/export/snapshots/${snapshotId}` : null}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Students to compare" className="flex flex-wrap gap-1.5">
            {students.map((s) => {
              const on = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border bg-background px-3 text-sm font-medium transition-colors hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                    on ? "border-foreground/30 shadow-xs" : "border-dashed text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className="grid size-4 place-items-center rounded-full"
                    style={{ backgroundColor: on ? s.color : "transparent", boxShadow: `inset 0 0 0 2px ${s.color}` }}
                  >
                    {on && <Check className="size-2.5" style={{ color: readableTextOn(s.color) }} strokeWidth={3} />}
                  </span>
                  {s.name}
                </button>
              );
            })}
          </div>
          <PeriodPicker value={period} today={today} onChange={(p) => navigate({ period: p })} />
        </div>
      }
    >
      {children}
    </SnapshotFrame>
  );
}
