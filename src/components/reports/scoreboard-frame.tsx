"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { syncScoreboardAction } from "@/server/actions/snapshots";
import { PeriodPicker, type PeriodParams } from "./period-picker";
import { SnapshotFrame } from "./snapshot-frame";

type Props = {
  period: PeriodParams;
  today: string;
  lastSynced: string | null;
  syncedBy: string | null;
  snapshotId: string | null;
  children: React.ReactNode;
};

export function ScoreboardFrame({ period, today, lastSynced, syncedBy, snapshotId, children }: Props) {
  const router = useRouter();
  const [, start] = useTransition();

  function navigate(next: PeriodParams) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    start(() => router.push(`/scoreboard?${p.toString()}`, { scroll: false }));
  }

  return (
    <SnapshotFrame
      sync={() => syncScoreboardAction(period)}
      lastSynced={lastSynced}
      syncedBy={syncedBy}
      exportHref={snapshotId ? `/api/export/snapshots/${snapshotId}` : null}
      controls={<PeriodPicker value={period} today={today} onChange={navigate} />}
    >
      {children}
    </SnapshotFrame>
  );
}
