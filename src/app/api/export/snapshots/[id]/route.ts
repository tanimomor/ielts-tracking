import type { ReportPayload } from "@/lib/reports/types";
import { newWorkbook, workbookResponse } from "@/server/excel/common";
import { buildReportWorkbook } from "@/server/excel/report";
import { attemptsForSnapshot } from "@/server/queries/attempts";
import { listSeries } from "@/server/queries/books";
import { getSnapshot } from "@/server/queries/snapshots";
import { AuthError, authorizeStudent } from "@/server/session";

export async function GET(_req: Request, ctx: RouteContext<"/api/export/snapshots/[id]">) {
  try {
    await authorizeStudent();
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: 401 });
    throw e;
  }
  const { id } = await ctx.params;
  const snap = await getSnapshot(id);
  if (!snap) return new Response("Report not found", { status: 404 });

  const payload = snap.payload as ReportPayload;
  const range = payload.period.from && payload.period.to ? { from: payload.period.from, to: payload.period.to } : null;
  const series = await listSeries();
  const detail = await attemptsForSnapshot(snap.scopeType === "all" ? null : snap.studentIds, range, snap.generatedAt);

  const title = snap.kind === "compare" ? "Comparison" : payload.combined.name;
  const wb = newWorkbook();
  buildReportWorkbook(wb, payload, detail, title, new Map(series.map((s) => [s.id, s])));
  const slug = `${snap.kind}-${payload.period.label}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return workbookResponse(wb, `ielts-${slug}.xlsx`);
}
