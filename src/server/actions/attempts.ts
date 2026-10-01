"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buildCode } from "@/lib/code";
import { resolveBand } from "@/lib/scoring";
import { attemptInputSchema, fieldErrors, type ActionResult, type AttemptInput } from "@/lib/validation";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { AuthError, authorizeStudent } from "@/server/session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Saved = { id: string; code: string; band: number | null };

/** Derived columns: code from book/test/part, band from the scoring rules. */
function toRow(input: AttemptInput) {
  const scored = input.skill === "listening" || input.skill === "reading";
  const rawScore = scored || input.skill === "other" ? input.rawScore : null;
  const total = rawScore == null ? null : input.total;
  return {
    date: input.date,
    skill: input.skill,
    book: input.book,
    test: input.book == null ? null : input.test,
    part: input.book == null || input.test == null ? null : input.part,
    code: buildCode(input.book, input.test, input.part),
    rawScore,
    total,
    band: resolveBand({ skill: input.skill, rawScore, total, band: input.band }),
    timeTakenMin: input.timeTakenMin,
    mistakeTags: [...new Set(input.mistakeTags)],
    notes: input.notes,
  };
}

function revalidate() {
  revalidatePath("/log");
  revalidatePath("/attempts");
  revalidatePath("/students", "layout");
}

async function guarded<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong saving that. Please try again." };
  }
}

export async function createAttemptAction(raw: unknown): Promise<ActionResult<Saved>> {
  return guarded(async () => {
    // Always the signed-in student: the client never chooses whose attempt this is.
    const { student } = await authorizeStudent();
    const parsed = attemptInputSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }
    const [row] = await db
      .insert(attempts)
      .values({ ...toRow(parsed.data), studentId: student.id })
      .returning({ id: attempts.id, code: attempts.code, band: attempts.band });
    revalidate();
    return { ok: true, data: row! };
  });
}

export async function updateAttemptAction(id: string, raw: unknown): Promise<ActionResult<Saved>> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    if (!UUID_RE.test(id)) return { ok: false, error: "That attempt doesn't exist." };
    const parsed = attemptInputSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }
    const [row] = await db
      .update(attempts)
      .set({ ...toRow(parsed.data), updatedAt: new Date() })
      .where(and(eq(attempts.id, id), eq(attempts.studentId, student.id)))
      .returning({ id: attempts.id, code: attempts.code, band: attempts.band });
    if (!row) return { ok: false, error: "You can only edit your own attempts." };
    revalidate();
    return { ok: true, data: row! };
  });
}

export async function deleteAttemptAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    if (!UUID_RE.test(id)) return { ok: false, error: "That attempt doesn't exist." };
    const deleted = await db
      .delete(attempts)
      .where(and(eq(attempts.id, id), eq(attempts.studentId, student.id)))
      .returning({ id: attempts.id });
    if (!deleted.length) return { ok: false, error: "You can only delete your own attempts." };
    revalidate();
    return { ok: true, data: null };
  });
}
