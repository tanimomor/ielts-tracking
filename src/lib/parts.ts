/** Converts selected part chips to the stored text ("2", "1-3") and back. */
export function partsToText(parts: string[]): string | null {
  const nums = parts.map(Number).filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  if (!nums.length) return null;
  const min = nums[0];
  const max = nums[nums.length - 1];
  return min === max ? String(min) : `${min}-${max}`;
}

export function textToParts(part: string | null | undefined): string[] {
  if (!part) return [];
  const m = /^(\d)(?:-(\d))?$/.exec(part);
  if (!m) return [];
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : min;
  return Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
}

/** Selecting parts keeps a contiguous range: picking 1 and 3 selects 1–3. */
export function contiguous(parts: string[]): string[] {
  return textToParts(partsToText(parts));
}
