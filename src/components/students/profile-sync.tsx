"use client";

import { SnapshotFrame } from "@/components/reports/snapshot-frame";
import { syncDashboardAction } from "@/server/actions/snapshots";

export function ProfileSync({
  studentId,
  lastSynced,
  syncedBy,
  children,
}: {
  studentId: string;
  lastSynced: string | null;
  syncedBy: string | null;
  children: React.ReactNode;
}) {
  return (
    <SnapshotFrame
      sync={() => syncDashboardAction({ scope: studentId, period: "all" })}
      lastSynced={lastSynced}
      syncedBy={syncedBy}
      exportHref={null}
      controls={<span className="px-1 text-sm font-medium">All-time progress</span>}
    >
      {children}
    </SnapshotFrame>
  );
}
