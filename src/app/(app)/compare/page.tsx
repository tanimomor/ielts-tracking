import type { Metadata } from "next";
import { GitCompareArrows, RefreshCw, Users } from "lucide-react";
import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import { CompareFrame } from "@/components/reports/compare-frame";
import { CompareView } from "@/components/reports/compare-view";
import type { PeriodParams } from "@/components/reports/period-picker";
import { formatDateTime, today } from "@/lib/dates";
import { parsePeriod, periodToParams } from "@/lib/reports/period";
import { latestSnapshot, scopeKeyFor } from "@/server/queries/snapshots";
import { listStudents } from "@/server/queries/students";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Compare" };

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  await requireStudent();
  const params = await searchParams;
  const date = today();
  const students = await listStudents();

  if (students.length < 2) {
    return (
      <PageContainer>
        <PageHeader title="Compare" />
        <EmptyState icon={Users} title="Comparisons need two students" description="Once another invited student signs in, you can compare progress here." />
      </PageContainer>
    );
  }

  const requested = typeof params.students === "string" ? params.students.split(",") : students.map((s) => s.id);
  const selected = students.map((s) => s.id).filter((id) => requested.includes(id));
  const period = parsePeriod(params, date);
  const snapshot = selected.length >= 2 ? await latestSnapshot("compare", scopeKeyFor("compare", selected), period) : null;
  const syncedBy = snapshot?.generatedBy ? students.find((s) => s.id === snapshot.generatedBy)?.name ?? null : null;

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader title="Compare" description={`Read-only view of everyone's progress · ${period.label}`} />
      <CompareFrame
        selected={selected}
        period={periodToParams(period) as PeriodParams}
        today={date}
        students={students.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        lastSynced={snapshot ? formatDateTime(snapshot.generatedAt) : null}
        syncedBy={syncedBy}
        snapshotId={snapshot?.id ?? null}
      >
        {selected.length < 2 ? (
          <EmptyState icon={GitCompareArrows} title="Pick at least two students" description="Tap the names above to choose who to compare." className="py-20" />
        ) : snapshot ? (
          <CompareView payload={snapshot.payload} />
        ) : (
          <EmptyState
            icon={RefreshCw}
            title="No comparison saved for this selection yet"
            description="Press Sync & refresh to build it from the latest attempts. It stays fixed until someone syncs again."
            className="py-20"
          />
        )}
      </CompareFrame>
    </PageContainer>
  );
}
