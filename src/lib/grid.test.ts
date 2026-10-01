import { describe, expect, it } from "vitest";
import { cellLabel } from "./format";
import { buildGrid } from "./grid";

const A = { id: "a", name: "Anika", color: "#2563eb" };
const B = { id: "b", name: "Rafi", color: "#be185d" };
const base = { rawScore: null, total: null, percent: null, band: null };

describe("cellLabel", () => {
  it("mirrors the sheet", () => {
    expect(cellLabel({ ...base, code: "c17t1", skill: "reading", band: 7.5, rawScore: 32, total: 40, percent: 80 })).toBe(
      "c17t1 (7.5)",
    );
    expect(cellLabel({ ...base, code: "c17t1p2", skill: "listening", rawScore: 9, total: 10, percent: 90 })).toBe(
      "c17t1p2 (9/10)",
    );
    expect(cellLabel({ ...base, code: "", skill: "other" })).toBe("Other");
  });
});

describe("buildGrid", () => {
  const attempts = [
    { ...base, date: "2026-10-01", studentId: "a", skill: "reading" as const, code: "c17t1", band: 7 },
    { ...base, date: "2026-10-01", studentId: "a", skill: "reading" as const, code: "c17t2", band: 7.5 },
    { ...base, date: "2026-09-30", studentId: "b", skill: "writing" as const, code: "c16t1", band: 6 },
  ];

  it("groups columns by student then skill and fills cells", () => {
    const g = buildGrid(attempts, ["2026-10-01", "2026-09-30"], [A, B]);
    expect(g.columns.map((c) => `${c.student.name}:${c.skill}`)).toEqual([
      "Anika:listening",
      "Anika:reading",
      "Anika:writing",
      "Anika:speaking",
      "Rafi:listening",
      "Rafi:reading",
      "Rafi:writing",
      "Rafi:speaking",
    ]);
    expect(g.rows[0].cells[1]).toEqual(["c17t1 (7.0)", "c17t2 (7.5)"]);
    expect(g.rows[1].cells[6]).toEqual(["c16t1 (6.0)"]);
  });

  it("honours skill and student filters", () => {
    const g = buildGrid(attempts, ["2026-10-01"], [A, B], { skills: ["reading"], studentIds: ["a"] });
    expect(g.columns).toHaveLength(1);
    expect(g.rows[0].cells[0]).toHaveLength(2);
  });
});
