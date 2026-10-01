/**
 * Practice codes as used in the original Google Sheet: c17t1p2 means
 * Cambridge 17, Test 1, Part/Passage 2. Parts may be ranges ("1-3").
 */
export function buildCode(
  book: number | null | undefined,
  test: number | null | undefined,
  part: string | null | undefined,
): string {
  if (book == null) return "";
  let code = `c${book}`;
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

export type ParsedCode = { book: number; test: number | null; part: string | null };

/** Parses "c17t1p2", "C17 T1 P1-3", "c9t4"; returns null if it isn't a code. */
export function parseCode(input: string | null | undefined): ParsedCode | null {
  if (!input) return null;
  const m = /^c\s*(\d{1,2})\s*(?:t\s*(\d)\s*(?:p\s*([1-4](?:\s*[-–]\s*[1-4])?))?)?$/i.exec(input.trim());
  if (!m) return null;
  return {
    book: Number(m[1]),
    test: m[2] ? Number(m[2]) : null,
    part: m[3] ? normalizePart(m[3]) : null,
  };
}
