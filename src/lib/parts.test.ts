import { describe, expect, it } from "vitest";
import { defaultTotal } from "./constants";
import { contiguous, partsToText, textToParts } from "./parts";

describe("parts", () => {
  it("round-trips single parts and ranges", () => {
    expect(partsToText(["2"])).toBe("2");
    expect(partsToText(["3", "1", "2"])).toBe("1-3");
    expect(partsToText([])).toBeNull();
    expect(textToParts("1-3")).toEqual(["1", "2", "3"]);
    expect(textToParts("2")).toEqual(["2"]);
    expect(textToParts(null)).toEqual([]);
  });
  it("fills gaps to keep a contiguous range", () => {
    expect(contiguous(["1", "3"])).toEqual(["1", "2", "3"]);
  });
});

describe("defaultTotal", () => {
  it("knows typical question counts", () => {
    expect(defaultTotal("listening", [])).toBe(40);
    expect(defaultTotal("listening", ["2"])).toBe(10);
    expect(defaultTotal("reading", ["3"])).toBe(14);
    expect(defaultTotal("reading", ["1", "2"])).toBe(26);
    expect(defaultTotal("reading", ["1", "2", "3"])).toBe(40);
    expect(defaultTotal("writing", [])).toBeNull();
  });
});
