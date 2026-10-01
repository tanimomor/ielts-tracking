"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { syncDashboardAction } from "@/server/actions/snapshots";
import { PeriodPicker, type PeriodParams } from "./period-picker";
import { SnapshotFrame } from "./snapshot-frame";

type Props = {
  scope: string;
  period: PeriodParams;
  today: string;
  students: { id: string; name: string; color: string; isMe: boolean }[];
  lastSynced: string | null;
  syncedBy: string | null;
  snapshotId: string | null;
  children: React.ReactNode;
};

export function DashboardFrame({ scope, period, today, students, lastSynced, syncedBy, snapshotId, children }: Props) {
  const router = useRouter();
  const [, start] = useTransition();

  function navigate(next: { scope?: string; period?: PeriodParams }) {
    const p = new URLSearchParams();
    p.set("scope", next.scope ?? scope);
    for (const [k, v] of Object.entries(next.period ?? period)) if (v) p.set(k, v);
    start(() => router.push(`/dashboard?${p.toString()}`, { scroll: false }));
  }

  return (
    <SnapshotFrame
      sync={() => syncDashboardAction({ scope, ...period })}
      lastSynced={lastSynced}
      syncedBy={syncedBy}
      exportHref={snapshotId ? `/api/export/snapshots/${snapshotId}` : null}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={scope} onValueChange={(s) => navigate({ scope: s })}>
            <SelectTrigger className="w-44" aria-label="Scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                  {s.isMe ? " (you)" : ""}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="all">All students</SelectItem>
            </SelectContent>
          </Select>
          <PeriodPicker value={period} today={today} onChange={(p) => navigate({ period: p })} />
        </div>
      }
    >
      {children}
    </SnapshotFrame>
  );
}
