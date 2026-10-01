"use client";

import { Activity, CalendarCheck, Clock, Flame, Lightbulb, Target } from "lucide-react";
import { BarSeriesChart } from "@/components/charts/bar-series-chart";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { ChartCard, MiniTable, NoData } from "@/components/charts/chart-card";
import { HBarChart } from "@/components/charts/hbar-chart";
import { LineTrendChart } from "@/components/charts/line-trend-chart";
import { SkillRadar } from "@/components/charts/skill-radar";
import { SKILL_COLORS, SKILL_ICONS, SKILL_SOLID } from "@/components/skill-icon";
import { Card } from "@/components/ui/card";
import { CORE_SKILLS, SKILLS, SKILL_LABELS, type CoreSkill } from "@/lib/constants";
import { bookName } from "@/lib/books";
import { addDays, formatDateShort } from "@/lib/dates";
import type { ReportPayload, StudentReport } from "@/lib/reports/types";
import { formatBand } from "@/lib/scoring";
import { cn, pluralize } from "@/lib/utils";

export function Delta({
  value,
  digits = 1,
  suffix = "",
  label,
  onDark = false,
}: {
  value: number | null;
  digits?: number;
  suffix?: string;
  label?: string;
  onDark?: boolean;
}) {
  if (value == null) return null;
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  if (rounded === 0) {
    return (
      <span className={cn("text-xs", onDark ? "text-white/85" : "text-muted-foreground")}>
        ± 0{suffix}
        {label ? ` ${label}` : ""}
      </span>
    );
  }
  const up = rounded > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular",
        onDark ? "rounded-full bg-white/20 px-2 py-0.5 text-white" : up ? "text-success" : "text-destructive",
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "up" : "down"}</span>
      {Math.abs(rounded).toFixed(digits)}
      {suffix}
      {label && <span className={cn("ml-1 font-normal", onDark ? "text-white/85" : "text-muted-foreground")}>{label}</span>}
    </span>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  return (
    <Card className="relative gap-1 overflow-hidden px-4 py-4">
      <span aria-hidden className="absolute -top-6 -right-6 size-20 rounded-full opacity-15" style={{ backgroundColor: tint }} />
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="grid size-6 place-items-center rounded-md text-white" style={{ backgroundColor: tint }}>
          <Icon className="size-3.5" aria-hidden />
        </span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular">{value}</div>
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
      <Card className="relative gap-0 overflow-hidden border-0 bg-brand px-6 py-6 text-white shadow-lg shadow-fuchsia-600/20">
        <span aria-hidden className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-white/10" />
        <div className="relative text-sm font-medium text-white/85">Estimated overall band</div>
        <div className="relative mt-2 flex items-end gap-4">
          <span className={cn("text-7xl leading-none font-bold tracking-tighter tabular md:text-8xl", r.overallBand == null && "text-white/60")}>
            {formatBand(r.overallBand)}
          </span>
          <div className="mb-2 grid gap-1">
            {r.previous && r.overallBand != null && r.previous.overallBand != null && (
              <Delta value={r.overallBand - r.previous.overallBand} label={prevLabel} onDark />
            )}
            {r.targetBand != null && (
              <span className="inline-flex items-center gap-1 text-sm text-white/90">
                <Target className="size-3.5" aria-hidden /> Target {formatBand(r.targetBand)}
              </span>
            )}
          </div>
        </div>
        <p className="relative mt-4 text-sm text-white/90">
          {r.overallBand == null
            ? missing.length === 4
              ? "Log banded attempts in all four skills to see an estimate."
              : `Needs a ${missing.join(" & ")} band to estimate.`
            : gap != null && gap > 0
              ? `${gap.toFixed(1)} to go. Average of each skill's band ${payload.period.phrase}, rounded like a real result.`
              : `Average of each skill's band ${payload.period.phrase}, rounded like a real result.`}
        </p>
        {r.targetBand != null && r.overallBand != null && (
          <div className="relative mt-4" aria-hidden>
            <div className="relative h-2.5 rounded-full bg-white/25">
              <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${(r.overallBand / 9) * 100}%` }} />
              <div className="absolute -top-1 h-[18px] w-1 rounded bg-amber-300" style={{ left: `${(r.targetBand / 9) * 100}%` }} />
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={Activity}
          tint="#2563eb"
          label="Attempts"
          value={r.attempts}
          sub={r.previous && <Delta value={r.attempts - r.previous.attempts} digits={0} label={prevLabel} />}
        />
        <StatTile
          icon={CalendarCheck}
          tint="#059669"
          label="Practice days"
          value={r.practiceDays}
          sub={r.previous && <Delta value={r.practiceDays - r.previous.practiceDays} digits={0} label={prevLabel} />}
        />
        <StatTile
          icon={Flame}
          tint="#ea580c"
          label="Current streak"
          value={
            <span className="inline-flex items-center gap-1.5">
              {pluralize(r.currentStreak, "day")}
            </span>
          }
          sub={<span className="text-xs text-muted-foreground">Longest in period: {pluralize(r.longestStreak, "day")}</span>}
        />
        <StatTile
          icon={Clock}
          tint="#db2777"
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
          <Card key={s} className="relative gap-2 overflow-hidden px-4 py-4">
            <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: SKILL_SOLID[s] }} />
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid size-7 place-items-center rounded-lg text-white shadow-sm" style={{ backgroundColor: SKILL_SOLID[s] }}>
                <Icon className="size-4" aria-hidden />
              </span>
              {SKILL_LABELS[s]}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular">{formatBand(st.avgBand)}</span>
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
    <Card className={cn("gap-3 border-amber-200 bg-gradient-to-br from-amber-50 to-rose-50 px-5 py-5 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-rose-950/30", className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        Insights
      </h2>
      {items.length ? (
        <ul className="grid gap-2 text-sm">
          {items.map((i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-orange-500" />
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
    { label: "Current level", color: "var(--chart-accent)", values: radarValues },
    ...(r.targetBand != null
      ? [{ label: `Target ${formatBand(r.targetBand)}`, color: "var(--chart-ref)", dashed: true, values: Object.fromEntries(CORE_SKILLS.map((s) => [s, r.targetBand])) }]
      : []),
  ];

  const partData = ["1", "2", "3", "4"]
    .map((part) => ({
      part: `Part ${part}`,
      listening: r.parts.find((p) => p.skill === "listening" && p.part === part)?.avgPercent ?? null,
      reading: r.parts.find((p) => p.skill === "reading" && p.part === part)?.avgPercent ?? null,
    }))
    .filter((d) => d.listening != null || d.reading != null);

  // One bar per book (series + volume), averaged over its tests.
  const byBook = new Map<string, { label: string; band: number[] }>();
  for (const b of r.books) {
    const prefix = (b.prefix ?? "c").toUpperCase();
    const key = `${b.series ?? "Cambridge"}:${b.book ?? ""}`;
    const e = byBook.get(key) ?? { label: `${prefix}${b.book ?? ""}`, band: [] };
    if (b.avgBand != null) e.band.push(b.avgBand);
    byBook.set(key, e);
  }
  const bookBars = [...byBook.values()]
    .map((e) => ({
      book: e.label,
      band: e.band.length ? Math.round((e.band.reduce((x, y) => x + y, 0) / e.band.length) * 100) / 100 : null,
    }))
    .filter((b) => b.band != null)
    .reverse();

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartCard
          title="Band trend"
          description="Weekly average band per skill"
          legend={[...bandSeries, ...(r.targetBand != null ? [{ label: "Target", color: "var(--chart-ref)", dashed: true }] : [])]}
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
            <HBarChart data={r.tags.slice(0, 8).map((t) => ({ label: t.tag, value: t.count }))} color="var(--chart-accent)" valueLabel="Times tagged" />
          ) : (
            <NoData>Tag mistakes when you log to see patterns here.</NoData>
          )}
        </ChartCard>
      </div>

      <ChartCard title="By book" description="Average band per book (full L/R tests and W/S)">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {bookBars.length ? (
            <BarSeriesChart
              data={bookBars}
              series={[{ key: "band", label: "Average band", color: "var(--chart-accent)" }]}
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
                    <tr key={`${b.series}-${b.book}-${b.test}`} className="border-t">
                      <td className="px-3 py-1.5 font-medium">
                        {bookName({ name: b.series ?? "Cambridge" }, b.book)}
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
