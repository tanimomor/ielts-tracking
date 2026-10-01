import { TIME_ZONE } from "./constants";

/**
 * Calendar dates are plain "YYYY-MM-DD" strings in Asia/Dhaka. Arithmetic is
 * done on UTC midnights so the host time zone never shifts a date.
 */
export type DateStr = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(value: unknown): value is DateStr {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** The calendar date in Asia/Dhaka for an instant (default: now). */
export function dhakaDate(instant: Date = new Date()): DateStr {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export const today = (): DateStr => dhakaDate();

function toUtc(d: DateStr): Date {
  return new Date(`${d}T00:00:00Z`);
}

function fromUtc(d: Date): DateStr {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: DateStr, n: number): DateStr {
  const x = toUtc(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUtc(x);
}

export function addMonths(d: DateStr, n: number): DateStr {
  const x = toUtc(d);
  const day = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + n);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(day, last));
  return fromUtc(x);
}

/** Whole days from a to b (b − a). */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** Monday-based week start. */
export function startOfWeek(d: DateStr): DateStr {
  const dow = toUtc(d).getUTCDay(); // 0 = Sunday
  return addDays(d, -((dow + 6) % 7));
}

export function startOfMonth(d: DateStr): DateStr {
  return `${d.slice(0, 7)}-01`;
}

export function endOfMonth(d: DateStr): DateStr {
  return addDays(addMonths(startOfMonth(d), 1), -1);
}

export function startOfYear(d: DateStr): DateStr {
  return `${d.slice(0, 4)}-01-01`;
}

export function endOfYear(d: DateStr): DateStr {
  return `${d.slice(0, 4)}-12-31`;
}

/** Every date from start to end inclusive. */
export function eachDay(start: DateStr, end: DateStr): DateStr[] {
  const out: DateStr[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export type DateRange = { from: DateStr; to: DateStr };

export const DATE_PRESETS = ["week", "month", "year", "all", "custom"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export function presetRange(preset: DatePreset, ref: DateStr = today()): DateRange | null {
  switch (preset) {
    case "week":
      return { from: startOfWeek(ref), to: addDays(startOfWeek(ref), 6) };
    case "month":
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    case "year":
      return { from: startOfYear(ref), to: endOfYear(ref) };
    default:
      return null;
  }
}

/**
 * Consecutive practice days ending today, or yesterday if today has no
 * practice yet (so a streak isn't "broken" before the day is over).
 */
export function currentStreak(practiceDays: Iterable<DateStr>, ref: DateStr = today()): number {
  const days = new Set(practiceDays);
  let cursor = days.has(ref) ? ref : addDays(ref, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(practiceDays: Iterable<DateStr>): number {
  const sorted = [...new Set(practiceDays)].sort();
  let best = 0;
  let run = 0;
  let prev: DateStr | null = null;
  for (const d of sorted) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Wed, 1 Oct 2026" */
export function formatDateLong(d: DateStr): string {
  const x = toUtc(d);
  return `${WEEKDAYS[x.getUTCDay()]}, ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

/** "1 Oct" or "1 Oct 2025" when not in the reference year. */
export function formatDateShort(d: DateStr, ref: DateStr = today()): string {
  const x = toUtc(d);
  const base = `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
  return d.slice(0, 4) === ref.slice(0, 4) ? base : `${base} ${x.getUTCFullYear()}`;
}

/** "Oct 2026" */
export function formatMonth(d: DateStr): string {
  const x = toUtc(d);
  return `${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function formatRange(r: DateRange | null): string {
  if (!r) return "All time";
  if (r.from === startOfMonth(r.from) && r.to === endOfMonth(r.from)) return formatMonth(r.from);
  if (r.from === startOfYear(r.from) && r.to === endOfYear(r.from)) return r.from.slice(0, 4);
  return `${formatDateShort(r.from, r.to)} – ${formatDateShort(r.to, r.to)}`;
}

/** Date-time in Dhaka for "Last synced" labels, e.g. "1 Oct, 21:05". */
export function formatDateTime(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
  return parts;
}

/** Excel stores dates as local midnight; a UTC-midnight Date displays correctly. */
export function toExcelDate(d: DateStr): Date {
  return toUtc(d);
}
