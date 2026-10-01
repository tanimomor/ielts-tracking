import { CORE_SKILLS, SKILLS, type CoreSkill, type Skill } from "../constants";
import { currentStreak, longestStreak } from "../dates";
import { overallBand, roundIelts } from "../scoring";
import { generateInsights } from "./insights";
import type { Period } from "./period";
import type { ReportPayload, SkillStats, StudentReport, WeekPoint } from "./types";

/** Rows as they come back from the SQL aggregates (all grouped by student). */
export type RawAggregates = {
  skillStats: SkillAggRow[];
  prevSkillStats: SkillAggRow[];
  recentBands: { studentId: string; skill: Skill; band: number }[];
  weekly: { studentId: string; week: string; skill: Skill; attempts: number; bandSum: number; banded: number }[];
  daily: { studentId: string; date: string; count: number }[];
  prevDaily: { studentId: string; date: string }[];
  streakDays: { studentId: string; date: string }[];
  books: {
    studentId: string;
    series: string;
    prefix: string;
    book: number | null;
    test: number | null;
    attempts: number;
    bandSum: number;
    banded: number;
    pctSum: number;
    pctCount: number;
  }[];
  tags: { studentId: string; tag: string; count: number }[];
  parts: { studentId: string; skill: "listening" | "reading"; part: string; attempts: number; pctSum: number; pctCount: number }[];
  lastPractised: { studentId: string; skill: Skill; date: string }[];
};

export type SkillAggRow = {
  studentId: string;
  skill: Skill;
  attempts: number;
  banded: number;
  bandSum: number;
  bestBand: number | null;
  pctSum: number;
  pctCount: number;
  minutes: number;
};

export type ReportStudent = { id: string; name: string; color: string; targetBand: number };

const round2 = (n: number) => Math.round(n * 100) / 100;
const avg = (sum: number, n: number) => (n > 0 ? round2(sum / n) : null);

function emptySkill(): SkillStats {
  return { attempts: 0, banded: 0, avgBand: null, bestBand: null, recentBand: null, avgPercent: null, minutes: 0 };
}

function skillTable(rows: SkillAggRow[], recent: RawAggregates["recentBands"]): Record<Skill, SkillStats> {
  const out = Object.fromEntries(SKILLS.map((s) => [s, emptySkill()])) as Record<Skill, SkillStats>;
  const acc = new Map<Skill, { bandSum: number; pctSum: number; pctCount: number }>();
  for (const r of rows) {
    const s = out[r.skill];
    const a = acc.get(r.skill) ?? { bandSum: 0, pctSum: 0, pctCount: 0 };
    s.attempts += r.attempts;
    s.banded += r.banded;
    s.minutes += r.minutes;
    s.bestBand = r.bestBand == null ? s.bestBand : Math.max(s.bestBand ?? 0, r.bestBand);
    a.bandSum += r.bandSum;
    a.pctSum += r.pctSum;
    a.pctCount += r.pctCount;
    acc.set(r.skill, a);
  }
  for (const [skill, a] of acc) {
    out[skill].avgBand = avg(a.bandSum, out[skill].banded);
    out[skill].avgPercent = avg(a.pctSum, a.pctCount);
  }
  const recentBy = new Map<Skill, number[]>();
  for (const r of recent) recentBy.set(r.skill, [...(recentBy.get(r.skill) ?? []), r.band]);
  for (const [skill, bands] of recentBy) out[skill].recentBand = avg(bands.reduce((a, b) => a + b, 0), bands.length);
  return out;
}

/** Overall band from per-skill averages, IELTS-rounded per skill first (like a real result). */
export function estimateOverall(avgBands: Partial<Record<CoreSkill, number | null>>): number | null {
  const rounded = Object.fromEntries(
    CORE_SKILLS.map((s) => [s, avgBands[s] == null ? null : roundIelts(avgBands[s]!)]),
  ) as Record<CoreSkill, number | null>;
  return overallBand(rounded);
}

