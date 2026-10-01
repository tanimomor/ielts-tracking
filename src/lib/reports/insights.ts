import { CORE_SKILLS, SKILL_LABELS, type CoreSkill } from "../constants";
import { diffDays } from "../dates";
import { formatBand } from "../scoring";
import type { Period } from "./period";
import type { StudentReport } from "./types";

const PART_NAME = { listening: "part", reading: "passage" } as const;
const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** Rule-based, plain-sentence observations. Ordered by usefulness; capped at 8. */
export function generateInsights(r: StudentReport, period: Period, today: string): string[] {
  const out: string[] = [];

  // 1. Distance to target.
  if (r.overallBand != null && r.targetBand != null) {
    const gap = r.targetBand - r.overallBand;
    out.push(
      gap > 0
        ? `Estimated overall band is ${formatBand(r.overallBand)} — ${fmt(gap)} below the ${formatBand(r.targetBand)} target.`
        : `Estimated overall band is ${formatBand(r.overallBand)}, at or above the ${formatBand(r.targetBand)} target.`,
    );
  } else if (r.attempts > 0) {
    const missing = CORE_SKILLS.filter((s) => r.skills[s].avgBand == null).map((s) => SKILL_LABELS[s]);
    if (missing.length && missing.length < 4) {
      out.push(`Log a banded ${missing.join(" and ")} attempt to get an estimated overall band.`);
    }
  }

  // 2. Movement vs the previous period.
  if (r.previous) {
    const moves = CORE_SKILLS.flatMap((s) => {
      const now = r.skills[s].avgBand;
      const before = r.previous!.avgBand[s];
      if (now == null || before == null) return [];
      const d = now - before;
      return Math.abs(d) >= 0.25 ? [{ s, d, now, before }] : [];
    }).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    for (const m of moves.slice(0, 2)) {
      out.push(
        `${SKILL_LABELS[m.s]} is ${m.d > 0 ? "up" : "down"} ${fmt(Math.abs(m.d))} ${period.phrase} (${fmt(m.before)} → ${fmt(m.now)}).`,
      );
    }
  }

  // 3. Neglected skills (all-time, relative to today).
  const neglected = CORE_SKILLS.map((s) => {
    const last = r.lastPractised[s];
    return { s, days: last ? diffDays(last, today) : null };
  });
  const stale = neglected.filter((n): n is { s: CoreSkill; days: number } => n.days != null && n.days >= 7).sort((a, b) => b.days - a.days);
  for (const n of stale.slice(0, 2)) {
    out.push(`${SKILL_LABELS[n.s]} hasn't been practised in ${n.days} days.`);
  }
  const never = neglected.filter((n) => n.days == null).map((n) => SKILL_LABELS[n.s]);
  if (never.length && never.length < 4) out.push(`${never.join(" and ")} ${never.length === 1 ? "hasn't" : "haven't"} been logged yet.`);

  // 4. Weakest section (Listening part / Reading passage).
  const sections = r.parts.filter((p) => p.attempts >= 2 && p.avgPercent != null);
  for (const skill of ["reading", "listening"] as const) {
    const list = sections.filter((p) => p.skill === skill).sort((a, b) => a.avgPercent! - b.avgPercent!);
    if (list.length >= 2) {
      const worst = list[0];
      const best = list[list.length - 1];
      if (best.avgPercent! - worst.avgPercent! >= 5) {
        out.push(
          `${SKILL_LABELS[skill]} ${PART_NAME[skill]} ${worst.part} is the weakest section at ${Math.round(worst.avgPercent!)}% (best: ${PART_NAME[skill]} ${best.part}, ${Math.round(best.avgPercent!)}%).`,
        );
      }
    }
  }

  // 5. Most frequent mistake.
  if (r.tags[0] && r.tags[0].count >= 2) {
    out.push(`Most frequent mistake tag: “${r.tags[0].tag}” (${r.tags[0].count} times).`);
  }

  // 6. Momentum.
  if (r.currentStreak >= 3) out.push(`On a ${r.currentStreak}-day practice streak.`);
  if (r.previous && r.previous.attempts >= 4) {
    const change = (r.attempts - r.previous.attempts) / r.previous.attempts;
    if (Math.abs(change) >= 0.25) {
      out.push(
        `Practice volume is ${change > 0 ? "up" : "down"} ${Math.round(Math.abs(change) * 100)}% vs ${period.previousPhrase} (${r.previous.attempts} → ${r.attempts} attempts).`,
      );
    }
  }

  // 7. Strongest skill.
  const ranked = CORE_SKILLS.filter((s) => r.skills[s].avgBand != null).sort(
    (a, b) => r.skills[b].avgBand! - r.skills[a].avgBand!,
  );
  if (ranked.length >= 2 && r.skills[ranked[0]].avgBand! - r.skills[ranked[ranked.length - 1]].avgBand! >= 0.5) {
    out.push(
      `${SKILL_LABELS[ranked[0]]} is the strongest skill (${fmt(r.skills[ranked[0]].avgBand!)} average); ${SKILL_LABELS[ranked[ranked.length - 1]]} trails at ${fmt(r.skills[ranked[ranked.length - 1]].avgBand!)}.`,
    );
  }

  if (r.attempts === 0) out.unshift(`No practice logged ${period.phrase === "overall" ? "yet" : period.phrase}.`);
  return out.slice(0, 8);
}
