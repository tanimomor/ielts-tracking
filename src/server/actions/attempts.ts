"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buildCode } from "@/lib/code";
import { resolveBand } from "@/lib/scoring";
import { attemptInputSchema, fieldErrors, type ActionResult, type AttemptInput } from "@/lib/validation";
import { db } from "@/server/db";
import { attempts, bookSeries } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import { AuthError, authorizeStudent } from "@/server/session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Saved = { id: string; code: string; band: number | null };

/** Derived columns: code from series/volume/test/part, band from the scoring rules. */
async function toRow(input: AttemptInput): Promise<{ row: ReturnType<typeof rowFrom> } | { error: string; field: string }> {
  let series: { prefix: string; volumes: number | null; testsPerBook: number; name: string } | undefined;
  if (input.seriesId != null) {
    [series] = await db
      .select({ prefix: bookSeries.prefix, volumes: bookSeries.volumes, testsPerBook: bookSeries.testsPerBook, name: bookSeries.name })
      .from(bookSeries)
      .where(eq(bookSeries.id, input.seriesId))
      .limit(1);
    if (!series) return { error: "That book no longer exists.", field: "seriesId" };
    if (series.volumes == null && input.book != null) return { error: `${series.name} has no volume numbers.`, field: "book" };
    if (series.volumes != null && input.book != null && input.book > series.volumes) {
      return { error: `${series.name} only goes up to ${series.volumes}.`, field: "book" };
    }
    if (input.test != null && input.test > series.testsPerBook) {
      return { error: `${series.name} has ${series.testsPerBook} tests per book.`, field: "test" };
    }
  }
  return { row: rowFrom(input, series?.prefix ?? null) };
}

function rowFrom(input: AttemptInput, prefix: string | null) {
  const scored = input.skill === "listening" || input.skill === "reading";
  const rawScore = scored || input.skill === "other" ? input.rawScore : null;
  const total = rawScore == null ? null : input.total;
  const seriesId = prefix ? input.seriesId : null;
  const book = seriesId == null ? null : input.book;
  const test = seriesId == null ? null : input.test;
  const part = test == null ? null : input.part;
  return {
    date: input.date,
    skill: input.skill,
    seriesId,
    book,
    test,
    part,
    code: buildCode(prefix, book, test, part),
    rawScore,
    total,
    band: resolveBand({ skill: input.skill, rawScore, total, band: input.band }),
    timeTakenMin: input.timeTakenMin,
    mistakeTags: [...new Set(input.mistakeTags)],
    notes: input.notes,
  };
}

/** "c17t1 · Listening · band 7.5" for toasts on other screens. */
function describe(r: { code: string; skill: string; band: number | null; rawScore: number | null; total: number | null }) {
  const score = r.band != null ? `band ${r.band.toFixed(1)}` : r.rawScore != null && r.total != null ? `${r.rawScore}/${r.total}` : "";
  return [r.code, r.skill[0]!.toUpperCase() + r.skill.slice(1), score].filter(Boolean).join(" · ");
}

function revalidate() {
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
    const built = await toRow(parsed.data);
    if ("error" in built) return { ok: false, error: built.error, fieldErrors: { [built.field]: built.error } };
    const [row] = await db
      .insert(attempts)
      .values({ ...built.row, studentId: student.id })
      .returning({ id: attempts.id, code: attempts.code, band: attempts.band });
    await recordActivity({ kind: "attempt", action: "created", studentId: student.id, label: describe(built.row) });
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
    const built = await toRow(parsed.data);
    if ("error" in built) return { ok: false, error: built.error, fieldErrors: { [built.field]: built.error } };
    const [row] = await db
      .update(attempts)
      .set({ ...built.row, updatedAt: new Date() })
      .where(and(eq(attempts.id, id), eq(attempts.studentId, student.id)))
      .returning({ id: attempts.id, code: attempts.code, band: attempts.band });
    if (!row) return { ok: false, error: "You can only edit your own attempts." };
    await recordActivity({ kind: "attempt", action: "updated", studentId: student.id, label: describe(built.row) });
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
      .returning({ id: attempts.id, code: attempts.code, skill: attempts.skill });
    if (!deleted.length) return { ok: false, error: "You can only delete your own attempts." };
    await recordActivity({ kind: "attempt", action: "deleted", studentId: student.id, label: deleted[0].code || deleted[0].skill });
    revalidate();
    return { ok: true, data: null };
  });
}
