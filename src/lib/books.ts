/** Client-safe view of a book series (see book_series in the schema). */
export type SeriesInfo = {
  id: number;
  name: string;
  prefix: string;
  /** Number of volumes, or null for a single book without volume numbers. */
  volumes: number | null;
  testsPerBook: number;
};

export const CAMBRIDGE_ID = 1;
export const MAX_VOLUME = 200;
export const MAX_TEST = 200;

/** "Cambridge 17", "Makkar" — the book a student would recognise. */
export function bookName(series: Pick<SeriesInfo, "name"> | null | undefined, volume: number | null | undefined): string {
  if (!series) return "";
  return volume != null ? `${series.name} ${volume}` : series.name;
}

/** "Cambridge 17 · Test 1 · Part 2" */
export function bookLabel(
  series: Pick<SeriesInfo, "name"> | null | undefined,
  volume: number | null | undefined,
  test?: number | null,
  part?: string | null,
): string {
  if (!series) return "";
  return [bookName(series, volume), test != null ? `Test ${test}` : null, test != null && part ? `Part ${part}` : null]
    .filter(Boolean)
    .join(" · ");
}

/** Suggests a short, unused code prefix from a book name ("Makkar" → "mk"). */
export function suggestPrefix(name: string, taken: string[]): string {
  const words = name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const letters = words.join("");
  const candidates = [
    words.length > 1 ? words.map((w) => w[0]).join("").slice(0, 4) : "",
    letters[0] + (letters.slice(1).match(/[^aeiou]/)?.[0] ?? letters[1] ?? ""),
    letters.slice(0, 3),
    letters.slice(0, 4),
  ].filter((c) => c && /^[a-z]{1,6}$/.test(c));
  const free = candidates.find((c) => !taken.includes(c));
  if (free) return free;
  for (let i = 2; i <= 6; i++) {
    const c = letters.slice(0, i);
    if (!taken.includes(c)) return c;
  }
  return "";
}
