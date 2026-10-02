import "server-only";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { today } from "@/lib/dates";
import { parsePeriod, periodToParams, type Period } from "@/lib/reports/period";
import type { ActionResult } from "@/lib/validation";
import { db } from "@/server/db";
import { reportSnapshots } from "@/server/db/schema";
import { latestSnapshot, periodMatch, scopeKeyFor, type LoadedSnapshot, type SnapshotKind } from "@/server/queries/snapshots";
import { listStudents } from "@/server/queries/students";
import { computeReport } from "./compute";

export type PeriodParams = { period?: string; month?: string; year?: string; from?: string; to?: string };

const KEEP_PER_KEY = 10;

export async function saveSnapshot(
  kind: SnapshotKind,
  scope: "all" | string[],
  params: PeriodParams,
  generatedBy: string,
): Promise<ActionResult<{ id: string }>> {
  const all = await listStudents();
  const chosen = scope === "all" ? all : all.filter((s) => scope.includes(s.id));
  if (scope !== "all" && chosen.length !== scope.length) return { ok: false, error: "Unknown student selected." };
  if (!chosen.length) return { ok: false, error: "There are no students yet." };

  const date = today();
  const period = parsePeriod(params, date);
  const payload = await computeReport(
    chosen.map((s) => ({ id: s.id, name: s.name, color: s.color, targetBand: s.targetBand })),
    scope === "all" ? "all" : "students",
    period,
    date,
  );
  const scopeKey = scopeKeyFor(kind, scope);
  const [row] = await db
    .insert(reportSnapshots)
    .values({
      kind,
      scopeType: scope === "all" ? "all" : chosen.length === 1 ? "student" : "students",
      studentIds: scope === "all" ? [] : chosen.map((s) => s.id).sort(),
      scopeKey,
      periodType: period.type,
      periodStart: period.range?.from ?? null,
      periodEnd: period.range?.to ?? null,
      payload,
      generatedBy,
    })
    .returning({ id: reportSnapshots.id });

  // Keep history small on the free tier: the newest few per scope + period.
  const keep = db
    .select({ id: reportSnapshots.id })
    .from(reportSnapshots)
    .where(and(eq(reportSnapshots.kind, kind), eq(reportSnapshots.scopeKey, scopeKey), periodMatch(period)))
    .orderBy(desc(reportSnapshots.generatedAt))
    .limit(KEEP_PER_KEY);
  await db
    .delete(reportSnapshots)
    .where(
      and(
        eq(reportSnapshots.kind, kind),
        eq(reportSnapshots.scopeKey, scopeKey),
        periodMatch(period),
        notInArray(reportSnapshots.id, keep),
      ),
    );

  return { ok: true, data: { id: row!.id } };
}


/**
 * The latest saved snapshot, or — the first time a view is opened — a freshly
 * computed one. After that, reports only change via Sync & refresh.
 */
export async function latestOrCreateSnapshot(
  kind: SnapshotKind,
  scope: "all" | string[],
  period: Period,
  generatedBy: string,
): Promise<LoadedSnapshot | null> {
  const key = scopeKeyFor(kind, scope);
  const existing = await latestSnapshot(kind, key, period);
  if (existing) return existing;
  const res = await saveSnapshot(kind, scope, periodToParams(period), generatedBy);
  if (!res.ok) return null;
  return latestSnapshot(kind, key, period);
}
