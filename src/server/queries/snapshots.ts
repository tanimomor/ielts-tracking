import "server-only";
import { and, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Period } from "@/lib/reports/period";
import type { ReportPayload } from "@/lib/reports/types";
import { db } from "@/server/db";
import { reportSnapshots } from "@/server/db/schema";

export type SnapshotKind = "dashboard" | "compare";

export function scopeKeyFor(kind: SnapshotKind, scope: "all" | string[]): string {
  if (scope === "all") return "all";
  const ids = [...scope].sort();
  return kind === "dashboard" && ids.length === 1 ? `s:${ids[0]}` : `c:${ids.join(",")}`;
}

export function periodMatch(period: Period): SQL {
  return and(
    eq(reportSnapshots.periodType, period.type),
    period.range ? eq(reportSnapshots.periodStart, period.range.from) : isNull(reportSnapshots.periodStart),
    period.range ? eq(reportSnapshots.periodEnd, period.range.to) : isNull(reportSnapshots.periodEnd),
  )!;
}

export type LoadedSnapshot = { id: string; generatedAt: Date; payload: ReportPayload; generatedBy: string | null };

export async function latestSnapshot(kind: SnapshotKind, scopeKey: string, period: Period): Promise<LoadedSnapshot | null> {
  const [row] = await db
    .select({
      id: reportSnapshots.id,
      generatedAt: reportSnapshots.generatedAt,
      payload: reportSnapshots.payload,
      generatedBy: reportSnapshots.generatedBy,
    })
    .from(reportSnapshots)
    .where(and(eq(reportSnapshots.kind, kind), eq(reportSnapshots.scopeKey, scopeKey), periodMatch(period)))
    .orderBy(desc(reportSnapshots.generatedAt))
    .limit(1);
  if (!row) return null;
  const payload = row.payload as ReportPayload;
  if (payload?.version !== 1) return null;
  return { ...row, payload };
}

export async function getSnapshot(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(reportSnapshots).where(eq(reportSnapshots.id, id)).limit(1);
  return row ?? null;
}
