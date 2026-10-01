import { CORE_SKILLS, SKILL_LABELS, type CoreSkill } from "./constants";
import { formatBand } from "./scoring";

export const BAND_THRESHOLDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
export const COUNT_THRESHOLDS = [1, 10, 25, 50, 100, 250, 500, 1000];

export type FirstBandRow = { skill: CoreSkill; threshold: number; date: string; code: string };
export type NthAttemptRow = { n: number; date: string };

export type Milestone = { key: string; date: string; title: string; detail?: string; kind: "band" | "count" };

/**
 * Milestones from "first time reaching band X" rows. Only the top two band
 * thresholds reached per skill are kept so the list stays meaningful.
 */
export function buildMilestones(firsts: FirstBandRow[], nth: NthAttemptRow[]): Milestone[] {
  const out: Milestone[] = [];
  for (const skill of CORE_SKILLS) {
    const rows = firsts.filter((f) => f.skill === skill).sort((a, b) => b.threshold - a.threshold).slice(0, 2);
    for (const r of rows) {
      out.push({
        key: `${skill}-${r.threshold}`,
        date: r.date,
        kind: "band",
        title: `First ${formatBand(r.threshold)} in ${SKILL_LABELS[skill]}`,
        detail: r.code || undefined,
      });
    }
  }
  for (const r of nth) {
    out.push({
      key: `n-${r.n}`,
      date: r.date,
      kind: "count",
      title: r.n === 1 ? "First attempt logged" : `${r.n} attempts logged`,
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
}

/** The next band to aim for in each skill (one step above the best so far). */
export function nextGoals(best: Partial<Record<CoreSkill, number | null>>): { skill: CoreSkill; band: number }[] {
  return CORE_SKILLS.flatMap((skill) => {
    const b = best[skill];
    const next = BAND_THRESHOLDS.find((t) => t > (b ?? 0));
    return next == null ? [] : [{ skill, band: b == null ? Math.max(5, next) : next }];
  });
}
