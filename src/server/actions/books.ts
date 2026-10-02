"use server";

import { eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { SeriesInfo } from "@/lib/books";
import { fieldErrors, seriesInputSchema, seriesUpdateSchema, type ActionResult } from "@/lib/validation";
import { db } from "@/server/db";
import { attempts, bookSeries } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import { AuthError, authorizeStudent } from "@/server/session";

const columns = {
  id: bookSeries.id,
  name: bookSeries.name,
  prefix: bookSeries.prefix,
  volumes: bookSeries.volumes,
  testsPerBook: bookSeries.testsPerBook,
};

async function guarded<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Couldn't save the book. Please try again." };
  }
}

/** Books are shared: any signed-in student can add one for everyone. */
export async function createSeriesAction(raw: unknown): Promise<ActionResult<SeriesInfo>> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    const parsed = seriesInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const { name, prefix } = parsed.data;
    const [clash] = await db
      .select({ name: bookSeries.name, prefix: bookSeries.prefix })
      .from(bookSeries)
      .where(or(sql`lower(${bookSeries.name}) = lower(${name})`, eq(bookSeries.prefix, prefix)))
      .limit(1);
    if (clash) {
      return clash.prefix === prefix
        ? { ok: false, error: `The code “${prefix}” is used by ${clash.name}.`, fieldErrors: { prefix: "Already used" } }
        : { ok: false, error: `${clash.name} already exists.`, fieldErrors: { name: "Already exists" } };
    }
    const [row] = await db.insert(bookSeries).values({ ...parsed.data, createdBy: student.id }).returning(columns);
    await recordActivity({ kind: "book", action: "created", studentId: student.id, label: row!.name });
    revalidatePath("/", "layout");
    return { ok: true, data: row! };
  });
}

/** Name, volume count and tests per book can change; the code prefix can't (existing codes use it). */
export async function updateSeriesAction(id: number, raw: unknown): Promise<ActionResult<SeriesInfo>> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    const parsed = seriesUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const [usage] = await db
      .select({
        maxVolume: sql<number | null>`max(${attempts.book})`,
        maxTest: sql<number | null>`max(${attempts.test})`,
      })
      .from(attempts)
      .where(eq(attempts.seriesId, id));
    if (usage?.maxVolume != null && (parsed.data.volumes == null || parsed.data.volumes < usage.maxVolume)) {
      return { ok: false, error: `Volume ${usage.maxVolume} is already logged — keep at least ${usage.maxVolume} volumes.`, fieldErrors: { volumes: `At least ${usage.maxVolume}` } };
    }
    if (usage?.maxTest != null && parsed.data.testsPerBook < usage.maxTest) {
      return { ok: false, error: `Test ${usage.maxTest} is already logged.`, fieldErrors: { testsPerBook: `At least ${usage.maxTest}` } };
    }
    const [dup] = await db
      .select({ id: bookSeries.id })
      .from(bookSeries)
      .where(sql`lower(${bookSeries.name}) = lower(${parsed.data.name}) and ${bookSeries.id} <> ${id}`)
      .limit(1);
    if (dup) return { ok: false, error: "Another book has that name.", fieldErrors: { name: "Already exists" } };
    const [row] = await db.update(bookSeries).set(parsed.data).where(eq(bookSeries.id, id)).returning(columns);
    if (!row) return { ok: false, error: "That book doesn't exist." };
    await recordActivity({ kind: "book", action: "updated", studentId: student.id, label: row.name });
    revalidatePath("/", "layout");
    return { ok: true, data: row };
  });
}
