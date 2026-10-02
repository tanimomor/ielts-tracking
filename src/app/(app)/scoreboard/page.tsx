import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import type { PeriodParams } from "@/components/reports/period-picker";
import { ScoreboardFrame } from "@/components/reports/scoreboard-frame";
import { ScoreboardView } from "@/components/reports/scoreboard-view";
import { formatDateTime, today } from "@/lib/dates";
import { parsePeriod, periodToParams } from "@/lib/reports/period";
import { latestOrCreateSnapshot } from "@/server/reports/store";
import { listStudents } from "@/server/queries/students";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Scoreboard" };

/** Everyone ranked, from the latest saved snapshot (Sync & refresh recomputes). */
export default async function ScoreboardPage({ searchParams }: PageProps<"/scoreboard">) {
  const { student } = await requireStudent();
  const params = await searchParams;
  const date = today();
  const students = await listStudents();
  // The scoreboard opens on all time unless a period is picked.
  const period = parsePeriod(params.period ? params : { ...params, period: "all" }, date);
  const snapshot = await latestOrCreateSnapshot("compare", students.map((s) => s.id), period, student.id);
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
            title="Couldn't build the scoreboard"
            description="Press Sync & refresh to try again."
            className="py-20"
          />
        )}
      </ScoreboardFrame>
    </PageContainer>
  );
}
