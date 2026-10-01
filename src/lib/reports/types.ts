import type { CoreSkill, Skill } from "../constants";

export type SkillStats = {
  attempts: number;
  /** Attempts that carry a band. */
  banded: number;
  avgBand: number | null;
  bestBand: number | null;
  /** Mean of the last (up to) 5 bands in the period — "current level". */
  recentBand: number | null;
  avgPercent: number | null;
  minutes: number;
};

export type WeekPoint = {
  week: string; // Monday
  bands: Partial<Record<CoreSkill, number>>;
  counts: Partial<Record<Skill, number>>;
};

export type StudentReport = {
  studentId: string | null; // null for the combined "all students" report
  name: string;
  color: string;
  targetBand: number | null;
  overallBand: number | null;
  attempts: number;
  practiceDays: number;
  minutes: number;
  currentStreak: number;
  longestStreak: number;
  skills: Record<Skill, SkillStats>;
  previous: {
    overallBand: number | null;
    attempts: number;
    practiceDays: number;
    avgBand: Partial<Record<Skill, number | null>>;
  } | null;
  weeks: WeekPoint[];
  calendar: { date: string; count: number }[];
  books: {
    /** Series name/prefix; missing in snapshots saved before book series existed (= Cambridge). */
    series?: string;
    prefix?: string;
    book: number | null;
    test: number | null;
    attempts: number;
    avgBand: number | null;
    avgPercent: number | null;
  }[];
  tags: { tag: string; count: number }[];
  parts: { skill: "listening" | "reading"; part: string; attempts: number; avgPercent: number | null }[];
  lastPractised: Partial<Record<Skill, string>>;
  insights: string[];
};

export type ReportPayload = {
  version: 1;
  generatedAt: string;
  today: string;
  period: {
    type: "month" | "year" | "all" | "custom";
    from: string | null;
    to: string | null;
    label: string;
    phrase: string;
    previousPhrase: string;
  };
  /** The headline report: one student, or everyone combined. */
  combined: StudentReport;
  /** Per-student reports (one entry for a single-student scope). */
  students: StudentReport[];
};
