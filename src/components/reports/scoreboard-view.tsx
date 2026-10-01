"use client";

import { Crown, Flame, Medal, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import { BarSeriesChart } from "@/components/charts/bar-series-chart";
import { ChartCard, MiniTable, NoData } from "@/components/charts/chart-card";
import { SKILL_ICONS, SKILL_SOLID } from "@/components/skill-icon";
import { Card } from "@/components/ui/card";
import { CORE_SKILLS, SKILL_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import type { ReportPayload, StudentReport } from "@/lib/reports/types";
import { formatBand } from "@/lib/scoring";
import { cn, initials, pluralize, readableTextOn } from "@/lib/utils";

type Metric = {
  label: string;
  get: (r: StudentReport) => number | null;
  fmt: (v: number) => string;
  higherIsBetter?: boolean;
};

const METRICS: Metric[] = [
  { label: "Overall band (est.)", get: (r) => r.overallBand, fmt: (v) => v.toFixed(1), higherIsBetter: true },
  ...CORE_SKILLS.map<Metric>((s) => ({
    label: `${SKILL_LABELS[s]} avg band`,
    get: (r) => r.skills[s].avgBand,
    fmt: (v) => v.toFixed(2),
    higherIsBetter: true,
  })),
  ...(["listening", "reading"] as const).map<Metric>((s) => ({
    label: `${SKILL_LABELS[s]} avg %`,
    get: (r) => r.skills[s].avgPercent,
    fmt: (v) => `${Math.round(v)}%`,
    higherIsBetter: true,
  })),
  { label: "Attempts", get: (r) => r.attempts, fmt: (v) => String(v), higherIsBetter: true },
  { label: "Practice days", get: (r) => r.practiceDays, fmt: (v) => String(v), higherIsBetter: true },
  { label: "Current streak", get: (r) => r.currentStreak, fmt: (v) => `${v} d`, higherIsBetter: true },
  { label: "Gap to target", get: (r) => (r.overallBand != null && r.targetBand != null ? r.targetBand - r.overallBand : null), fmt: (v) => (v <= 0 ? "met" : v.toFixed(1)) },
];

export function HeadToHead({ students }: { students: StudentReport[] }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="px-5 py-4">
        <h2 className="text-[15px] font-semibold">Head to head</h2>
        <p className="text-sm text-muted-foreground">The leader on each row is marked; the last column is the spread between highest and lowest.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-2 font-medium">Metric</th>
              {students.map((s) => (
                <th key={s.studentId} scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </th>
              ))}
              <th scope="col" className="px-5 py-2 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const values = students.map((s) => m.get(s));
              const present = values.filter((v): v is number => v != null);
              const best = present.length > 1 && m.higherIsBetter ? Math.max(...present) : null;
              const spread = present.length > 1 ? Math.max(...present) - Math.min(...present) : null;
              const notable = spread != null && spread > 0;
              return (
                <tr key={m.label} className="border-t">
                  <th scope="row" className="px-5 py-2 text-left font-medium">
                    {m.label}
                  </th>
                  {values.map((v, i) => {
                    const lead = v != null && best != null && v === best && notable;
                    return (
                      <td key={i} className={cn("px-3 py-2 text-right tabular", lead && "font-semibold")}>
                        {v == null ? "—" : m.fmt(v)}
                        {lead && (
                          <span className="ml-1.5 rounded bg-primary-soft px-1 py-0.5 text-[10px] font-semibold text-primary" title="Highest">
                            ▲ best
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className={cn("px-5 py-2 text-right tabular", notable && "font-semibold")}>
                    {spread == null ? "—" : m.label === "Gap to target" ? spread.toFixed(1) : m.fmt(spread).replace(/^met$/, "0")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


/** Rank by estimated overall band, then average skill band, then volume. */
export function rankStudents(students: StudentReport[]): StudentReport[] {
  const avgSkill = (r: StudentReport) => {
    const v = CORE_SKILLS.map((s) => r.skills[s].avgBand).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : -1;
  };
  return [...students].sort(
    (a, b) => (b.overallBand ?? -1) - (a.overallBand ?? -1) || avgSkill(b) - avgSkill(a) || b.attempts - a.attempts,
  );
}

const PODIUM = [
  { label: "1st", bg: "linear-gradient(135deg,#b45309,#c2410c)", icon: Crown },
  { label: "2nd", bg: "linear-gradient(135deg,#4f46e5,#7c3aed)", icon: Medal },
  { label: "3rd", bg: "linear-gradient(135deg,#0369a1,#0f766e)", icon: Medal },
];

function Podium({ ranked }: { ranked: StudentReport[] }) {
  return (
    <ol className={cn("grid gap-3", ranked.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {ranked.map((s, i) => {
        const p = PODIUM[i];
        const Icon = p?.icon ?? Trophy;
        return (
          <li
            key={s.studentId}
            className={cn("relative overflow-hidden rounded-2xl p-5 shadow-md", p ? "text-white" : "border bg-card")}
            style={p ? { background: p.bg } : undefined}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-full text-sm font-bold ring-2 ring-white/70"
                style={{ backgroundColor: s.color, color: readableTextOn(s.color) }}
                aria-hidden
              >
                {initials(s.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-semibold">{s.name}</div>
                <div className={cn("text-xs", p ? "text-white/85" : "text-muted-foreground")}>
                  {pluralize(s.attempts, "attempt")} · {pluralize(s.practiceDays, "day")}
                </div>
              </div>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", p ? "bg-white/20" : "bg-muted")}>
                <Icon className="size-3.5" aria-hidden /> {p?.label ?? `${i + 1}th`}
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <div className={cn("text-xs font-medium", p ? "text-white/85" : "text-muted-foreground")}>Overall band</div>
                <div className="text-5xl leading-none font-bold tracking-tighter tabular">{formatBand(s.overallBand)}</div>
              </div>
              <div className={cn("text-right text-xs", p ? "text-white/90" : "text-muted-foreground")}>
                <div className="inline-flex items-center gap-1">
                  <Target className="size-3.5" aria-hidden /> target {formatBand(s.targetBand)}
                </div>
                <div className="inline-flex items-center gap-1">
                  <Flame className="size-3.5" aria-hidden /> {pluralize(s.currentStreak, "day")} streak
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type Champion = { title: string; icon: React.ComponentType<{ className?: string }>; bg: string; get: (r: StudentReport) => number | null; fmt: (v: number) => string };

const CHAMPIONS: Champion[] = [
  { title: "Most practice", icon: Sparkles, bg: "linear-gradient(135deg,#be185d,#7e22ce)", get: (r) => r.attempts || null, fmt: (v) => pluralize(v, "attempt") },
  { title: "Most active days", icon: Trophy, bg: "linear-gradient(135deg,#c2410c,#b91c1c)", get: (r) => r.practiceDays || null, fmt: (v) => pluralize(v, "day") },
  { title: "Hottest streak", icon: Flame, bg: "linear-gradient(135deg,#b45309,#c2410c)", get: (r) => r.currentStreak || null, fmt: (v) => pluralize(v, "day") },
  {
    title: "Most improved",
    icon: TrendingUp,
    bg: "linear-gradient(135deg,#047857,#0e7490)",
    get: (r) => (r.overallBand != null && r.previous?.overallBand != null ? r.overallBand - r.previous.overallBand : null),
    fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} overall`,
  },
  ...CORE_SKILLS.map<Champion>((s) => ({
    title: `Best ${SKILL_LABELS[s]}`,
    icon: SKILL_ICONS[s],
    bg: `linear-gradient(135deg, ${SKILL_SOLID[s]}, #4c1d95)`,
    get: (r) => r.skills[s].avgBand,
    fmt: (v) => `${v.toFixed(2)} avg band`,
  })),
];

function Champions({ students }: { students: StudentReport[] }) {
  return (
    <section aria-labelledby="champions-heading" className="grid gap-3">
      <h2 id="champions-heading" className="text-lg font-semibold">
        Category champions
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CHAMPIONS.map((c) => {
          const scored = students.map((s) => ({ s, v: c.get(s) })).filter((x): x is { s: StudentReport; v: number } => x.v != null);
          const best = scored.length ? Math.max(...scored.map((x) => x.v)) : null;
          const winners = best == null || (c.title === "Most improved" && best <= 0) ? [] : scored.filter((x) => x.v === best);
          const Icon = c.icon;
          return (
            <li key={c.title} className="rounded-2xl p-4 text-white shadow-md" style={{ background: c.bg }}>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/90 uppercase">
                <Icon className="size-4" aria-hidden /> {c.title}
              </div>
              {winners.length ? (
                <>
                  <div className="mt-3 truncate text-lg font-bold">
                    {winners.length > 1 ? `Tie: ${winners.map((w) => w.s.name).join(" & ")}` : winners[0].s.name}
                  </div>
                  <div className="text-sm text-white/90 tabular">{c.fmt(best!)}</div>
                </>
              ) : (
                <div className="mt-3 text-sm text-white/85">Up for grabs</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ScoreboardView({ payload }: { payload: ReportPayload }) {
  const ranked = rankStudents(payload.students);
  const fmtWeek = (w: string) => formatDateShort(w, payload.today);
  const weeks = [...new Set(ranked.flatMap((s) => s.weeks.map((w) => w.week)))].sort();
  const series = ranked.map((s, i) => ({ key: `s${i}`, label: s.name, color: s.color }));
  const volume: Record<string, string | number>[] = weeks.map((week) => ({
    week,
    ...Object.fromEntries(
      ranked.map((s, i) => {
        const w = s.weeks.find((x) => x.week === week);
        return [`s${i}`, w ? Object.values(w.counts).reduce((a, b) => a + (b ?? 0), 0) : 0];
      }),
    ),
  }));

  return (
    <div className="grid gap-6">
      <Podium ranked={ranked} />
      <Champions students={ranked} />
      <HeadToHead students={ranked} />
      <ChartCard
        title="Practice race"
        description="Attempts per week"
        legend={series}
        table={<MiniTable head={["Week", ...series.map((s) => s.label)]} rows={volume.map((d) => [fmtWeek(String(d.week)), ...series.map((s) => d[s.key] as number)])} />}
      >
        {weeks.length ? <BarSeriesChart data={volume} series={series} xKey="week" xFormat={fmtWeek} /> : <NoData />}
      </ChartCard>
    </div>
  );
}
