import "server-only";
import { sql, type SQL } from "drizzle-orm";
import type { DateRange } from "@/lib/dates";
import { addDays } from "@/lib/dates";
import { assembleReport, type RawAggregates, type ReportStudent } from "@/lib/reports/assemble";
import { previousRange, type Period } from "@/lib/reports/period";
import type { ReportPayload } from "@/lib/reports/types";
import { db } from "@/server/db";

/**
 * All heavy lifting happens in Postgres: ~11 small GROUP BY queries run in
 * parallel and return a few hundred rows at most, which are then shaped in
 * TypeScript (lib/reports/assemble.ts). Only called from "Sync & refresh".
 */
export async function computeReport(
  students: ReportStudent[],
  scope: "all" | "students",
  period: Period,
  today: string,
): Promise<ReportPayload> {
  const ids = students.map((s) => s.id);
  if (!ids.length) throw new Error("No students in scope");

  const inScope = sql`a.student_id in (${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )})`;
  const within = (r: DateRange | null): SQL => (r ? sql`and a.date between ${r.from}::date and ${r.to}::date` : sql``);
  const cur = within(period.range);
  const prevRange = previousRange(period);
  // Never count the future (e.g. the rest of the current month) for streaks / last-practised.
  const upToToday = sql`and a.date <= ${today}::date`;

  const q = async <T,>(query: SQL) => (await db.execute(query)).rows as T[];

  const skillStatsSql = (extra: SQL) => sql`
    select a.student_id::text as "studentId", a.skill::text as skill,
      count(*)::int as attempts,
      count(a.band)::int as banded,
      coalesce(sum(a.band), 0)::float8 as "bandSum",
      max(a.band)::float8 as "bestBand",
      coalesce(sum(a.percent), 0)::float8 as "pctSum",
      count(a.percent)::int as "pctCount",
      coalesce(sum(a.time_taken_min), 0)::int as minutes
    from attempts a
    where ${inScope} ${extra}
    group by a.student_id, a.skill`;

  const [skillStats, prevSkillStats, recentBands, weekly, daily, prevDaily, streakDays, books, tags, parts, lastPractised] =
    await Promise.all([
      q<RawAggregates["skillStats"][number]>(skillStatsSql(cur)),
      prevRange ? q<RawAggregates["skillStats"][number]>(skillStatsSql(within(prevRange))) : Promise.resolve([]),
      q<RawAggregates["recentBands"][number]>(sql`
        select "studentId", skill, band from (
          select a.student_id::text as "studentId", a.skill::text as skill, a.band::float8 as band,
            row_number() over (partition by a.student_id, a.skill order by a.date desc, a.created_at desc) as rn
          from attempts a
          where ${inScope} ${cur} and a.band is not null
        ) t where rn <= 5`),
      q<RawAggregates["weekly"][number]>(sql`
        select a.student_id::text as "studentId", date_trunc('week', a.date)::date::text as week, a.skill::text as skill,
          count(*)::int as attempts, coalesce(sum(a.band), 0)::float8 as "bandSum", count(a.band)::int as banded
        from attempts a
        where ${inScope} ${cur}
        group by 1, 2, 3`),
      q<RawAggregates["daily"][number]>(sql`
        select a.student_id::text as "studentId", a.date::text as date, count(*)::int as count
        from attempts a
        where ${inScope} ${cur}
        group by 1, 2`),
      prevRange
        ? q<RawAggregates["prevDaily"][number]>(sql`
            select distinct a.student_id::text as "studentId", a.date::text as date
            from attempts a where ${inScope} ${within(prevRange)}`)
        : Promise.resolve([]),
      q<RawAggregates["streakDays"][number]>(sql`
        select distinct a.student_id::text as "studentId", a.date::text as date
        from attempts a
        where ${inScope} and a.date between ${addDays(today, -400)}::date and ${today}::date`),
      q<RawAggregates["books"][number]>(sql`
        select a.student_id::text as "studentId", a.book, a.test,
          count(*)::int as attempts,
          coalesce(sum(a.band), 0)::float8 as "bandSum", count(a.band)::int as banded,
          coalesce(sum(a.percent), 0)::float8 as "pctSum", count(a.percent)::int as "pctCount"
        from attempts a
        where ${inScope} ${cur} and a.book is not null
        group by 1, 2, 3`),
      q<RawAggregates["tags"][number]>(sql`
        select a.student_id::text as "studentId", t.tag, count(*)::int as count
        from attempts a, unnest(a.mistake_tags) as t(tag)
        where ${inScope} ${cur}
        group by 1, 2`),
      q<RawAggregates["parts"][number]>(sql`
        select a.student_id::text as "studentId", a.skill::text as skill, a.part,
          count(*)::int as attempts,
          coalesce(sum(a.percent), 0)::float8 as "pctSum", count(a.percent)::int as "pctCount"
        from attempts a
        where ${inScope} ${cur} and a.skill in ('listening', 'reading') and a.part ~ '^[1-4]$'
        group by 1, 2, 3`),
      q<RawAggregates["lastPractised"][number]>(sql`
        select a.student_id::text as "studentId", a.skill::text as skill, max(a.date)::text as date
        from attempts a
        where ${inScope} ${upToToday}
        group by 1, 2`),
    ]);

  return assembleReport(
    { skillStats, prevSkillStats, recentBands, weekly, daily, prevDaily, streakDays, books, tags, parts, lastPractised },
    students,
    scope,
    period,
    today,
  );
}
