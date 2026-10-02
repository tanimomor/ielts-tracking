import type { Metadata } from "next";
import { Download, Radio, RefreshCw } from "lucide-react";
import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import { MaterialFilters } from "@/components/reports/material-filters";
import { MaterialView } from "@/components/reports/material-view";
import { PeriodLinks } from "@/components/reports/period-links";
import type { PeriodParams } from "@/components/reports/period-picker";
import { ScoreboardFrame } from "@/components/reports/scoreboard-frame";
import { ScoreboardView } from "@/components/reports/scoreboard-view";
import { Button } from "@/components/ui/button";
import { bookName } from "@/lib/books";
import { SKILL_LABELS } from "@/lib/constants";
import { formatDateTime, today } from "@/lib/dates";
import { buildMaterialBoard, hasMaterial, materialToParams, parseMaterial } from "@/lib/material";
import { parsePeriod, periodToParams } from "@/lib/reports/period";
import { listMaterialAttempts } from "@/server/queries/attempts";
import { listSeries } from "@/server/queries/books";
import { listStudents } from "@/server/queries/students";
import { latestOrCreateSnapshot } from "@/server/reports/store";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Scoreboard" };

/**
 * Two modes:
 * - Overall ranking from the latest saved snapshot (Sync & refresh recomputes).
 * - "Compare on" a book / test / part: a live head-to-head straight from attempts.
 */
export default async function ScoreboardPage({ searchParams }: PageProps<"/scoreboard">) {
  const { student } = await requireStudent();
  const params = await searchParams;
  const date = today();
  const [students, series] = await Promise.all([listStudents(), listSeries()]);
  // The scoreboard opens on all time unless a period is picked.
  const period = parsePeriod(params.period ? params : { ...params, period: "all" }, date);
  const periodParams = periodToParams(period);
  const material = parseMaterial(params);
  const materialMode = hasMaterial(material);

  const selected = material.book ? series.find((s) => s.id === material.book!.seriesId) : undefined;
  const title =
    [
      selected ? bookName(selected, material.book!.volume) : null,
      material.test != null ? `Test ${material.test}` : null,
      material.part ? `Part ${material.part}` : null,
      material.skill ? SKILL_LABELS[material.skill] : null,
    ]
      .filter(Boolean)
      .join(" · ") || "everything";

  const filters = <MaterialFilters value={material} series={series} periodParams={periodParams} />;

  if (materialMode) {
    const rows = await listMaterialAttempts(material, period.range);
    const board = buildMaterialBoard(
      rows,
      students.map((s) => ({ id: s.id, name: s.name, color: s.color })),
    );
    const exportHref = `/api/export/scoreboard?${new URLSearchParams({ ...periodParams, ...materialToParams(material) })}`;
    return (
      <PageContainer className="max-w-7xl">
        <PageHeader title="Scoreboard" description={`Head to head on ${title} · ${period.label}`} />
        <div className="mb-5 grid gap-3 rounded-xl border bg-surface p-3">
          {filters}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PeriodLinks period={periodParams as PeriodParams} today={date} extra={materialToParams(material)} />
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Radio className="size-3.5" aria-hidden /> Live from attempts
              </span>
              <Button asChild variant="outline" size="sm">
                <a href={exportHref} download>
                  <Download aria-hidden /> Export
                </a>
              </Button>
            </div>
          </div>
        </div>
        <MaterialView board={board} title={title} today={date} />
      </PageContainer>
    );
  }

  const snapshot = await latestOrCreateSnapshot("compare", students.map((s) => s.id), period, student.id);
  const syncedBy = snapshot?.generatedBy ? students.find((s) => s.id === snapshot.generatedBy)?.name ?? null : null;

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader title="Scoreboard" description={`Who's leading · ${period.label}`} />
      <div className="mb-4 rounded-xl border bg-surface p-3">{filters}</div>
      <ScoreboardFrame
        period={periodParams as PeriodParams}
        today={date}
        lastSynced={snapshot ? formatDateTime(snapshot.generatedAt) : null}
        syncedBy={syncedBy}
        snapshotId={snapshot?.id ?? null}
      >
        {snapshot ? (
          <ScoreboardView payload={snapshot.payload} />
        ) : (
          <EmptyState icon={RefreshCw} title="Couldn't build the scoreboard" description="Press Sync & refresh to try again." className="py-20" />
        )}
      </ScoreboardFrame>
    </PageContainer>
  );
}
