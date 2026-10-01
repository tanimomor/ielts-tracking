import type { SeriesInfo } from "./books";
import { buildCode, normalizePart, parseCode } from "./code";
import type { Skill } from "./constants";
import { isDateStr } from "./dates";
import { isValidBand, rawToBand } from "./scoring";

/** Columns of the Google Sheet "Log" tab. */
export const SHEET_COLUMNS = ["Timestamp", "Date", "Person", "Skill", "Book", "Test", "Part", "Code", "Raw", "Total", "Percent", "Band", "Notes"];
export const REQUIRED_COLUMNS = ["Person", "Skill"];
export const MAX_IMPORT_ROWS = 5000;

export type DateOrder = "dmy" | "mdy";

export type ImportRow = {
  line: number; // 1-based line in the CSV, header = 1
  person: string;
  date: string | null;
  skill: Skill;
  seriesId: number | null;
  book: number | null;
  test: number | null;
  part: string | null;
  code: string;
  rawScore: number | null;
  total: number | null;
  band: number | null;
  notes: string;
  errors: string[];
};

function pick(rec: Record<string, string>, name: string): string {
  const key = Object.keys(rec).find((k) => k.trim().toLowerCase() === name.toLowerCase());
  return key ? String(rec[key] ?? "").trim() : "";
}

const SKILL_ALIASES: Record<string, Skill> = {
  l: "listening",
  listening: "listening",
  r: "reading",
  reading: "reading",
  w: "writing",
  writing: "writing",
  s: "speaking",
  speaking: "speaking",
};

export function parseSkill(v: string): Skill {
  return SKILL_ALIASES[v.trim().toLowerCase()] ?? "other";
}

function int(v: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

const DMY_RE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/;

/** Guess day/month order from values like "13/07/2026"; null when every value is ambiguous. */
export function detectDateOrder(values: string[]): DateOrder | null {
  for (const v of values) {
    const m = DMY_RE.exec(v.trim());
    if (!m) continue;
    if (Number(m[1]) > 12) return "dmy";
    if (Number(m[2]) > 12) return "mdy";
  }
  return null;
}

/** Parses ISO ("2026-07-03"), D/M/Y or M/D/Y (with optional time) into YYYY-MM-DD. */
export function parseSheetDate(v: string, order: DateOrder): string | null {
  const s = v.trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) {
    const d = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    return isDateStr(d) ? d : null;
  }
  const m = DMY_RE.exec(s);
  if (!m) return null;
  const [a, b] = [Number(m[1]), Number(m[2])];
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const [day, month] = order === "dmy" ? [a, b] : [b, a];
  const d = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isDateStr(d) ? d : null;
}

