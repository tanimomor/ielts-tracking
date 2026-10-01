import { describe, expect, it } from "vitest";
import {
  LISTENING_TABLE,
  READING_TABLE,
  computePercent,
  isValidBand,
  overallBand,
  rawToBand,
  resolveBand,
  roundIelts,
} from "./scoring";

describe("rawToBand — Listening", () => {
  const expected: [number, number][] = [
    [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
    [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
  ];

  it.each(expected)("raw %i is band %d at the boundary", (raw, band) => {
    expect(rawToBand("listening", raw, 40)).toBe(band);
  });

  it.each(expected.slice(0, -1).map(([raw], i) => [raw - 1, expected[i + 1][1]]))(
    "raw %i (one below a boundary) drops to band %d",
    (raw, band) => {
      expect(rawToBand("listening", raw, 40)).toBe(band);
    },
  );

  it("handles the extremes", () => {
    expect(rawToBand("listening", 40, 40)).toBe(9);
    expect(rawToBand("listening", 3, 40)).toBeNull();
    expect(rawToBand("listening", 0, 40)).toBeNull();
  });

  it("matches the exported table", () => {
    expect(LISTENING_TABLE.map(([r, b]) => [r, b])).toEqual(expected);
  });
});

describe("rawToBand — Reading (Academic)", () => {
  const expected: [number, number][] = [
    [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
    [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
  ];

  it.each(expected)("raw %i is band %d at the boundary", (raw, band) => {
    expect(rawToBand("reading", raw, 40)).toBe(band);
  });

  it.each(expected.slice(0, -1).map(([raw], i) => [raw - 1, expected[i + 1][1]]))(
    "raw %i (one below a boundary) drops to band %d",
    (raw, band) => {
      expect(rawToBand("reading", raw, 40)).toBe(band);
    },
  );

  it("handles the extremes", () => {
    expect(rawToBand("reading", 40, 40)).toBe(9);
    expect(rawToBand("reading", 3, 40)).toBeNull();
  });

  it("matches the exported table", () => {
    expect(READING_TABLE.map(([r, b]) => [r, b])).toEqual(expected);
  });

  it("differs from Listening where the tables differ", () => {
    expect(rawToBand("listening", 32, 40)).toBe(7.5);
    expect(rawToBand("reading", 32, 40)).toBe(7);
    expect(rawToBand("listening", 15, 40)).toBe(4.5);
    expect(rawToBand("reading", 15, 40)).toBe(5);
  });
});

describe("rawToBand — no band cases", () => {
  it("returns null for partial tests", () => {
    expect(rawToBand("listening", 9, 10)).toBeNull();
    expect(rawToBand("reading", 12, 13)).toBeNull();
  });
  it("returns null for other skills", () => {
    expect(rawToBand("writing", 30, 40)).toBeNull();
    expect(rawToBand("speaking", 30, 40)).toBeNull();
    expect(rawToBand("other", 30, 40)).toBeNull();
  });
  it("returns null for missing or invalid raw scores", () => {
    expect(rawToBand("reading", null, 40)).toBeNull();
    expect(rawToBand("reading", undefined, 40)).toBeNull();
    expect(rawToBand("reading", 41, 40)).toBeNull();
    expect(rawToBand("reading", -1, 40)).toBeNull();
    expect(rawToBand("reading", 30.5, 40)).toBeNull();
  });
});

describe("roundIelts", () => {
  it.each([
    [6, 6],
    [6.1, 6],
    [6.125, 6],
    [6.24, 6],
    [6.25, 6.5], // .25 rounds up to .5
    [6.375, 6.5],
    [6.5, 6.5],
    [6.625, 6.5],
    [6.74, 6.5],
    [6.75, 7], // .75 rounds up to the next whole band
    [6.875, 7],
    [8.75, 9],
    [0, 0],
  ])("%d → %d", (input, expected) => {
    expect(roundIelts(input)).toBe(expected);
  });

  it("is robust to float noise from averaging", () => {
    expect(roundIelts(6.2499999999999)).toBe(6.5);
    expect(roundIelts((6.1 + 6.4) / 2)).toBe(6.5);
  });
});

describe("overallBand", () => {
  it("averages the four skills with IELTS rounding", () => {
    expect(overallBand({ listening: 6.5, reading: 6.5, writing: 5, speaking: 7 })).toBe(6.5); // 6.25
    expect(overallBand({ listening: 4, reading: 3.5, writing: 4, speaking: 4 })).toBe(4); // 3.875
    expect(overallBand({ listening: 6.5, reading: 6.5, writing: 5.5, speaking: 6 })).toBe(6); // 6.125
  });

  it("rounds .125 down, .25 up, .625 down and .75 up", () => {
    expect(overallBand({ listening: 6, reading: 6, writing: 6, speaking: 6.5 })).toBe(6); // 6.125
    expect(overallBand({ listening: 6, reading: 6, writing: 6.5, speaking: 6.5 })).toBe(6.5); // 6.25
    expect(overallBand({ listening: 6.5, reading: 6.5, writing: 6.5, speaking: 7 })).toBe(6.5); // 6.625
    expect(overallBand({ listening: 6.5, reading: 6.5, writing: 7, speaking: 7 })).toBe(7); // 6.75
  });

  it("needs all four skills", () => {
    expect(overallBand({ listening: 7, reading: 7, writing: 6 })).toBeNull();
    expect(overallBand({ listening: 7, reading: 7, writing: 6, speaking: null })).toBeNull();
  });
});

describe("computePercent", () => {
  it("rounds to two decimals", () => {
    expect(computePercent(32, 40)).toBe(80);
    expect(computePercent(9, 13)).toBe(69.23);
    expect(computePercent(2, 3)).toBe(66.67);
  });
  it("returns null without a usable total", () => {
    expect(computePercent(null, 40)).toBeNull();
    expect(computePercent(5, null)).toBeNull();
    expect(computePercent(5, 0)).toBeNull();
  });
});

describe("isValidBand", () => {
  it("accepts 0–9 in half steps", () => {
    for (let b = 0; b <= 9; b += 0.5) expect(isValidBand(b)).toBe(true);
  });
  it("rejects anything else", () => {
    for (const b of [-0.5, 9.5, 6.25, 6.1, Number.NaN]) expect(isValidBand(b)).toBe(false);
  });
});

describe("resolveBand", () => {
  it("derives Listening/Reading from the raw score and ignores a typed band", () => {
    expect(resolveBand({ skill: "listening", rawScore: 30, total: 40, band: 9 })).toBe(7);
    expect(resolveBand({ skill: "reading", rawScore: 10, total: 13, band: 9 })).toBeNull();
  });
  it("uses the entered band for Writing/Speaking", () => {
    expect(resolveBand({ skill: "writing", band: 6.5 })).toBe(6.5);
    expect(resolveBand({ skill: "speaking", band: 7 })).toBe(7);
    expect(resolveBand({ skill: "speaking", band: 7.25 })).toBeNull();
    expect(resolveBand({ skill: "writing" })).toBeNull();
  });
  it("never bands 'other'", () => {
    expect(resolveBand({ skill: "other", band: 6 })).toBeNull();
  });
});
