"use client";

import { Flame, Lightbulb, Target } from "lucide-react";
import { BarSeriesChart } from "@/components/charts/bar-series-chart";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { ChartCard, MiniTable, NoData } from "@/components/charts/chart-card";
import { HBarChart } from "@/components/charts/hbar-chart";
import { LineTrendChart } from "@/components/charts/line-trend-chart";
import { SkillRadar } from "@/components/charts/skill-radar";
import { SKILL_COLORS, SKILL_ICONS } from "@/components/skill-icon";
import { Card } from "@/components/ui/card";
import { CORE_SKILLS, SKILLS, SKILL_LABELS, type CoreSkill } from "@/lib/constants";
import { addDays, formatDateShort } from "@/lib/dates";
import type { ReportPayload, StudentReport } from "@/lib/reports/types";
import { formatBand } from "@/lib/scoring";
import { cn, pluralize } from "@/lib/utils";

export function Delta({ value, digits = 1, suffix = "", label }: { value: number | null; digits?: number; suffix?: string; label?: string }) {
  if (value == null) return null;
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  if (rounded === 0) {
    return <span className="text-xs text-muted-foreground">± 0{suffix}{label ? ` ${label}` : ""}</span>;
  }
  const up = rounded > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", up ? "text-success" : "text-destructive")}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "up" : "down"}</span>
      {Math.abs(rounded).toFixed(digits)}
      {suffix}
      {label && <span className="ml-1 font-normal text-muted-foreground">{label}</span>}
    </span>
  );
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="gap-1 px-4 py-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight tabular">{value}</div>
      {sub && <div className="min-h-4">{sub}</div>}
    </Card>
  );
}

const weekLabel = (today: string) => (w: string) => formatDateShort(w, today);

function Hero({ r, payload }: { r: StudentReport; payload: ReportPayload }) {
  const prevLabel = payload.period.previousPhrase ? `vs ${payload.period.previousPhrase}` : undefined;
  const missing = CORE_SKILLS.filter((s) => r.skills[s].avgBand == null).map((s) => SKILL_LABELS[s]);
  const gap = r.overallBand != null && r.targetBand != null ? r.targetBand - r.overallBand : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card className="relative gap-0 overflow-hidden px-6 py-6">
        <div className="text-sm font-medium text-muted-foreground">Estimated overall band</div>
        <div className="mt-2 flex items-end gap-4">
          <span className={cn("text-7xl leading-none font-semibold tracking-tighter tabular md:text-8xl", r.overallBand == null && "text-muted-foreground/50")}>
            {formatBand(r.overallBand)}
          </span>
          <div className="mb-2 grid gap-1">
            {r.previous && r.overallBand != null && r.previous.overallBand != null && (
              <Delta value={r.overallBand - r.previous.overallBand} label={prevLabel} />
            )}
            {r.targetBand != null && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Target className="size-3.5" aria-hidden /> Target {formatBand(r.targetBand)}
              </span>
            )}
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {r.overallBand == null
            ? missing.length === 4
              ? "Log banded attempts in all four skills to see an estimate."
              : `Needs a ${missing.join(" & ")} band to estimate.`
            : gap != null && gap > 0
              ? `${gap.toFixed(1)} to go. Average of each skill's band ${payload.period.phrase}, rounded like a real result.`
              : `Average of each skill's band ${payload.period.phrase}, rounded like a real result.`}
        </p>
        {r.targetBand != null && r.overallBand != null && (
          <div className="mt-4" aria-hidden>
            <div className="relative h-2 rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${(r.overallBand / 9) * 100}%` }} />
              <div className="absolute -top-1 h-4 w-0.5 rounded bg-foreground" style={{ left: `${(r.targetBand / 9) * 100}%` }} />
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Attempts"
          value={r.attempts}
          sub={r.previous && <Delta value={r.attempts - r.previous.attempts} digits={0} label={prevLabel} />}
        />
        <StatTile
          label="Practice days"
          value={r.practiceDays}
          sub={r.previous && <Delta value={r.practiceDays - r.previous.practiceDays} digits={0} label={prevLabel} />}
        />
        <StatTile
          label="Current streak"
          value={
            <span className="inline-flex items-center gap-1.5">
              {r.currentStreak > 0 && <Flame className="size-5 text-warning" aria-hidden />}
              {pluralize(r.currentStreak, "day")}
            </span>
          }
          sub={<span className="text-xs text-muted-foreground">Longest in period: {pluralize(r.longestStreak, "day")}</span>}
        />
        <StatTile
          label="Time practised"
          value={r.minutes >= 60 ? `${Math.round(r.minutes / 6) / 10} h` : `${r.minutes} min`}
          sub={<span className="text-xs text-muted-foreground">Logged time only</span>}
        />
      </div>
    </div>
  );
}

