"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildCode, PART_RE } from "@/lib/code";
import { MAX_TEST, MAX_VOLUME } from "@/lib/books";
import { SKILLS } from "@/lib/constants";
import { MAX_IMPORT_ROWS, duplicateKey } from "@/lib/csv-import";
import { isDateStr, today } from "@/lib/dates";
import { isValidBand, rawToBand } from "@/lib/scoring";
import type { ActionResult } from "@/lib/validation";
import { db } from "@/server/db";
import { attempts, bookSeries, type NewAttempt } from "@/server/db/schema";
import { AuthError, authorizeStudent } from "@/server/session";

const rowSchema = z
  .object({
    line: z.number().int(),
    date: z.string().refine(isDateStr),
    skill: z.enum(SKILLS),
    seriesId: z.number().int().positive().nullable(),
    book: z.number().int().min(1).max(MAX_VOLUME).nullable(),
    test: z.number().int().min(1).max(MAX_TEST).nullable(),
    part: z.string().regex(PART_RE).nullable(),
    rawScore: z.number().int().min(0).nullable(),
    total: z.number().int().min(1).nullable(),
    band: z.number().refine(isValidBand).nullable(),
    notes: z.string().max(2000),
  })
  .refine((r) => r.rawScore == null || (r.total != null && r.rawScore <= r.total));
const rowsSchema = z.array(rowSchema).max(MAX_IMPORT_ROWS);
export type ImportCandidate = z.infer<typeof rowSchema>;

type SeriesRow = { prefix: string; volumes: number | null; testsPerBook: number };

/** Same normalisation the app applies to new attempts; out-of-range book data is dropped. */
function toAttempt(r: ImportCandidate, studentId: string, seriesMap: Map<number, SeriesRow>): NewAttempt {
  const series = r.seriesId != null ? seriesMap.get(r.seriesId) : undefined;
  const book = series && series.volumes != null && r.book != null && r.book <= series.volumes ? r.book : null;
  const test = series && r.test != null && r.test <= series.testsPerBook ? r.test : null;
  const part = test == null ? null : r.part;
  const lr = r.skill === "listening" || r.skill === "reading";
  const band = lr
    ? (rawToBand(r.skill, r.rawScore, r.total) ?? (r.rawScore == null ? r.band : null))
    : r.skill === "other"
      ? null
      : r.band;
  return {
    studentId,
    date: r.date,
    skill: r.skill,
    seriesId: series ? r.seriesId : null,
    book,
    test,
    part,
    code: buildCode(series?.prefix, book, test, part),
    rawScore: r.rawScore,
    total: r.rawScore == null ? null : r.total,
    band,
    notes: r.notes,
    mistakeTags: [],
  };
}

async function existingKeys(studentId: string, rows: NewAttempt[]): Promise<Set<string>> {
  if (!rows.length) return new Set();
  const dates = rows.map((r) => r.date).sort();
  const existing = await db
    .select({
      date: attempts.date,
      skill: attempts.skill,
      code: attempts.code,
      rawScore: attempts.rawScore,
      total: attempts.total,
      band: attempts.band,
    })
    .from(attempts)
    .where(and(eq(attempts.studentId, studentId), gte(attempts.date, dates[0]), lte(attempts.date, dates[dates.length - 1])));
  return new Set(existing.map((e) => duplicateKey(studentId, e)));
}

function classify(studentId: string, rows: NewAttempt[], existing: Set<string>) {
  const seen = new Set<string>();
  return rows.map((r) => {
    const key = duplicateKey(studentId, { ...r, code: r.code ?? "", band: r.band ?? null, rawScore: r.rawScore ?? null, total: r.total ?? null });
    if (existing.has(key)) return "existing" as const;
    if (seen.has(key)) return "in-file" as const;
    seen.add(key);
    return "new" as const;
  });
}

async function prepare(raw: unknown) {
  const { student } = await authorizeStudent();
  const parsed = rowsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Some rows are invalid. Re-upload the file and try again." } as const;
  const date = today();
  const future = parsed.data.find((r) => r.date > date);
  if (future) return { error: `Line ${future.line} is dated in the future.` } as const;
  const seriesRows = await db
    .select({ id: bookSeries.id, prefix: bookSeries.prefix, volumes: bookSeries.volumes, testsPerBook: bookSeries.testsPerBook })
    .from(bookSeries);
  const seriesMap = new Map(seriesRows.map((x) => [x.id, x]));
  const rows = parsed.data.map((r) => toAttempt(r, student.id, seriesMap));
  const status = classify(student.id, rows, await existingKeys(student.id, rows));
  return { student, rows, lines: parsed.data.map((r) => r.line), status } as const;
}

/** Duplicate check for the preview: which of *my* rows already exist. */
export async function checkImportAction(raw: unknown): Promise<ActionResult<{ duplicates: number[] }>> {
  try {
    const p = await prepare(raw);
    if ("error" in p) return { ok: false, error: p.error! };
    return { ok: true, data: { duplicates: p.lines.filter((_, i) => p.status[i] !== "new") } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

/**
 * Inserts the signed-in student's rows only (the client never chooses the
 * owner), skipping anything that already exists, in one transaction.
 */
export async function importAttemptsAction(raw: unknown): Promise<ActionResult<{ inserted: number; skipped: number }>> {
  try {
    const p = await prepare(raw);
    if ("error" in p) return { ok: false, error: p.error! };
    const fresh = p.rows.filter((_, i) => p.status[i] === "new");
    await db.transaction(async (tx) => {
      for (let i = 0; i < fresh.length; i += 500) {
        await tx.insert(attempts).values(fresh.slice(i, i + 500));
      }
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { inserted: fresh.length, skipped: p.rows.length - fresh.length } };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Import failed — nothing was saved. Please try again." };
  }
}
