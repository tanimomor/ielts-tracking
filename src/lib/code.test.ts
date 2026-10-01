import { describe, expect, it } from "vitest";
import { bookLabel, suggestPrefix } from "./books";
import { buildCode, normalizePart, parseCode } from "./code";

describe("buildCode", () => {
  it("builds sheet-style codes", () => {
    expect(buildCode("c", 17, 1, "2")).toBe("c17t1p2");
    expect(buildCode("c", 17, 1, null)).toBe("c17t1");
    expect(buildCode("c", 9, 4, "1-3")).toBe("c9t4p1-3");
    expect(buildCode("c", 17, null, "2")).toBe("c17");
    expect(buildCode(null, 1, 1, "2")).toBe("");
  });
  it("supports other series and books without volumes", () => {
    expect(buildCode("mk", 2, 5, null)).toBe("mk2t5");
    expect(buildCode("mk", null, 12, "3")).toBe("mkt12p3");
    expect(buildCode("mk", null, null, null)).toBe("mk");
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
  it("parses Cambridge codes", () => {
    expect(parseCode("c17t1p2")).toEqual({ prefix: "c", book: 17, test: 1, part: "2" });
    expect(parseCode("C17 T1 P1-3")).toEqual({ prefix: "c", book: 17, test: 1, part: "1-3" });
    expect(parseCode("c9t4")).toEqual({ prefix: "c", book: 9, test: 4, part: null });
    expect(parseCode("c12")).toEqual({ prefix: "c", book: 12, test: null, part: null });
  });
  it("parses other prefixes, longest first", () => {
    const prefixes = ["c", "mk", "cam"];
    expect(parseCode("mk2t5", prefixes)).toEqual({ prefix: "mk", book: 2, test: 5, part: null });
    expect(parseCode("mkt12p3", prefixes)).toEqual({ prefix: "mk", book: null, test: 12, part: "3" });
    expect(parseCode("cam3t1", prefixes)).toEqual({ prefix: "cam", book: 3, test: 1, part: null });
  });
  it("rejects non-codes", () => {
    expect(parseCode("")).toBeNull();
    expect(parseCode("mock test")).toBeNull();
    expect(parseCode("c17t1p9")).toBeNull();
    expect(parseCode("mk2t5")).toBeNull(); // unknown prefix
  });
});

describe("books", () => {
  it("labels books", () => {
    expect(bookLabel({ name: "Cambridge" }, 17, 1, "2")).toBe("Cambridge 17 · Test 1 · Part 2");
    expect(bookLabel({ name: "Makkar" }, null, 5)).toBe("Makkar · Test 5");
    expect(bookLabel(null, 3)).toBe("");
  });
  it("suggests short unused prefixes", () => {
    expect(suggestPrefix("Makkar", ["c"])).toBe("mk");
    expect(suggestPrefix("Barron's IELTS", ["c"])).toBe("bi");
    expect(suggestPrefix("Makkar", ["c", "mk"])).toBe("mak");
    expect(suggestPrefix("123", [])).toBe("");
  });
});
