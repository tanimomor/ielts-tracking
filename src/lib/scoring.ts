import type { CoreSkill, Skill } from "./constants";

/** [minimum raw score, band] pairs, highest first. */
type BandTable = ReadonlyArray<readonly [number, number]>;

export const LISTENING_TABLE: BandTable = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [32, 7.5],
  [30, 7],
  [26, 6.5],
  [23, 6],
  [18, 5.5],
  [16, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
];

/** Academic Reading. */
export const READING_TABLE: BandTable = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [33, 7.5],
  [30, 7],
  [27, 6.5],
  [23, 6],
  [19, 5.5],
  [15, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
];

export const FULL_TEST_TOTAL = 40;

function lookup(table: BandTable, raw: number): number | null {
  for (const [min, band] of table) {
    if (raw >= min) return band;
  }
  return null;
}

/**
 * Converts a Listening/Reading raw score to a band. Only full tests (out of 40)
 * get a band; partial tests, other skills and scores below the table return null.
 */
export function rawToBand(
  skill: Skill,
  raw: number | null | undefined,
  total: number | null | undefined,
): number | null {
  if (raw == null || total !== FULL_TEST_TOTAL) return null;
  if (!Number.isInteger(raw) || raw < 0 || raw > total) return null;
  if (skill === "listening") return lookup(LISTENING_TABLE, raw);
  if (skill === "reading") return lookup(READING_TABLE, raw);
  return null;
}

export function computePercent(
  raw: number | null | undefined,
  total: number | null | undefined,
): number | null {
  if (raw == null || total == null || total <= 0) return null;
  return Math.round((raw * 10000) / total) / 100;
}

/**
 * IELTS rounding to the nearest half band: .25 rounds up to .5 and .75 rounds
 * up to the next whole band; anything below those points rounds down.
 */
export function roundIelts(x: number): number {
  // The epsilon absorbs float noise from averaging (e.g. 6.2499999999).
  return Math.floor(x * 2 + 0.5 + 1e-9) / 2;
}

export function isValidBand(band: number): boolean {
  return Number.isFinite(band) && band >= 0 && band <= 9 && Number.isInteger(band * 2);
}

/** Overall band from the four skills; null unless all four are known. */
export function overallBand(
  bands: Partial<Record<CoreSkill, number | null | undefined>>,
): number | null {
  const values = [bands.listening, bands.reading, bands.writing, bands.speaking];
  if (values.some((v) => v == null || !Number.isFinite(v))) return null;
  const sum = (values as number[]).reduce((a, b) => a + b, 0);
  return roundIelts(sum / 4);
}

/**
 * The band stored on an attempt: Listening/Reading are always derived from the
 * raw score; Writing/Speaking use the entered band; "other" has none.
 */
export function resolveBand(input: {
  skill: Skill;
  rawScore?: number | null;
  total?: number | null;
  band?: number | null;
}): number | null {
  switch (input.skill) {
    case "listening":
    case "reading":
      return rawToBand(input.skill, input.rawScore, input.total);
    case "writing":
    case "speaking":
      return input.band != null && isValidBand(input.band) ? input.band : null;
    default:
      return null;
  }
}

export function formatBand(band: number | null | undefined): string {
  return band == null ? "—" : band.toFixed(1);
}
