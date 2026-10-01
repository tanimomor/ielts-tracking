import { describe, expect, it } from "vitest";
import type { Skill } from "../constants";
import { assembleReport, estimateOverall, type RawAggregates } from "./assemble";
import { makePeriod, parsePeriod, previousRange } from "./period";

const TODAY = "2026-10-20";
const A = { id: "a", name: "Anika", color: "#2a78d6", targetBand: 7 };
const B = { id: "b", name: "Rafi", color: "#eb6834", targetBand: 7.5 };

function raw(partial: Partial<RawAggregates> = {}): RawAggregates {
  return {
    skillStats: [],
    prevSkillStats: [],
    recentBands: [],
    weekly: [],
    daily: [],
    prevDaily: [],
    streakDays: [],
    books: [],
    tags: [],
    parts: [],
    lastPractised: [],
    ...partial,
  };
}

const stat = (studentId: string, skill: Skill, bands: number[], extra: Partial<RawAggregates["skillStats"][number]> = {}) => ({
  studentId,
  skill,
  attempts: bands.length,
  banded: bands.length,
  bandSum: bands.reduce((a, b) => a + b, 0),
  bestBand: bands.length ? Math.max(...bands) : null,
  pctSum: 0,
  pctCount: 0,
  minutes: 0,
  ...extra,
});

describe("period", () => {
  it("defaults to this month", () => {
    const p = parsePeriod({}, TODAY);
    expect(p.range).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(p.phrase).toBe("this month");
    expect(previousRange(p)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
  it("handles explicit months, years, custom and all", () => {
    expect(parsePeriod({ period: "month", month: "2026-02" }, TODAY).range).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(parsePeriod({ period: "month", month: "2026-02" }, TODAY).phrase).toBe("in Feb 2026");
    expect(previousRange(parsePeriod({ period: "year", year: "2025" }, TODAY))).toEqual({ from: "2024-01-01", to: "2024-12-31" });
    const c = parsePeriod({ period: "custom", from: "2026-10-11", to: "2026-10-20" }, TODAY);
    expect(previousRange(c)).toEqual({ from: "2026-10-01", to: "2026-10-10" });
    expect(parsePeriod({ period: "all" }, TODAY).range).toBeNull();
    expect(previousRange(makePeriod("all", null))).toBeNull();
  });
});

describe("estimateOverall", () => {
  it("rounds each skill like a real result, then averages", () => {
    expect(estimateOverall({ listening: 7.1, reading: 6.6, writing: 6, speaking: 6.4 })).toBe(6.5); // 7,6.5,6,6.5 → 6.5
    expect(estimateOverall({ listening: 7, reading: 7 })).toBeNull();
  });
});

describe("assembleReport", () => {
  const period = parsePeriod({}, TODAY);
  const data = raw({
    skillStats: [
      stat("a", "listening", [7, 7.5]),
      stat("a", "reading", [6.5, 6.5]),
      stat("a", "writing", [6]),
      stat("a", "speaking", [6.5]),
      stat("b", "reading", [7.5]),
      { ...stat("b", "listening", []), attempts: 2, pctSum: 160, pctCount: 2 },
    ],
    prevSkillStats: [stat("a", "reading", [6, 6]), stat("a", "listening", [7.5])],
    recentBands: [
      { studentId: "a", skill: "reading", band: 6.5 },
      { studentId: "a", skill: "reading", band: 7 },
    ],
    daily: [
      { studentId: "a", date: "2026-10-18", count: 2 },
      { studentId: "a", date: "2026-10-19", count: 2 },
      { studentId: "a", date: "2026-10-20", count: 2 },
      { studentId: "b", date: "2026-10-20", count: 3 },
    ],
    streakDays: [
      { studentId: "a", date: "2026-10-18" },
      { studentId: "a", date: "2026-10-19" },
      { studentId: "a", date: "2026-10-20" },
    ],
    tags: [
      { studentId: "a", tag: "t/f/ng", count: 3 },
      { studentId: "b", tag: "t/f/ng", count: 2 },
      { studentId: "b", tag: "spelling", count: 4 },
    ],
    parts: [
      { studentId: "a", skill: "reading", part: "1", attempts: 3, pctSum: 240, pctCount: 3 },
      { studentId: "a", skill: "reading", part: "3", attempts: 2, pctSum: 110, pctCount: 2 },
    ],
    lastPractised: [
      { studentId: "a", skill: "listening", date: "2026-10-20" },
      { studentId: "a", skill: "reading", date: "2026-10-19" },
      { studentId: "a", skill: "writing", date: "2026-10-11" },
      { studentId: "a", skill: "speaking", date: "2026-10-18" },
      { studentId: "b", skill: "listening", date: "2026-10-20" },
      { studentId: "b", skill: "reading", date: "2026-10-20" },
    ],
  });

  it("builds a single-student report", () => {
    const p = assembleReport(data, [A], "students", period, TODAY);
    const r = p.combined;
    expect(r.studentId).toBe("a");
    expect(r.attempts).toBe(6);
    expect(r.skills.listening.avgBand).toBe(7.25);
    expect(r.skills.listening.bestBand).toBe(7.5);
    expect(r.skills.reading.recentBand).toBe(6.75);
    expect(r.overallBand).toBe(6.5); // 7.25→7.5, 6.5, 6, 6.5 → 6.625 → 6.5
    expect(r.practiceDays).toBe(3);
    expect(r.currentStreak).toBe(3);
    expect(r.previous?.avgBand.reading).toBe(6);
    expect(r.tags[0]).toEqual({ tag: "t/f/ng", count: 3 });
  });

  it("writes plain-sentence insights", () => {
    const r = assembleReport(data, [A], "students", period, TODAY).combined;
    expect(r.insights).toContain("Estimated overall band is 6.5 — 0.5 below the 7.0 target.");
    expect(r.insights).toContain("Reading is up 0.5 this month (6.0 → 6.5).");
    expect(r.insights).toContain("Writing hasn't been practised in 9 days.");
    expect(r.insights).toContain("Reading passage 3 is the weakest section at 55% (best: passage 1, 80%).");
    expect(r.insights).toContain("On a 3-day practice streak.");
  });

  it("combines students for the 'all' scope", () => {
    const p = assembleReport(data, [A, B], "all", period, TODAY);
    expect(p.students).toHaveLength(2);
    expect(p.combined.studentId).toBeNull();
    expect(p.combined.attempts).toBe(9);
    expect(p.combined.skills.reading.avgBand).toBe(6.83);
    expect(p.combined.skills.listening.avgPercent).toBe(80);
    expect(p.combined.practiceDays).toBe(3);
    expect(p.combined.tags[0]).toEqual({ tag: "t/f/ng", count: 5 });
    expect(p.combined.targetBand).toBeNull(); // targets differ
    expect(p.students[1].insights.some((s) => s.includes("Writing and Speaking haven't been logged yet"))).toBe(true);
  });

  it("handles an empty period", () => {
    const r = assembleReport(raw(), [A], "students", period, TODAY).combined;
    expect(r.attempts).toBe(0);
    expect(r.overallBand).toBeNull();
    expect(r.insights[0]).toBe("No practice logged this month.");
  });
});
