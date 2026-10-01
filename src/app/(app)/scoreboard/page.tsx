import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import type { PeriodParams } from "@/components/reports/period-picker";
import { ScoreboardFrame } from "@/components/reports/scoreboard-frame";
import { ScoreboardView } from "@/components/reports/scoreboard-view";
import { formatDateTime, today } from "@/lib/dates";
import { parsePeriod, periodToParams } from "@/lib/reports/period";
import { latestSnapshot, scopeKeyFor } from "@/server/queries/snapshots";
import { listStudents } from "@/server/queries/students";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Scoreboard" };

/** Everyone ranked, from the latest saved snapshot (Sync & refresh recomputes). */
export default async function ScoreboardPage({ searchParams }: PageProps<"/scoreboard">) {
  await requireStudent();
  const params = await searchParams;
  const date = today();
  const students = await listStudents();
  const period = parsePeriod(params, date);
  const snapshot = await latestSnapshot("compare", scopeKeyFor("compare", students.map((s) => s.id)), period);
  const syncedBy = snapshot?.generatedBy ? students.find((s) => s.id === snapshot.generatedBy)?.name ?? null : null;

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader title="Scoreboard" description={`Who's leading · ${period.label}`} />
      <ScoreboardFrame
        period={periodToParams(period) as PeriodParams}
        today={date}
        lastSynced={snapshot ? formatDateTime(snapshot.generatedAt) : null}
        syncedBy={syncedBy}
        snapshotId={snapshot?.id ?? null}
      >
        {snapshot ? (
          <ScoreboardView payload={snapshot.payload} />
        ) : (
          <EmptyState
            icon={RefreshCw}
            title="No scoreboard for this period yet"
            description="Press Sync & refresh to rank everyone from the latest attempts. It stays fixed until someone syncs again."
            className="py-20"
          />
        )}
      </ScoreboardFrame>
    </PageContainer>
  );
}
