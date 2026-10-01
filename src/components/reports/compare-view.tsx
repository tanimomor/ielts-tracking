"use client";

import { useState } from "react";
import { BarSeriesChart } from "@/components/charts/bar-series-chart";
import { ChartCard, MiniTable, NoData } from "@/components/charts/chart-card";
import { LineTrendChart } from "@/components/charts/line-trend-chart";
import { SkillRadar } from "@/components/charts/skill-radar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CORE_SKILLS, SKILL_LABELS, type CoreSkill } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import type { ReportPayload, StudentReport } from "@/lib/reports/types";
import { formatBand } from "@/lib/scoring";
import { cn, pluralize } from "@/lib/utils";

type TrendKey = CoreSkill | "average";

function weekAverage(bands: Partial<Record<CoreSkill, number>>): number | null {
  const v = Object.values(bands).filter((x): x is number => x != null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
}

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

function CompareTable({ students }: { students: StudentReport[] }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="px-5 py-4">
        <h2 className="text-[15px] font-semibold">Side by side</h2>
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

export function CompareView({ payload }: { payload: ReportPayload }) {
  const students = payload.students;
  const [trend, setTrend] = useState<TrendKey>("average");
  const fmtWeek = (w: string) => formatDateShort(w, payload.today);

  const weeks = [...new Set(students.flatMap((s) => s.weeks.map((w) => w.week)))].sort();
  const series = students.map((s, i) => ({ key: `s${i}`, label: s.name, color: s.color }));
  type Row = Record<string, string | number | null>;
  const trendData: Row[] = weeks.map((week) => ({
    week,
    ...Object.fromEntries(
      students.map((s, i) => {
        const w = s.weeks.find((x) => x.week === week);
        const v = w ? (trend === "average" ? weekAverage(w.bands) : (w.bands[trend] ?? null)) : null;
        return [`s${i}`, v];
      }),
    ),
  }));
  const hasTrend = trendData.some((d) => series.some((s) => d[s.key] != null));
  const volumeData: Row[] = weeks.map((week) => ({
    week,
    ...Object.fromEntries(
      students.map((s, i) => {
        const w = s.weeks.find((x) => x.week === week);
        return [`s${i}`, w ? Object.values(w.counts).reduce((a, b) => a + (b ?? 0), 0) : 0];
      }),
    ),
  }));

  return (
    <div className="grid gap-4">
      <div className={cn("grid gap-3", students.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
        {students.map((s) => (
          <Card key={s.studentId} className="relative gap-1 overflow-hidden px-5 py-5">
            <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: s.color }} />
            <div className="text-sm font-semibold">{s.name}</div>
            <div className="flex items-end gap-3">
              <span className="text-5xl leading-none font-semibold tracking-tighter tabular">{formatBand(s.overallBand)}</span>
              <span className="mb-1 text-sm text-muted-foreground">target {formatBand(s.targetBand)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span>{pluralize(s.attempts, "attempt")}</span>
              <span>{pluralize(s.practiceDays, "practice day")}</span>
              <span>{pluralize(s.currentStreak, "day")} streak</span>
            </div>
          </Card>
        ))}
      </div>

      <ChartCard
        title="Band trend"
        description="Weekly average band, one line per student"
        legend={series}
        table={
          <MiniTable
            head={["Week", ...series.map((s) => s.label)]}
            rows={trendData.map((d) => [fmtWeek(String(d.week)), ...series.map((s) => (typeof d[s.key] === "number" ? (d[s.key] as number).toFixed(2) : null))])}
          />
        }
      >
        <Tabs value={trend} onValueChange={(v) => setTrend(v as TrendKey)}>
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="average">All skills</TabsTrigger>
            {CORE_SKILLS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {SKILL_LABELS[s]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {hasTrend ? (
          <LineTrendChart data={trendData} series={series} xKey="week" xFormat={fmtWeek} yDomain={[4, 9]} />
        ) : (
          <NoData>No banded {trend === "average" ? "" : SKILL_LABELS[trend] + " "}attempts in this period.</NoData>
        )}
      </ChartCard>

      <Card className="gap-4 px-5 py-5">
        <div>
          <h2 className="text-[15px] font-semibold">Skill balance</h2>
          <p className="text-sm text-muted-foreground">Current level (last 5 bands) vs each student&apos;s target</p>
        </div>
        <div className={cn("grid gap-4", students.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3")}>
          {students.map((s) => (
            <div key={s.studentId} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </div>
              <SkillRadar
                height={230}
                series={[
                  { label: "Current level", color: s.color, values: Object.fromEntries(CORE_SKILLS.map((k) => [k, s.skills[k].recentBand ?? s.skills[k].avgBand])) },
                  ...(s.targetBand != null
                    ? [{ label: "Target", color: "#556070", dashed: true, values: Object.fromEntries(CORE_SKILLS.map((k) => [k, s.targetBand])) }]
                    : []),
                ]}
              />
            </div>
          ))}
        </div>
      </Card>

      <CompareTable students={students} />

      <ChartCard
        title="Practice volume"
        description="Attempts per week"
        legend={series}
        table={<MiniTable head={["Week", ...series.map((s) => s.label)]} rows={volumeData.map((d) => [fmtWeek(String(d.week)), ...series.map((s) => d[s.key])])} />}
      >
        {weeks.length ? <BarSeriesChart data={volumeData} series={series} xKey="week" xFormat={fmtWeek} /> : <NoData />}
      </ChartCard>

      <div className={cn("grid gap-4", students.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3")}>
        {students.map((s) => (
          <Card key={s.studentId} className="gap-3 px-5 py-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name} <span className="font-normal text-muted-foreground">· insights</span>
            </h2>
            <ul className="grid gap-2 text-sm">
              {s.insights.map((i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  {i}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
