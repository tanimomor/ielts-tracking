import { MAX_BOOK, SKILLS, type Skill } from "./constants";
import { DATE_PRESETS, isDateStr, presetRange, today, type DatePreset, type DateRange } from "./dates";

export const SORT_KEYS = ["date", "student", "skill", "code", "score", "percent", "band"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const PAGE_SIZES = [25, 50, 100] as const;

export type AttemptFilters = {
  preset: DatePreset;
  from: string | null;
  to: string | null;
  students: string[];
  skills: Skill[];
  book: number | null;
  tags: string[];
  q: string;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  size: number;
  view: "table" | "grid";
};

export const DEFAULT_FILTERS: AttemptFilters = {
  preset: "all",
  from: null,
  to: null,
  students: [],
  skills: [],
  book: null,
  tags: [],
  q: "",
  sort: "date",
  dir: "desc",
  page: 1,
  size: 25,
  view: "table",
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

function list(params: Params, key: string): string[] {
  const v = get(params, key);
  return v ? [...new Set(v.split(",").map((s) => s.trim()).filter(Boolean))] : [];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(params: Params): AttemptFilters {
  const preset = (DATE_PRESETS as readonly string[]).includes(get(params, "range") ?? "")
    ? (get(params, "range") as DatePreset)
    : DEFAULT_FILTERS.preset;
  const from = get(params, "from");
  const to = get(params, "to");
  const book = Number(get(params, "book"));
  const sort = get(params, "sort");
  const page = Number(get(params, "page"));
  const size = Number(get(params, "size"));
  return {
    preset,
    from: preset === "custom" && isDateStr(from) ? from : null,
    to: preset === "custom" && isDateStr(to) ? to : null,
    students: list(params, "students").filter((s) => UUID_RE.test(s)),
    skills: list(params, "skills").filter((s): s is Skill => (SKILLS as readonly string[]).includes(s)),
    book: Number.isInteger(book) && book >= 1 && book <= MAX_BOOK ? book : null,
    tags: list(params, "tags").slice(0, 20),
    q: (get(params, "q") ?? "").trim().slice(0, 100),
    sort: (SORT_KEYS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : DEFAULT_FILTERS.sort,
    dir: get(params, "dir") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_FILTERS.size,
    view: get(params, "view") === "grid" ? "grid" : "table",
  };
}

/** Serialises only non-default values so URLs stay short and shareable. */
export function filtersToParams(f: Partial<AttemptFilters>): URLSearchParams {
  const p = new URLSearchParams();
  const d = DEFAULT_FILTERS;
  if (f.preset && f.preset !== d.preset) p.set("range", f.preset);
  if (f.preset === "custom") {
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
  }
  if (f.students?.length) p.set("students", f.students.join(","));
  if (f.skills?.length) p.set("skills", f.skills.join(","));
  if (f.book != null) p.set("book", String(f.book));
  if (f.tags?.length) p.set("tags", f.tags.join(","));
  if (f.q) p.set("q", f.q);
  if (f.sort && f.sort !== d.sort) p.set("sort", f.sort);
  if (f.dir && f.dir !== d.dir) p.set("dir", f.dir);
  if (f.page && f.page !== 1) p.set("page", String(f.page));
  if (f.size && f.size !== d.size) p.set("size", String(f.size));
  if (f.view && f.view !== d.view) p.set("view", f.view);
  return p;
}

/** The concrete date range the filters select (null = all time). */
export function filterRange(f: AttemptFilters, ref: string = today()): DateRange | null {
  if (f.preset === "custom") {
    if (!f.from && !f.to) return null;
    return { from: f.from ?? "1900-01-01", to: f.to ?? "2999-12-31" };
  }
  return presetRange(f.preset, ref);
}

export function hasActiveFilters(f: AttemptFilters): boolean {
  return (
    f.preset !== "all" || f.students.length > 0 || f.skills.length > 0 || f.book != null || f.tags.length > 0 || f.q !== ""
  );
}
