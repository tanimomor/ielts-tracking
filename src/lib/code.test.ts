import { describe, expect, it } from "vitest";
import { buildCode, normalizePart, parseCode } from "./code";

describe("buildCode", () => {
  it("builds sheet-style codes", () => {
    expect(buildCode(17, 1, "2")).toBe("c17t1p2");
    expect(buildCode(17, 1, null)).toBe("c17t1");
    expect(buildCode(9, 4, "1-3")).toBe("c9t4p1-3");
    expect(buildCode(17, null, "2")).toBe("c17");
    expect(buildCode(null, 1, "2")).toBe("");
  });
});

describe("normalizePart", () => {
  it("accepts single parts and ranges", () => {
    expect(normalizePart("2")).toBe("2");
    expect(normalizePart(" 1 – 3 ")).toBe("1-3");
    expect(normalizePart("P2")).toBe("2");
  });
  it("rejects anything else", () => {
    expect(normalizePart("")).toBeNull();
    expect(normalizePart("5")).toBeNull();
    expect(normalizePart("abc")).toBeNull();
  });
});

describe("parseCode", () => {
  it("parses full and partial codes", () => {
    expect(parseCode("c17t1p2")).toEqual({ book: 17, test: 1, part: "2" });
    expect(parseCode("C17 T1 P1-3")).toEqual({ book: 17, test: 1, part: "1-3" });
    expect(parseCode("c9t4")).toEqual({ book: 9, test: 4, part: null });
    expect(parseCode("c12")).toEqual({ book: 12, test: null, part: null });
  });
  it("rejects non-codes", () => {
    expect(parseCode("")).toBeNull();
    expect(parseCode("mock test")).toBeNull();
    expect(parseCode("c17t1p9")).toBeNull();
  });
});
