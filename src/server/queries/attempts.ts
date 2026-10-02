import "server-only";
import { and, arrayOverlaps, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { filterRange, type AttemptFilters } from "@/lib/filters";
import { db } from "@/server/db";
import { attempts, students } from "@/server/db/schema";

export async function recentAttemptsFor(studentId: string, limit = 8) {
  return db
    .select()
    .from(attempts)
    .where(eq(attempts.studentId, studentId))
    .orderBy(desc(attempts.date), desc(attempts.createdAt))
    .limit(limit);
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function attemptWhere(f: AttemptFilters): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  const range = filterRange(f);
  if (range) conds.push(gte(attempts.date, range.from), lte(attempts.date, range.to));
  if (f.students.length) conds.push(inArray(attempts.studentId, f.students));
  if (f.skills.length) conds.push(inArray(attempts.skill, f.skills));
  if (f.book != null) {
    conds.push(eq(attempts.seriesId, f.book.seriesId));
    if (f.book.volume != null) conds.push(eq(attempts.book, f.book.volume));
  }
  if (f.tags.length) conds.push(arrayOverlaps(attempts.mistakeTags, f.tags));
  if (f.q) {
    const like = `%${escapeLike(f.q)}%`;
    conds.push(
      or(
        ilike(attempts.code, like),
        ilike(attempts.notes, like),
        ilike(students.name, like),
        sql`exists (select 1 from unnest(${attempts.mistakeTags}) t where t ilike ${like})`,
      ),
    );
  }
  return conds.length ? and(...conds) : undefined;
}

function orderBy(f: AttemptFilters): SQL[] {
  const dir = f.dir === "asc" ? asc : desc;
  const nulls = (col: SQL | typeof attempts.band) =>
    f.dir === "asc" ? sql`${col} asc nulls last` : sql`${col} desc nulls last`;
  const tiebreak = [desc(attempts.date), desc(attempts.createdAt)];
  switch (f.sort) {
    case "student":
      return [dir(students.name), ...tiebreak];
    case "skill":
      return [dir(attempts.skill), ...tiebreak];
    case "code":
      return [dir(attempts.seriesId), dir(attempts.book), dir(attempts.test), dir(attempts.part), ...tiebreak];
    case "score":
      return [nulls(sql`${attempts.rawScore}`), ...tiebreak];
    case "percent":
      return [nulls(sql`${attempts.percent}`), ...tiebreak];
    case "band":
      return [nulls(attempts.band), ...tiebreak];
    default:
      return [dir(attempts.date), dir(attempts.createdAt)];
  }
}

const listColumns = {
  id: attempts.id,
  studentId: attempts.studentId,
  date: attempts.date,
  skill: attempts.skill,
  seriesId: attempts.seriesId,
  book: attempts.book,
  test: attempts.test,
  part: attempts.part,
  code: attempts.code,
  rawScore: attempts.rawScore,
  total: attempts.total,
  percent: attempts.percent,
  band: attempts.band,
  timeTakenMin: attempts.timeTakenMin,
  mistakeTags: attempts.mistakeTags,
  notes: attempts.notes,
  createdAt: attempts.createdAt,
  studentName: students.name,
  studentColor: students.color,
};

export type AttemptListRow = Awaited<ReturnType<typeof listAttempts>>["rows"][number];

export async function listAttempts(f: AttemptFilters) {
  const where = attemptWhere(f);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(listColumns)
      .from(attempts)
      .innerJoin(students, eq(students.id, attempts.studentId))
      .where(where)
      .orderBy(...orderBy(f))
      .limit(f.size)
      .offset((f.page - 1) * f.size),
    db
      .select({ total: count() })
      .from(attempts)
      .innerJoin(students, eq(students.id, attempts.studentId))
      .where(where),
  ]);
  return { rows, total };
}

