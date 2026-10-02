import { PART_RE } from "./code";
import { SKILLS, SKILL_LABELS, type Skill } from "./constants";
import { bookKeyToString, parseBookKey, type BookKey } from "./filters";

/** Scoreboard "material" filter: compare everyone on the same book / test / part. */
export type MaterialFilter = {
  book: BookKey | null;
  test: number | null;
  part: string | null;
  skill: Skill | null;
};

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, k: string) => (Array.isArray(p[k]) ? p[k]![0] : (p[k] as string | undefined));

export function parseMaterial(params: Params): MaterialFilter {
  const book = parseBookKey(one(params, "book"));
  const test = Number(one(params, "test"));
  const part = one(params, "part") ?? "";
  const skill = one(params, "skill") ?? "";
  return {
    book,
    // A test number only means something inside a book.
    test: book && Number.isInteger(test) && test >= 1 && test <= 200 ? test : null,
    part: PART_RE.test(part) ? part : null,
    skill: (SKILLS as readonly string[]).includes(skill) ? (skill as Skill) : null,
  };
}

export function materialToParams(m: MaterialFilter): Record<string, string> {
  const out: Record<string, string> = {};
  if (m.book) out.book = bookKeyToString(m.book);
  if (m.book && m.test != null) out.test = String(m.test);
  if (m.part) out.part = m.part;
  if (m.skill) out.skill = m.skill;
  return out;
}

/** Material mode needs a book or a part; a skill alone just narrows it. */
export function hasMaterial(m: MaterialFilter): boolean {
  return m.book != null || m.part != null;
}

export type MaterialAttempt = {
  studentId: string;
  date: string;
  skill: Skill;
  code: string;
  test: number | null;
  part: string | null;
  rawScore: number | null;
  total: number | null;
  percent: number | null;
  band: number | null;
};

export type BoardStudent = { id: string; name: string; color: string };

export type Cell = {
  attempts: number;
  best: MaterialAttempt;
  /** Comparable value: band when present, else percent mapped onto 0–9. */
  score: number | null;
};

export type BoardItem = {
  key: string;
  code: string;
  skill: Skill;
  label: string;
  cells: Record<string, Cell | undefined>;
  leaders: string[];
};

export type BoardSummary = {
  student: BoardStudent;
  attempts: number;
  items: number;
  avgPercent: number | null;
  bestPercent: number | null;
  avgBand: number | null;
  bestBand: number | null;
  wins: number;
  lastDate: string | null;
};

export type MaterialBoard = { items: BoardItem[]; summaries: BoardSummary[] };

function value(a: MaterialAttempt): number | null {
  if (a.band != null) return a.band;
  if (a.percent != null) return (a.percent / 100) * 9;
  return null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function buildMaterialBoard(attempts: MaterialAttempt[], students: BoardStudent[]): MaterialBoard {
  const byItem = new Map<string, BoardItem>();
  for (const a of attempts) {
    const key = `${a.code}|${a.skill}`;
    let item = byItem.get(key);
    if (!item) {
      item = { key, code: a.code, skill: a.skill, label: `${a.code || "—"} · ${SKILL_LABELS[a.skill]}`, cells: {}, leaders: [] };
      byItem.set(key, item);
    }
    const cell = item.cells[a.studentId];
    const v = value(a);
    if (!cell) item.cells[a.studentId] = { attempts: 1, best: a, score: v };
    else {
      cell.attempts++;
      if (v != null && (cell.score == null || v > cell.score)) {
        cell.best = a;
        cell.score = v;
      }
    }
  }

  const items = [...byItem.values()].sort(
    (a, b) => SKILLS.indexOf(a.skill) - SKILLS.indexOf(b.skill) || a.code.localeCompare(b.code, undefined, { numeric: true }),
  );
  for (const item of items) {
    const scored = Object.entries(item.cells).filter((e): e is [string, Cell] => e[1]?.score != null);
    // A "win" needs at least two people on the same item.
    if (scored.length >= 2) {
      const top = Math.max(...scored.map(([, c]) => c.score!));
      item.leaders = scored.filter(([, c]) => c.score === top).map(([id]) => id);
    }
  }

  const summaries = students.map((student): BoardSummary => {
    const mine = attempts.filter((a) => a.studentId === student.id);
    const percents = mine.map((a) => a.percent).filter((x): x is number => x != null);
    const bands = mine.map((a) => a.band).filter((x): x is number => x != null);
    const p = avg(percents);
    const b = avg(bands);
    return {
      student,
      attempts: mine.length,
      items: items.filter((i) => i.cells[student.id]).length,
      avgPercent: p == null ? null : Math.round(p * 10) / 10,
      bestPercent: percents.length ? Math.max(...percents) : null,
      avgBand: b == null ? null : Math.round(b * 100) / 100,
      bestBand: bands.length ? Math.max(...bands) : null,
      wins: items.filter((i) => i.leaders.length === 1 && i.leaders[0] === student.id).length,
      lastDate: mine.length ? mine.map((x) => x.date).sort().at(-1)! : null,
    };
  });
  summaries.sort(
    (x, y) =>
      y.wins - x.wins ||
      (y.avgBand ?? -1) - (x.avgBand ?? -1) ||
      (y.avgPercent ?? -1) - (x.avgPercent ?? -1) ||
      y.attempts - x.attempts,
  );
  return { items, summaries };
}
