"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/validation";
import { listStudents } from "@/server/queries/students";
import { recordActivity } from "@/server/activity";
import { saveSnapshot } from "@/server/reports/store";
import { AuthError, authorizeStudent } from "@/server/session";

const periodParams = z.object({
  period: z.string().optional(),
  month: z.string().optional(),
  year: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const dashboardInput = periodParams.extend({ scope: z.string().min(1) });

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
    if (res.ok) {
      await recordActivity({ kind: "report", action: "synced", studentId: student.id, label: "a dashboard" });
      revalidatePath("/dashboard");
    }
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
    if (res.ok) {
      await recordActivity({ kind: "report", action: "synced", studentId: student.id, label: "the scoreboard" });
      revalidatePath("/scoreboard");
    }
    return res;
  });
}