function SkillCards({ r, payload }: { r: StudentReport; payload: ReportPayload }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CORE_SKILLS.map((s) => {
        const st = r.skills[s];
        const Icon = SKILL_ICONS[s];
        const prev = r.previous?.avgBand[s];
        return (
          <Card key={s} className="gap-2 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon className="size-4" style={{ color: SKILL_COLORS[s] }} aria-hidden />
              {SKILL_LABELS[s]}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight tabular">{formatBand(st.avgBand)}</span>
              <span className="text-xs text-muted-foreground">avg</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                Best <span className="font-medium text-foreground tabular">{formatBand(st.bestBand)}</span>
              </span>
              <span>{pluralize(st.attempts, "attempt")}</span>
              {(s === "listening" || s === "reading") && st.avgPercent != null && <span className="tabular">{Math.round(st.avgPercent)}% avg</span>}
            </div>
            {prev != null && st.avgBand != null && (
              <Delta value={st.avgBand - prev} label={payload.period.previousPhrase ? `vs ${payload.period.previousPhrase}` : undefined} />
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Insights({ items, className }: { items: string[]; className?: string }) {
  return (
    <Card className={cn("gap-3 px-5 py-5", className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <Lightbulb className="size-4 text-warning" aria-hidden /> Insights
      </h2>
      {items.length ? (
        <ul className="grid gap-2 text-sm">
          {items.map((i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {i}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing notable yet — keep logging.</p>
      )}
    </Card>
  );
}

function Charts({ r, payload }: { r: StudentReport; payload: ReportPayload }) {
  const fmtWeek = weekLabel(payload.today);
  const trendData = r.weeks.map((w) => ({ week: w.week, ...w.bands }));
  const bandSeries = CORE_SKILLS.filter((s) => r.weeks.some((w) => w.bands[s] != null)).map((s) => ({
    key: s,
    label: SKILL_LABELS[s],
    color: SKILL_COLORS[s],
  }));
  const allBands = r.weeks.flatMap((w) => Object.values(w.bands)).filter((v): v is number => v != null);
  const lo = Math.max(0, Math.floor(Math.min(...allBands, r.targetBand ?? 9) - 0.5));
  const volumeSeries = SKILLS.filter((s) => r.weeks.some((w) => w.counts[s])).map((s) => ({
    key: s,
    label: SKILL_LABELS[s],
    color: SKILL_COLORS[s],
  }));
  const volumeData = r.weeks.map((w) => ({ week: w.week, ...Object.fromEntries(SKILLS.map((s) => [s, w.counts[s] ?? 0])) }));

  const calTo = payload.period.to && payload.period.to < payload.today ? payload.period.to : payload.today;
  const yearAgo = addDays(payload.today, -364);
  const firstDay = r.calendar[0]?.date;
  const calFrom = payload.period.from ?? (firstDay && firstDay > yearAgo ? firstDay : yearAgo);

  const radarValues = Object.fromEntries(CORE_SKILLS.map((s) => [s, r.skills[s].recentBand ?? r.skills[s].avgBand])) as Record<CoreSkill, number | null>;
  const radarSeries = [
    { label: "Current level", color: "#4338ca", values: radarValues },
    ...(r.targetBand != null
      ? [{ label: `Target ${formatBand(r.targetBand)}`, color: "#556070", dashed: true, values: Object.fromEntries(CORE_SKILLS.map((s) => [s, r.targetBand])) }]
      : []),
  ];

  const partData = ["1", "2", "3", "4"]
    .map((part) => ({
      part: `Part ${part}`,
      listening: r.parts.find((p) => p.skill === "listening" && p.part === part)?.avgPercent ?? null,
      reading: r.parts.find((p) => p.skill === "reading" && p.part === part)?.avgPercent ?? null,
    }))
    .filter((d) => d.listening != null || d.reading != null);

  const byBook = new Map<number, { attempts: number; pct: number[]; band: number[] }>();
  for (const b of r.books) {
    const e = byBook.get(b.book) ?? { attempts: 0, pct: [], band: [] };
    e.attempts += b.attempts;
    if (b.avgPercent != null) e.pct.push(b.avgPercent);
    if (b.avgBand != null) e.band.push(b.avgBand);
    byBook.set(b.book, e);
  }
  const bookBars = [...byBook.entries()]
    .sort(([a], [b]) => a - b)
    .map(([book, e]) => ({
      book: `C${book}`,
      band: e.band.length ? Math.round((e.band.reduce((x, y) => x + y, 0) / e.band.length) * 100) / 100 : null,
    }))
    .filter((b) => b.band != null);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartCard
          title="Band trend"
          description="Weekly average band per skill"
          legend={[...bandSeries, ...(r.targetBand != null ? [{ label: "Target", color: "#556070", dashed: true }] : [])]}
          table={
            <MiniTable
              head={["Week", ...bandSeries.map((s) => s.label)]}
              rows={r.weeks.map((w) => [fmtWeek(w.week), ...bandSeries.map((s) => w.bands[s.key as CoreSkill]?.toFixed(2) ?? null)])}
            />
          }
        >
          {bandSeries.length ? (
            <LineTrendChart
              data={trendData}
              series={bandSeries}
              xKey="week"
              xFormat={fmtWeek}
              yDomain={[lo, 9]}
              target={r.targetBand != null ? { value: r.targetBand, label: `Target ${formatBand(r.targetBand)}` } : null}
            />
          ) : (
            <NoData>Bands appear once you log full L/R tests or W/S bands.</NoData>
          )}
        </ChartCard>
        <ChartCard
          title="Skill balance"
          description="Current level (last 5 bands) vs target"
          legend={radarSeries.map((s) => ({ label: s.label, color: s.color, dashed: "dashed" in s }))}
          table={
            <MiniTable
              head={["Skill", "Current", "Average", "Best"]}
              rows={CORE_SKILLS.map((s) => [SKILL_LABELS[s], formatBand(radarValues[s]), formatBand(r.skills[s].avgBand), formatBand(r.skills[s].bestBand)])}
            />
          }
        >
          {CORE_SKILLS.some((s) => radarValues[s] != null) ? <SkillRadar series={radarSeries} /> : <NoData />}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartCard
          title="Practice volume"
          description="Attempts per week by skill"
          legend={volumeSeries}
          table={
            <MiniTable
              head={["Week", ...volumeSeries.map((s) => s.label)]}
              rows={volumeData.map((w) => [fmtWeek(w.week), ...volumeSeries.map((s) => (w as Record<string, number | string>)[s.key] as number)])}
            />
          }
        >
          {volumeData.length ? (
            <BarSeriesChart data={volumeData} series={volumeSeries} xKey="week" xFormat={fmtWeek} stacked totalLabel="Total" />
          ) : (
            <NoData />
          )}
        </ChartCard>
        <ChartCard title="Practice calendar" description={`${pluralize(r.practiceDays, "day")} with practice`}>
          <CalendarHeatmap days={r.calendar} from={calFrom} to={calTo} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Listening & Reading by section"
          description="Average % on single-part practice"
          legend={[
            { label: "Listening", color: SKILL_COLORS.listening },
            { label: "Reading", color: SKILL_COLORS.reading },
          ]}
          table={
            <MiniTable
              head={["Section", "Listening %", "Reading %"]}
              rows={partData.map((d) => [d.part, d.listening != null ? Math.round(d.listening) : null, d.reading != null ? Math.round(d.reading) : null])}
            />
          }
        >
          {partData.length ? (
            <BarSeriesChart
              data={partData}
              series={[
                { key: "listening", label: "Listening", color: SKILL_COLORS.listening },
                { key: "reading", label: "Reading", color: SKILL_COLORS.reading },
              ]}
              xKey="part"
              yFormat={(v) => `${Math.round(v)}%`}
              yDomain={[0, 100]}
            />
          ) : (
            <NoData>Log single parts or passages (e.g. P2) to see which section is weakest.</NoData>
          )}
        </ChartCard>
        <ChartCard
          title="Most frequent mistakes"
          description="Mistake tags in this period"
          table={<MiniTable head={["Tag", "Count"]} rows={r.tags.map((t) => [t.tag, t.count])} />}
        >
          {r.tags.length ? (
            <HBarChart data={r.tags.slice(0, 8).map((t) => ({ label: t.tag, value: t.count }))} color="#4338ca" valueLabel="Times tagged" />
          ) : (
            <NoData>Tag mistakes when you log to see patterns here.</NoData>
          )}
        </ChartCard>
      </div>

      <ChartCard title="By Cambridge book" description="Average band per book (full L/R tests and W/S)">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {bookBars.length ? (
            <BarSeriesChart
              data={bookBars}
              series={[{ key: "band", label: "Average band", color: "#4338ca" }]}
              xKey="book"
              yDomain={[0, 9]}
              yFormat={(v) => v.toFixed(1)}
            />
          ) : (
            <NoData />
          )}
          <div className="max-h-72 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Book / test</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Attempts</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Avg %</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Avg band</th>
                </tr>
              </thead>
              <tbody>
                {r.books.length ? (
                  r.books.map((b) => (
                    <tr key={`${b.book}-${b.test}`} className="border-t">
                      <td className="px-3 py-1.5 font-medium">
                        Cambridge {b.book}
                        {b.test != null && <span className="text-muted-foreground"> · Test {b.test}</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular">{b.attempts}</td>
                      <td className="px-3 py-1.5 text-right tabular">{b.avgPercent != null ? `${Math.round(b.avgPercent)}%` : "—"}</td>
                      <td className="px-3 py-1.5 text-right font-medium tabular">{formatBand(b.avgBand)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No book practice in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

function StudentBreakdown({ payload }: { payload: ReportPayload }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="px-5 py-4">
        <h2 className="text-[15px] font-semibold">By student</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-2 font-medium">Student</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Overall</th>
              {CORE_SKILLS.map((s) => (
                <th key={s} scope="col" className="px-3 py-2 text-right font-medium">
                  {SKILL_LABELS[s]}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-medium">Attempts</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Streak</th>
            </tr>
          </thead>
          <tbody>
            {payload.students.map((s) => (
              <tr key={s.studentId} className="border-t">
                <td className="px-5 py-2.5">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular">{formatBand(s.overallBand)}</td>
                {CORE_SKILLS.map((k) => (
                  <td key={k} className="px-3 py-2.5 text-right tabular">
                    {s.skills[k].avgBand != null ? s.skills[k].avgBand!.toFixed(1) : "—"}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular">{s.attempts}</td>
                <td className="px-5 py-2.5 text-right tabular">{pluralize(s.currentStreak, "day")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ReportView({ payload }: { payload: ReportPayload }) {
  const r = payload.combined;
  const multi = r.studentId == null;
  return (
    <div className="grid gap-4">
      <Hero r={r} payload={payload} />
      <SkillCards r={r} payload={payload} />
      {multi ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {payload.students.map((s) => (
            <Card key={s.studentId} className="gap-3 px-5 py-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
                <span className="font-normal text-muted-foreground">· insights</span>
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
      ) : (
        <Insights items={r.insights} />
      )}
      {multi && <StudentBreakdown payload={payload} />}
      <Charts r={r} payload={payload} />
    </div>
  );
}
