import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import { DashboardFrame } from "@/components/reports/dashboard-controls";
import type { PeriodParams } from "@/components/reports/period-picker";
import { ReportView } from "@/components/reports/report-view";
import { formatDateTime, today } from "@/lib/dates";
import { parsePeriod, periodToParams } from "@/lib/reports/period";
import { latestSnapshot, scopeKeyFor } from "@/server/queries/snapshots";
import { listStudents } from "@/server/queries/students";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

/** Reads the latest saved snapshot only — reports are never computed on page load. */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { student } = await requireStudent();
  const params = await searchParams;
  const date = today();
  const students = await listStudents();

  const requested = typeof params.scope === "string" ? params.scope : student.id;
  const scope = requested === "all" || students.some((s) => s.id === requested) ? requested : student.id;
  const period = parsePeriod(params, date);
  const snapshot = await latestSnapshot("dashboard", scopeKeyFor("dashboard", scope === "all" ? "all" : [scope]), period);
  const syncedBy = snapshot?.generatedBy ? students.find((s) => s.id === snapshot.generatedBy)?.name ?? null : null;
  const scopeName = scope === "all" ? "All students" : students.find((s) => s.id === scope)?.name;

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader title="Dashboard" description={`${scopeName} · ${period.label}`} />
      <DashboardFrame
        scope={scope}
        period={periodToParams(period) as PeriodParams}
        today={date}
        students={students.map((s) => ({ id: s.id, name: s.name, color: s.color, isMe: s.id === student.id }))}
        lastSynced={snapshot ? formatDateTime(snapshot.generatedAt) : null}
        syncedBy={syncedBy}
        snapshotId={snapshot?.id ?? null}
      >
        {snapshot ? (
          <ReportView payload={snapshot.payload} />
        ) : (
          <EmptyState
            icon={RefreshCw}
            title="No report for this view yet"
            description="Reports are saved snapshots, so they load instantly and don't change while you look at them. Press Sync & refresh to build one from the latest attempts."
            className="py-20"
          />
        )}
      </DashboardFrame>
    </PageContainer>
  );
}
