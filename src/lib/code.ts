/**
 * Practice codes as used in the original Google Sheet: c17t1p2 means
 * Cambridge 17, Test 1, Part/Passage 2. Other series use their own prefix
 * ("mk2t5" = Makkar 2, Test 5; "mkt5" when the series has no volumes).
 * Parts may be ranges ("1-3").
 */
export function buildCode(
  prefix: string | null | undefined,
  volume: number | null | undefined,
  test: number | null | undefined,
  part: string | null | undefined,
): string {
  if (!prefix) return "";
  let code = `${prefix}${volume ?? ""}`;
  if (test != null) {
    code += `t${test}`;
    if (part) code += `p${part}`;
  }
  return code;
}

export const PART_RE = /^[1-4](?:-[1-4])?$/;

export function normalizePart(part: string | null | undefined): string | null {
  if (part == null) return null;
  const p = part.trim().replace(/\s+/g, "").replace(/[–—]/g, "-").replace(/^p/i, "");
  if (!p) return null;
  return PART_RE.test(p) ? p : null;
}

export type ParsedCode = { prefix: string; book: number | null; test: number | null; part: string | null };

/**
 * Parses "c17t1p2", "C17 T1 P1-3", "mk2t5", "mkt5" against the known
 * prefixes (longest first, so "cam" wins over "c"); null if it isn't a code.
 */
export function parseCode(input: string | null | undefined, prefixes: string[] = ["c"]): ParsedCode | null {
  if (!input) return null;
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  for (const prefix of [...prefixes].sort((a, b) => b.length - a.length)) {
    if (!s.startsWith(prefix)) continue;
    const m = /^(\d{1,3})?(?:t(\d{1,3})(?:p([1-4](?:[-–][1-4])?))?)?$/.exec(s.slice(prefix.length));
    if (!m || (!m[1] && !m[2])) continue;
    return {
      prefix,
      book: m[1] ? Number(m[1]) : null,
      test: m[2] ? Number(m[2]) : null,
      part: m[3] ? normalizePart(m[3]) : null,
    };
  }
  return null;
}
