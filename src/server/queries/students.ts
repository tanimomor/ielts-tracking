import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { BAND_THRESHOLDS, COUNT_THRESHOLDS, type FirstBandRow, type NthAttemptRow } from "@/lib/milestones";
import { db } from "@/server/db";
import { students, type Student } from "@/server/db/schema";

export const listStudents = cache(async (): Promise<Student[]> => {
  return db.select().from(students).orderBy(asc(students.createdAt), asc(students.name));
});

export const getStudent = cache(async (id: string): Promise<Student | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return row ?? null;
});

export type StudentSummary = Student & { attempts: number; lastPractised: string | null; practiceDays: number };

/** Light per-student counts for the students index (not a report). */
export async function listStudentSummaries(): Promise<StudentSummary[]> {
  const rows = await db.execute<{ id: string; attempts: number; last: string | null; days: number }>(sql`
    select s.id::text as id, count(a.id)::int as attempts, max(a.date)::text as last, count(distinct a.date)::int as days
    from students s left join attempts a on a.student_id = s.id
    group by s.id`);
  const by = new Map(rows.rows.map((r) => [r.id, r]));
  return (await listStudents()).map((s) => ({
    ...s,
    attempts: by.get(s.id)?.attempts ?? 0,
    lastPractised: by.get(s.id)?.last ?? null,
    practiceDays: by.get(s.id)?.days ?? 0,
  }));
}

export async function studentMilestoneRows(studentId: string) {
  const [firsts, nth] = await Promise.all([
    db.execute<FirstBandRow>(sql`
      select distinct on (a.skill, t.th) a.skill::text as skill, t.th::float8 as threshold, a.date::text as date, a.code
      from attempts a
      join (select unnest(${sql.raw(`array[${BAND_THRESHOLDS.join(",")}]`)}::numeric[]) as th) t on a.band >= t.th
      where a.student_id = ${studentId}::uuid and a.skill in ('listening', 'reading', 'writing', 'speaking')
      order by a.skill, t.th, a.date, a.created_at`),
    db.execute<NthAttemptRow>(sql`
      select n::int as n, date from (
        select a.date::text as date, row_number() over (order by a.date, a.created_at) as n
        from attempts a where a.student_id = ${studentId}::uuid
      ) x where n in (${sql.raw(COUNT_THRESHOLDS.join(","))})`),
  ]);
  return { firsts: firsts.rows, nth: nth.rows };
}
