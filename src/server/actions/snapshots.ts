"use server";

import { and, desc, eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { today } from "@/lib/dates";
import { parsePeriod } from "@/lib/reports/period";
import type { ActionResult } from "@/lib/validation";
import { db } from "@/server/db";
import { reportSnapshots } from "@/server/db/schema";
import { listStudents } from "@/server/queries/students";
import { periodMatch, scopeKeyFor, type SnapshotKind } from "@/server/queries/snapshots";
import { computeReport } from "@/server/reports/compute";
import { AuthError, authorizeStudent } from "@/server/session";

const periodParams = z.object({
  period: z.string().optional(),
  month: z.string().optional(),
  year: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const dashboardInput = periodParams.extend({ scope: z.string().min(1) });

const KEEP_PER_KEY = 10;

async function saveSnapshot(
  kind: SnapshotKind,
  scope: "all" | string[],
  params: z.infer<typeof periodParams>,
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

async function guarded<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Couldn't refresh the report. Please try again." };
  }
}

export async function syncDashboardAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    const input = dashboardInput.safeParse(raw);
    if (!input.success) return { ok: false, error: "Invalid report options." };
    const { scope, ...params } = input.data;
    const res = await saveSnapshot("dashboard", scope === "all" ? "all" : [scope], params, student.id);
    if (res.ok) revalidatePath("/dashboard");
    return res;
  });
}

/** Scoreboard: every student, ranked. Stored as a "compare" snapshot over all student ids. */
export async function syncScoreboardAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    const input = periodParams.safeParse(raw);
    if (!input.success) return { ok: false, error: "Invalid period." };
    const ids = (await listStudents()).map((s) => s.id);
    const res = await saveSnapshot("compare", ids, input.data, student.id);
    if (res.ok) revalidatePath("/scoreboard");
    return res;
  });
}