/** Every matching row (for Excel). Capped to keep a runaway export cheap. */
export async function listAttemptsForExport(f: AttemptFilters, cap = 20_000) {
  return db
    .select(listColumns)
    .from(attempts)
    .innerJoin(students, eq(students.id, attempts.studentId))
    .where(attemptWhere(f))
    .orderBy(...orderBy(f))
    .limit(cap);
}

/** Grid view: a page of distinct dates, then every matching attempt on those dates. */
export async function listGrid(f: AttemptFilters) {
  const where = attemptWhere(f);
  const dir = f.dir === "asc" ? asc : desc;
  const [dateRows, [{ total }]] = await Promise.all([
    db
      .selectDistinct({ date: attempts.date })
      .from(attempts)
      .innerJoin(students, eq(students.id, attempts.studentId))
      .where(where)
      .orderBy(dir(attempts.date))
      .limit(f.size)
      .offset((f.page - 1) * f.size),
    db
      .select({ total: sql<number>`count(distinct ${attempts.date})::int` })
      .from(attempts)
      .innerJoin(students, eq(students.id, attempts.studentId))
      .where(where),
  ]);
  const dates = dateRows.map((r) => r.date);
  if (!dates.length) return { dates, rows: [] as AttemptListRow[], total };
  const rows = await db
    .select(listColumns)
    .from(attempts)
    .innerJoin(students, eq(students.id, attempts.studentId))
    .where(and(where, inArray(attempts.date, dates)))
    .orderBy(dir(attempts.date), asc(attempts.createdAt));
  return { dates, rows, total };
}

/** Distinct (series, volume) pairs that have attempts, for the book filter. */
export async function listBooksUsed(): Promise<{ seriesId: number; volume: number | null }[]> {
  const rows = await db
    .selectDistinct({ seriesId: attempts.seriesId, volume: attempts.book })
    .from(attempts)
    .where(sql`${attempts.seriesId} is not null`)
    .orderBy(asc(attempts.seriesId), desc(attempts.book));
  return rows.map((r) => ({ seriesId: r.seriesId!, volume: r.volume }));
}

/** Attempts behind a snapshot: same scope + period, and created before it was generated. */
export async function attemptsForSnapshot(studentIds: string[] | null, range: { from: string; to: string } | null, generatedAt: Date) {
  const conds: (SQL | undefined)[] = [lte(attempts.createdAt, generatedAt)];
  if (studentIds?.length) conds.push(inArray(attempts.studentId, studentIds));
  if (range) conds.push(gte(attempts.date, range.from), lte(attempts.date, range.to));
  return db
    .select(listColumns)
    .from(attempts)
    .innerJoin(students, eq(students.id, attempts.studentId))
    .where(and(...conds))
    .orderBy(desc(attempts.date), desc(attempts.createdAt))
    .limit(20_000);
}

/** Everyone's attempts on one book / test / part (scoreboard material mode). */
export async function listMaterialAttempts(
  m: { book: { seriesId: number; volume: number | null } | null; test: number | null; part: string | null; skill: string | null },
  range: { from: string; to: string } | null,
) {
  const conds: (SQL | undefined)[] = [];
  if (m.book) {
    conds.push(eq(attempts.seriesId, m.book.seriesId));
    if (m.book.volume != null) conds.push(eq(attempts.book, m.book.volume));
    if (m.test != null) conds.push(eq(attempts.test, m.test));
  }
  if (m.part) conds.push(eq(attempts.part, m.part));
  if (m.skill) conds.push(eq(attempts.skill, m.skill as (typeof attempts.skill.enumValues)[number]));
  if (range) conds.push(gte(attempts.date, range.from), lte(attempts.date, range.to));
  return db
    .select({
      studentId: attempts.studentId,
      date: attempts.date,
      skill: attempts.skill,
      code: attempts.code,
      test: attempts.test,
      part: attempts.part,
      rawScore: attempts.rawScore,
      total: attempts.total,
      percent: attempts.percent,
      band: attempts.band,
    })
    .from(attempts)
    .where(and(...conds))
    .orderBy(asc(attempts.date))
    .limit(5000);
}
