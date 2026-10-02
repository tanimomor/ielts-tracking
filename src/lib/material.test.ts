import { describe, expect, it } from "vitest";
import { buildMaterialBoard, hasMaterial, materialToParams, parseMaterial, type MaterialAttempt } from "./material";

const T = { id: "t", name: "Tanim", color: "#2a78d6" };
const H = { id: "h", name: "Habiba", color: "#eb6834" };
const base = { date: "2026-09-01", test: 1, part: null, rawScore: null, total: null, percent: null, band: null };
const at = (o: Partial<MaterialAttempt> & Pick<MaterialAttempt, "studentId" | "skill" | "code">): MaterialAttempt => ({ ...base, ...o });

describe("parseMaterial", () => {
  it("reads book, test, part and skill", () => {
    expect(parseMaterial({ book: "1:17", test: "2", part: "3", skill: "reading" })).toEqual({
      book: { seriesId: 1, volume: 17 },
      test: 2,
      part: "3",
      skill: "reading",
    });
  });
  it("ignores a test without a book and junk values", () => {
    expect(parseMaterial({ test: "2", part: "9", skill: "x" })).toEqual({ book: null, test: null, part: null, skill: null });
  });
  it("round-trips and knows when it's active", () => {
    const m = parseMaterial({ book: "3", part: "2" });
    expect(parseMaterial(materialToParams(m))).toEqual(m);
    expect(hasMaterial(m)).toBe(true);
    expect(hasMaterial(parseMaterial({ skill: "reading" }))).toBe(false);
    expect(hasMaterial(parseMaterial({ part: "2" }))).toBe(true);
  });
});

describe("buildMaterialBoard", () => {
  const rows = [
    at({ studentId: "t", skill: "listening", code: "c17t1", rawScore: 32, total: 40, percent: 80, band: 7.5 }),
    at({ studentId: "t", skill: "listening", code: "c17t1", rawScore: 34, total: 40, percent: 85, band: 8, date: "2026-09-05" }),
    at({ studentId: "h", skill: "listening", code: "c17t1", rawScore: 30, total: 40, percent: 75, band: 7 }),
    at({ studentId: "h", skill: "reading", code: "c17t1p2", rawScore: 11, total: 13, percent: 84.62, part: "2" }),
    at({ studentId: "t", skill: "reading", code: "c17t1p2", rawScore: 9, total: 13, percent: 69.23, part: "2" }),
    at({ studentId: "h", skill: "writing", code: "c17t1", band: 6.5 }),
  ];
  const board = buildMaterialBoard(rows, [T, H]);

  it("groups by code and skill, keeping each student's best", () => {
    expect(board.items.map((i) => i.label)).toEqual(["c17t1 · Listening", "c17t1p2 · Reading", "c17t1 · Writing"]);
    const l = board.items[0];
    expect(l.cells.t).toMatchObject({ attempts: 2, score: 8 });
    expect(l.cells.t?.best.rawScore).toBe(34);
    expect(l.leaders).toEqual(["t"]);
    expect(board.items[1].leaders).toEqual(["h"]); // compared by % when there is no band
    expect(board.items[2].leaders).toEqual([]); // only one person did it
  });

  it("summarises and ranks students", () => {
    const [first, second] = board.summaries;
    expect(first.student.id).toBe("t"); // 1–1 on wins → higher average band
    expect(first).toMatchObject({ attempts: 3, items: 2, wins: 1, bestBand: 8, avgBand: 7.75, lastDate: "2026-09-05" });
    expect(second).toMatchObject({ attempts: 3, items: 3, wins: 1, bestBand: 7, avgBand: 6.75, bestPercent: 84.62 });
  });

  it("handles no data", () => {
    const empty = buildMaterialBoard([], [T, H]);
    expect(empty.items).toEqual([]);
    expect(empty.summaries.every((s) => s.attempts === 0 && s.avgPercent == null)).toBe(true);
  });
});