export function parseSheet(
  records: Record<string, string>[],
  opts: { dateOrder?: DateOrder | "auto"; today: string; series: SeriesInfo[] },
): { rows: ImportRow[]; dateOrder: DateOrder; ambiguousDates: boolean } {
  const dateValues = records.flatMap((r) => [pick(r, "Date"), pick(r, "Timestamp")]);
  const detected = detectDateOrder(dateValues);
  const dateOrder: DateOrder = opts.dateOrder && opts.dateOrder !== "auto" ? opts.dateOrder : (detected ?? "dmy");

  const rows = records.slice(0, MAX_IMPORT_ROWS).map((rec, i): ImportRow => {
    const errors: string[] = [];
    const person = pick(rec, "Person");
    if (!person) errors.push("No person");

    const date = parseSheetDate(pick(rec, "Date"), dateOrder) ?? parseSheetDate(pick(rec, "Timestamp"), dateOrder);
    if (!date) errors.push("Unreadable date");
    else if (date > opts.today) errors.push("Date is in the future");

    const skill = parseSkill(pick(rec, "Skill"));
    const fromCode = parseCode(pick(rec, "Code"), opts.series.map((x) => x.prefix));
    const bookCell = pick(rec, "Book");
    // Book is a Cambridge number ("17"), a series name ("Makkar"), or "Name 3"; else use the code prefix.
    const named = /^(.*?)\s*(\d{1,3})?$/.exec(bookCell);
    let series: SeriesInfo | undefined;
    let book: number | null = null;
    if (/^\d+$/.test(bookCell)) {
      series = opts.series.find((x) => x.prefix === (fromCode?.prefix ?? "c")) ?? opts.series.find((x) => x.prefix === "c");
      book = Number(bookCell);
    } else if (bookCell) {
      series = opts.series.find((x) => x.name.toLowerCase() === bookCell.toLowerCase()) ??
        opts.series.find((x) => x.name.toLowerCase() === named?.[1]?.toLowerCase());
      book = series && named?.[2] && series.name.toLowerCase() !== bookCell.toLowerCase() ? Number(named[2]) : null;
      if (!series) errors.push(`Unknown book "${bookCell}" — add it in the log form first`);
    }
    if (!series && fromCode) series = opts.series.find((x) => x.prefix === fromCode.prefix);
    book ??= series && fromCode?.prefix === series.prefix ? fromCode.book : null;
    let test = series ? (int(pick(rec, "Test")) ?? (fromCode?.prefix === series.prefix ? fromCode.test : null)) : null;
    let part = test != null ? (normalizePart(pick(rec, "Part")) ?? fromCode?.part ?? null) : null;
    if (series && book != null && (series.volumes == null || book < 1 || book > series.volumes)) {
      errors.push(series.volumes == null ? `${series.name} has no volume numbers` : `${series.name} ${book} is out of range`);
      book = null;
    }
    if (series && test != null && (test < 1 || test > series.testsPerBook)) {
      errors.push(`Test ${test} is out of range for ${series.name}`);
      test = null;
      part = null;
    }

    // "32/40" in the Raw column is common in hand-kept sheets.
    const rawCell = pick(rec, "Raw");
    const slash = /^(\d+)\s*\/\s*(\d+)$/.exec(rawCell);
    let rawScore = slash ? Number(slash[1]) : int(rawCell);
    let total = int(pick(rec, "Total")) ?? (slash ? Number(slash[2]) : null);
    if (rawScore != null && total == null && (skill === "listening" || skill === "reading") && !part) total = 40;
    if (rawScore != null && total != null && (rawScore < 0 || total <= 0 || rawScore > total)) {
      errors.push(`Score ${rawScore}/${total} is invalid`);
      rawScore = null;
      total = null;
    }
    if (rawScore == null) total = null;

    const bandCell = pick(rec, "Band");
    const typedBand = bandCell ? Number(bandCell) : null;
    let band: number | null = null;
    if (typedBand != null && !isValidBand(typedBand)) errors.push(`Band "${bandCell}" is invalid`);
    if (skill === "listening" || skill === "reading") {
      // Same rule as the app: derive from a full-test score; keep the sheet's band only when there is no score.
      band = rawToBand(skill, rawScore, total) ?? (rawScore == null && typedBand != null && isValidBand(typedBand) ? typedBand : null);
    } else if (skill === "writing" || skill === "speaking") {
      band = typedBand != null && isValidBand(typedBand) ? typedBand : null;
    }

    return {
      line: i + 2,
      person,
      date,
      skill,
      seriesId: series?.id ?? null,
      book,
      test,
      part,
      code: buildCode(series?.prefix, book, test, part),
      rawScore,
      total,
      band,
      notes: pick(rec, "Notes").slice(0, 2000),
      errors,
    };
  });

  return { rows, dateOrder, ambiguousDates: detected == null && dateValues.some((v) => DMY_RE.test(v)) };
}

export function missingColumns(headers: string[]): string[] {
  const have = new Set(headers.map((h) => h.trim().toLowerCase()));
  return REQUIRED_COLUMNS.filter((c) => !have.has(c.toLowerCase())).concat(
    have.has("date") || have.has("timestamp") ? [] : ["Date"],
  );
}

type DupLike = {
  date: string | null;
  skill: string;
  code: string;
  rawScore: number | null;
  total: number | null;
  band: number | null;
};

/** Same day, skill, code and score = the same attempt. */
export function duplicateKey(studentId: string, r: DupLike): string {
  return [studentId, r.date, r.skill, r.code, r.rawScore ?? "", r.total ?? "", r.band ?? ""].join("|");
}

/** Best-effort Person → student match by name, first name or email. */
export function guessStudent<T extends { id: string; name: string; email: string }>(person: string, students: T[]): T | null {
  const p = person.trim().toLowerCase();
  if (!p) return null;
  return (
    students.find((s) => s.name.toLowerCase() === p) ??
    students.find((s) => s.email.toLowerCase() === p || s.email.toLowerCase().split("@")[0] === p) ??
    students.find((s) => s.name.toLowerCase().split(/\s+/)[0] === p.split(/\s+/)[0]) ??
    null
  );
}
