import { describe, expect, it } from "vitest";
import { buildMilestones, nextGoals } from "./milestones";

describe("milestones", () => {
  it("keeps the top two band firsts per skill plus count milestones, newest first", () => {
    const m = buildMilestones(
      [
        { skill: "reading", threshold: 6, date: "2026-07-01", code: "c15t1" },
        { skill: "reading", threshold: 6.5, date: "2026-07-20", code: "c16t2" },
        { skill: "reading", threshold: 7, date: "2026-09-02", code: "c18t1" },
        { skill: "writing", threshold: 6, date: "2026-08-10", code: "" },
      ],
      [
        { n: 1, date: "2026-07-01" },
        { n: 50, date: "2026-08-15" },
      ],
    );
    expect(m.map((x) => x.title)).toEqual([
      "First 7.0 in Reading",
      "50 attempts logged",
      "First 6.0 in Writing",
      "First 6.5 in Reading",
      "First attempt logged",
    ]);
    expect(m[0].detail).toBe("c18t1");
    expect(m[2].detail).toBeUndefined();
  });

  it("suggests the next half band per skill", () => {
    expect(nextGoals({ listening: 7, reading: 6.5, writing: null, speaking: 9 })).toEqual([
      { skill: "listening", band: 7.5 },
      { skill: "reading", band: 7 },
      { skill: "writing", band: 5 },
    ]);
  });
});
