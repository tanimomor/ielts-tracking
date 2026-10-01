import { describe, expect, it } from "vitest";
import { detectDateOrder, duplicateKey, guessStudent, missingColumns, parseSheet, parseSheetDate } from "./csv-import";

const TODAY = "2026-10-01";
const row = (o: Record<string, string>) => ({
  Timestamp: "",
  Date: "",
  Person: "Anika",
  Skill: "Reading",
  Book: "",
  Test: "",
  Part: "",
  Code: "",
  Raw: "",
  Total: "",
  Percent: "",
  Band: "",
  Notes: "",
  ...o,
});

describe("dates", () => {
  it("detects day/month order", () => {
    expect(detectDateOrder(["03/07/2026", "13/07/2026"])).toBe("dmy");
    expect(detectDateOrder(["7/13/2026 10:00:00"])).toBe("mdy");
    expect(detectDateOrder(["03/07/2026"])).toBeNull();
  });
  it("parses ISO, D/M/Y and M/D/Y", () => {
    expect(parseSheetDate("2026-07-03", "dmy")).toBe("2026-07-03");
    expect(parseSheetDate("3/7/2026", "dmy")).toBe("2026-07-03");
    expect(parseSheetDate("7/3/2026 14:22:01", "mdy")).toBe("2026-07-03");
    expect(parseSheetDate("03.07.26", "dmy")).toBe("2026-07-03");
    expect(parseSheetDate("31/02/2026", "dmy")).toBeNull();
    expect(parseSheetDate("", "dmy")).toBeNull();
  });
});

describe("parseSheet", () => {
  it("reads a full sheet row and derives the band", () => {
    const { rows } = parseSheet([row({ Date: "13/07/2026", Skill: "Listening", Book: "17", Test: "1", Raw: "32", Total: "40", Band: "9" })], { today: TODAY });
    expect(rows[0]).toMatchObject({
      line: 2,
      date: "2026-07-13",
      skill: "listening",
      code: "c17t1",
      rawScore: 32,
      total: 40,
      band: 7.5, // derived from 32/40, not the typed 9
      errors: [],
    });
  });

  it("falls back to the Code column and the Timestamp", () => {
    const { rows } = parseSheet([row({ Timestamp: "13/07/2026 09:10:00", Code: "c16t2p3", Raw: "9/13" })], { today: TODAY });
    expect(rows[0]).toMatchObject({ date: "2026-07-13", book: 16, test: 2, part: "3", rawScore: 9, total: 13, band: null });
  });

  it("keeps sheet bands for writing/speaking and band-only L/R rows", () => {
    const { rows } = parseSheet(
      [
        row({ Date: "2026-07-01", Skill: "W", Band: "6.5" }),
        row({ Date: "2026-07-01", Skill: "R", Band: "7" }),
        row({ Date: "2026-07-01", Skill: "vocab", Band: "7" }),
      ],
      { today: TODAY },
    );
    expect(rows.map((r) => [r.skill, r.band])).toEqual([
      ["writing", 6.5],
      ["reading", 7],
      ["other", null],
    ]);
  });

  it("assumes /40 for full L/R tests with no total", () => {
    const { rows } = parseSheet([row({ Date: "2026-07-01", Raw: "30" })], { today: TODAY });
    expect(rows[0]).toMatchObject({ total: 40, band: 7 });
  });

  it("flags bad rows", () => {
    const { rows } = parseSheet(
      [row({ Date: "nope" }), row({ Date: "2026-12-01" }), row({ Date: "2026-07-01", Raw: "45", Total: "40", Band: "6.3", Book: "99" }), row({ Person: "", Date: "2026-07-01" })],
      { today: TODAY },
    );
    expect(rows[0].errors).toContain("Unreadable date");
    expect(rows[1].errors).toContain("Date is in the future");
    expect(rows[2].errors).toEqual(["Book 99 is out of range", "Score 45/40 is invalid", 'Band "6.3" is invalid']);
    expect(rows[3].errors).toContain("No person");
  });

  it("honours an explicit date order", () => {
    const { rows, dateOrder, ambiguousDates } = parseSheet([row({ Date: "03/07/2026" })], { today: TODAY, dateOrder: "mdy" });
    expect(dateOrder).toBe("mdy");
    expect(rows[0].date).toBe("2026-03-07");
    expect(ambiguousDates).toBe(true);
  });
});

describe("helpers", () => {
  it("reports missing columns", () => {
    expect(missingColumns(["Timestamp", "Person", "Skill"])).toEqual([]);
    expect(missingColumns(["Person"])).toEqual(["Skill", "Date"]);
  });
  it("builds duplicate keys from the attempt's identity", () => {
    const a = { date: "2026-07-01", skill: "reading", code: "c17t1", rawScore: 30, total: 40, band: 7 };
    expect(duplicateKey("s1", a)).toBe(duplicateKey("s1", { ...a }));
    expect(duplicateKey("s1", a)).not.toBe(duplicateKey("s2", a));
    expect(duplicateKey("s1", a)).not.toBe(duplicateKey("s1", { ...a, rawScore: 31 }));
  });
  it("guesses students by name, email or first name", () => {
    const students = [
      { id: "1", name: "Anika Rahman", email: "anika.r@gmail.com" },
      { id: "2", name: "Rafi", email: "rafi99@gmail.com" },
    ];
    expect(guessStudent("anika rahman", students)?.id).toBe("1");
    expect(guessStudent("Anika", students)?.id).toBe("1");
    expect(guessStudent("rafi99", students)?.id).toBe("2");
    expect(guessStudent("Zara", students)).toBeNull();
  });
});
