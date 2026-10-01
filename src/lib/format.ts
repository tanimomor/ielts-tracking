import { SKILL_LABELS, SKILL_SHORT, type Skill } from "./constants";
import { formatBand } from "./scoring";

type ScoreLike = { rawScore: number | null; total: number | null; percent: number | null; band: number | null };

export function scoreText(a: ScoreLike): string {
  return a.rawScore != null && a.total != null ? `${a.rawScore}/${a.total}` : "";
}

export function percentText(p: number | null | undefined): string {
  return p == null ? "" : `${Math.round(p)}%`;
}

/** Grid cell text, mirroring the Google Sheet: "c17t1 (7.5)", "c17t1p2 (9/10)". */
export function cellLabel(a: ScoreLike & { code: string; skill: Skill }): string {
  const name = a.code || SKILL_LABELS[a.skill];
  const detail = a.band != null ? formatBand(a.band) : scoreText(a) || percentText(a.percent);
  return detail ? `${name} (${detail})` : name;
}

export function skillShort(skill: Skill) {
  return SKILL_SHORT[skill];
}

export function signed(n: number, digits = 1): string {
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}` : s;
}
