import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  currentStreak,
  dhakaDate,
  diffDays,
  eachDay,
  endOfMonth,
  formatRange,
  isDateStr,
  longestStreak,
  presetRange,
  startOfWeek,
} from "./dates";

describe("dhakaDate", () => {
  it("uses Asia/Dhaka (UTC+6), not the host zone", () => {
    expect(dhakaDate(new Date("2026-10-01T17:59:00Z"))).toBe("2026-10-01");
    expect(dhakaDate(new Date("2026-10-01T18:00:00Z"))).toBe("2026-10-02");
    expect(dhakaDate(new Date("2026-12-31T18:30:00Z"))).toBe("2027-01-01");
  });
});

describe("date arithmetic", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
  it("adds months, clamping the day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15");
  });
  it("diffs days", () => {
    expect(diffDays("2026-09-22", "2026-10-01")).toBe(9);
    expect(diffDays("2026-10-01", "2026-10-01")).toBe(0);
  });
  it("finds Monday week starts", () => {
    expect(startOfWeek("2026-10-01")).toBe("2026-09-28"); // Thu → Mon
    expect(startOfWeek("2026-09-28")).toBe("2026-09-28");
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28"); // Sunday
  });
  it("ends months", () => {
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2026-12-01")).toBe("2026-12-31");
  });
  it("lists days inclusively", () => {
    expect(eachDay("2026-09-29", "2026-10-01")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  });
});

describe("isDateStr", () => {
  it("validates real calendar dates", () => {
    expect(isDateStr("2026-10-01")).toBe(true);
    expect(isDateStr("2026-02-30")).toBe(false);
    expect(isDateStr("2026-1-01")).toBe(false);
    expect(isDateStr(20261001)).toBe(false);
  });
});

describe("presetRange", () => {
  it("computes week, month and year", () => {
    expect(presetRange("week", "2026-10-01")).toEqual({ from: "2026-09-28", to: "2026-10-04" });
    expect(presetRange("month", "2026-10-01")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(presetRange("year", "2026-10-01")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(presetRange("all", "2026-10-01")).toBeNull();
  });
  it("labels ranges", () => {
    expect(formatRange({ from: "2026-10-01", to: "2026-10-31" })).toBe("Oct 2026");
    expect(formatRange({ from: "2026-01-01", to: "2026-12-31" })).toBe("2026");
    expect(formatRange(null)).toBe("All time");
  });
});

describe("streaks", () => {
  const days = ["2026-09-27", "2026-09-29", "2026-09-30", "2026-10-01"];
  it("counts the current streak including today", () => {
    expect(currentStreak(days, "2026-10-01")).toBe(3);
  });
  it("keeps the streak alive until the day is over", () => {
    expect(currentStreak(days, "2026-10-02")).toBe(3);
    expect(currentStreak(days, "2026-10-03")).toBe(0);
  });
  it("finds the longest streak", () => {
    expect(longestStreak(days)).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});
