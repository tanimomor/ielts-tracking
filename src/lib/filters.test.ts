import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filterRange, filtersToParams, parseFilters } from "./filters";

const ID = "6b0f8c1e-1d2c-4c8e-9a35-2f0e7f6f2a11";

describe("parseFilters", () => {
  it("defaults when empty", () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });
  it("parses and validates values", () => {
    const f = parseFilters({
      range: "custom",
      from: "2026-09-01",
      to: "2026-09-30",
      students: `${ID},not-a-uuid`,
      skills: "reading,bogus,listening",
      book: "17",
      tags: "T/F/NG,Spelling",
      q: "  map ",
      sort: "band",
      dir: "asc",
      page: "3",
      size: "50",
      view: "grid",
    });
    expect(f).toMatchObject({
      preset: "custom",
      from: "2026-09-01",
      to: "2026-09-30",
      students: [ID],
      skills: ["reading", "listening"],
      book: 17,
      tags: ["T/F/NG", "Spelling"],
      q: "map",
      sort: "band",
      dir: "asc",
      page: 3,
      size: 50,
      view: "grid",
    });
  });
  it("ignores junk", () => {
    const f = parseFilters({ range: "decade", book: "99", page: "-1", size: "7", sort: "x", from: "2026-02-31" });
    expect(f.preset).toBe("all");
    expect(f.book).toBeNull();
    expect(f.page).toBe(1);
    expect(f.size).toBe(25);
    expect(f.sort).toBe("date");
  });
  it("round-trips through URL params", () => {
    const f = parseFilters({ range: "month", skills: "reading", q: "map", view: "grid" });
    expect(parseFilters(filtersToParams(f))).toEqual(f);
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe("");
  });
});

describe("filterRange", () => {
  it("resolves presets in Dhaka dates", () => {
    expect(filterRange({ ...DEFAULT_FILTERS, preset: "week" }, "2026-10-01")).toEqual({ from: "2026-09-28", to: "2026-10-04" });
    expect(filterRange(DEFAULT_FILTERS)).toBeNull();
  });
  it("supports open-ended custom ranges", () => {
    expect(filterRange({ ...DEFAULT_FILTERS, preset: "custom", from: "2026-09-01" })).toEqual({
      from: "2026-09-01",
      to: "2999-12-31",
    });
  });
});
