import {
  addDays,
  addMonths,
  diffDays,
  endOfMonth,
  endOfYear,
  formatDateShort,
  formatMonth,
  isDateStr,
  startOfMonth,
  startOfYear,
  today,
  type DateRange,
} from "../dates";

export const PERIOD_TYPES = ["month", "year", "all", "custom"] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export type Period = {
  type: PeriodType;
  /** null for all time */
  range: DateRange | null;
  label: string;
  /** "this month", "in Sep 2026", "in this period"… used inside insight sentences. */
  phrase: string;
  /** "last month", "the previous year"… */
  previousPhrase: string;
};

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, k: string) => (Array.isArray(p[k]) ? p[k]![0] : (p[k] as string | undefined));

/** Resolves ?period=month&month=2026-09 (etc.) into a concrete period. Defaults to this month. */
export function parsePeriod(params: Params, ref: string = today()): Period {
  const type = (PERIOD_TYPES as readonly string[]).includes(one(params, "period") ?? "")
    ? (one(params, "period") as PeriodType)
    : "month";

  if (type === "month") {
    const m = one(params, "month");
    const start = m && /^\d{4}-\d{2}$/.test(m) && isDateStr(`${m}-01`) ? `${m}-01` : startOfMonth(ref);
    return makePeriod("month", { from: start, to: endOfMonth(start) }, ref);
  }
  if (type === "year") {
    const y = one(params, "year");
    const start = y && /^\d{4}$/.test(y) ? `${y}-01-01` : startOfYear(ref);
    return makePeriod("year", { from: start, to: endOfYear(start) }, ref);
  }
  if (type === "custom") {
    let from = one(params, "from");
    let to = one(params, "to");
    if (!isDateStr(from)) from = addDays(ref, -29);
    if (!isDateStr(to)) to = ref;
    if (from > to) [from, to] = [to, from];
    return makePeriod("custom", { from, to }, ref);
  }
  return makePeriod("all", null, ref);
}

export function makePeriod(type: PeriodType, range: DateRange | null, ref: string = today()): Period {
  if (type === "all" || !range) {
    return { type: "all", range: null, label: "All time", phrase: "overall", previousPhrase: "" };
  }
  if (type === "month") {
    const current = startOfMonth(ref) === range.from;
    return {
      type,
      range,
      label: formatMonth(range.from),
      phrase: current ? "this month" : `in ${formatMonth(range.from)}`,
      previousPhrase: current ? "last month" : formatMonth(addMonths(range.from, -1)),
    };
  }
  if (type === "year") {
    const y = range.from.slice(0, 4);
    const current = startOfYear(ref) === range.from;
    return {
      type,
      range,
      label: y,
      phrase: current ? "this year" : `in ${y}`,
      previousPhrase: current ? "last year" : String(Number(y) - 1),
    };
  }
  return {
    type,
    range,
    label: `${formatDateShort(range.from, ref)} – ${formatDateShort(range.to, ref)}`,
    phrase: "in this period",
    previousPhrase: "the previous period",
  };
}

/** The equal-length period immediately before (null for all time). */
export function previousRange(p: Period): DateRange | null {
  if (!p.range) return null;
  if (p.type === "month") {
    const from = addMonths(p.range.from, -1);
    return { from, to: endOfMonth(from) };
  }
  if (p.type === "year") {
    const from = `${Number(p.range.from.slice(0, 4)) - 1}-01-01`;
    return { from, to: endOfYear(from) };
  }
  const len = diffDays(p.range.from, p.range.to) + 1;
  return { from: addDays(p.range.from, -len), to: addDays(p.range.from, -1) };
}

export function periodToParams(p: Period): Record<string, string> {
  if (p.type === "month" && p.range) return { period: "month", month: p.range.from.slice(0, 7) };
  if (p.type === "year" && p.range) return { period: "year", year: p.range.from.slice(0, 4) };
  if (p.type === "custom" && p.range) return { period: "custom", from: p.range.from, to: p.range.to };
  return { period: "all" };
}