function buildOne(
  raw: RawAggregates,
  include: (studentId: string) => boolean,
  meta: { studentId: string | null; name: string; color: string; targetBand: number | null },
  period: Period,
  today: string,
): StudentReport {
  const pick = <T extends { studentId: string }>(rows: T[]) => rows.filter((r) => include(r.studentId));

  const skills = skillTable(pick(raw.skillStats), pick(raw.recentBands));
  const attempts = SKILLS.reduce((n, s) => n + skills[s].attempts, 0);
  const minutes = SKILLS.reduce((n, s) => n + skills[s].minutes, 0);

  const days = new Map<string, number>();
  for (const d of pick(raw.daily)) days.set(d.date, (days.get(d.date) ?? 0) + d.count);
  const streakSet = new Set(pick(raw.streakDays).map((d) => d.date));

  let previous: StudentReport["previous"] = null;
  if (period.range) {
    const prev = skillTable(pick(raw.prevSkillStats), []);
    previous = {
      overallBand: estimateOverall(Object.fromEntries(CORE_SKILLS.map((s) => [s, prev[s].avgBand]))),
      attempts: SKILLS.reduce((n, s) => n + prev[s].attempts, 0),
      practiceDays: new Set(pick(raw.prevDaily).map((d) => d.date)).size,
      avgBand: Object.fromEntries(SKILLS.map((s) => [s, prev[s].avgBand])),
    };
  }

  const weekMap = new Map<string, { bands: Map<Skill, [number, number]>; counts: Map<Skill, number> }>();
  for (const w of pick(raw.weekly)) {
    const e = weekMap.get(w.week) ?? { bands: new Map(), counts: new Map() };
    e.counts.set(w.skill, (e.counts.get(w.skill) ?? 0) + w.attempts);
    if (w.banded) {
      const [s, n] = e.bands.get(w.skill) ?? [0, 0];
      e.bands.set(w.skill, [s + w.bandSum, n + w.banded]);
    }
    weekMap.set(w.week, e);
  }
  const weeks: WeekPoint[] = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, e]) => ({
      week,
      bands: Object.fromEntries(
        [...e.bands.entries()].filter(([s]) => s !== "other").map(([s, [sum, n]]) => [s, round2(sum / n)]),
      ),
      counts: Object.fromEntries(e.counts.entries()),
    }));

  const bookMap = new Map<string, StudentReport["books"][number] & { bandSum: number; pctSum: number; pctCount: number; banded: number }>();
  for (const b of pick(raw.books)) {
    const key = `${b.series}:${b.book ?? ""}:${b.test ?? ""}`;
    const e = bookMap.get(key) ?? {
      series: b.series,
      prefix: b.prefix,
      book: b.book,
      test: b.test,
      attempts: 0,
      avgBand: null,
      avgPercent: null,
      bandSum: 0,
      banded: 0,
      pctSum: 0,
      pctCount: 0,
    };
    e.attempts += b.attempts;
    e.bandSum += b.bandSum;
    e.banded += b.banded;
    e.pctSum += b.pctSum;
    e.pctCount += b.pctCount;
    bookMap.set(key, e);
  }
  const books = [...bookMap.values()]
    .map(({ series, prefix, book, test, attempts: n, bandSum, banded, pctSum, pctCount }) => ({
      series,
      prefix,
      book,
      test,
      attempts: n,
      avgBand: avg(bandSum, banded),
      avgPercent: avg(pctSum, pctCount),
    }))
    .sort(
      (a, b) =>
        Number(b.prefix === "c") - Number(a.prefix === "c") ||
        (a.series ?? "").localeCompare(b.series ?? "") ||
        (b.book ?? 0) - (a.book ?? 0) ||
        (a.test ?? 0) - (b.test ?? 0),
    );

  const tagMap = new Map<string, number>();
  for (const t of pick(raw.tags)) tagMap.set(t.tag, (tagMap.get(t.tag) ?? 0) + t.count);
  const tags = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 12);

  const partMap = new Map<string, { skill: "listening" | "reading"; part: string; attempts: number; pctSum: number; pctCount: number }>();
  for (const p of pick(raw.parts)) {
    const key = `${p.skill}:${p.part}`;
    const e = partMap.get(key) ?? { skill: p.skill, part: p.part, attempts: 0, pctSum: 0, pctCount: 0 };
    e.attempts += p.attempts;
    e.pctSum += p.pctSum;
    e.pctCount += p.pctCount;
    partMap.set(key, e);
  }
  const parts = [...partMap.values()]
    .map(({ skill, part, attempts: n, pctSum, pctCount }) => ({ skill, part, attempts: n, avgPercent: avg(pctSum, pctCount) }))
    .sort((a, b) => a.skill.localeCompare(b.skill) || a.part.localeCompare(b.part));

  const lastPractised: Partial<Record<Skill, string>> = {};
  for (const l of pick(raw.lastPractised)) {
    if (!lastPractised[l.skill] || l.date > lastPractised[l.skill]!) lastPractised[l.skill] = l.date;
  }

  const report: StudentReport = {
    ...meta,
    overallBand: estimateOverall(Object.fromEntries(CORE_SKILLS.map((s) => [s, skills[s].avgBand]))),
    attempts,
    practiceDays: days.size,
    minutes,
    currentStreak: currentStreak(streakSet, today),
    longestStreak: longestStreak(days.keys()),
    skills,
    previous,
    weeks,
    calendar: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    books,
    tags,
    parts,
    lastPractised,
    insights: [],
  };
  report.insights = generateInsights(report, period, today);
  return report;
}

export function assembleReport(
  raw: RawAggregates,
  students: ReportStudent[],
  scope: "all" | "students",
  period: Period,
  today: string,
  generatedAt: Date = new Date(),
): ReportPayload {
  const perStudent = students.map((s) =>
    buildOne(raw, (id) => id === s.id, { studentId: s.id, name: s.name, color: s.color, targetBand: s.targetBand }, period, today),
  );
  const ids = new Set(students.map((s) => s.id));
  const targets = new Set(students.map((s) => s.targetBand));
  const combined =
    scope === "students" && perStudent.length === 1
      ? perStudent[0]
      : buildOne(
          raw,
          (id) => ids.has(id),
          {
            studentId: null,
            name: "All students",
            color: "#7c3aed",
            targetBand: targets.size === 1 ? [...targets][0] : null,
          },
          period,
          today,
        );

  return {
    version: 1,
    generatedAt: generatedAt.toISOString(),
    today,
    period: {
      type: period.type,
      from: period.range?.from ?? null,
      to: period.range?.to ?? null,
      label: period.label,
      phrase: period.phrase,
      previousPhrase: period.previousPhrase,
    },
    combined,
    students: perStudent,
  };
}
