"use client";

import { ChartCard, MiniTable, NoData } from "@/components/charts/chart-card";
import { LineTrendChart } from "@/components/charts/line-trend-chart";
import { SKILL_COLORS, SKILL_ICONS } from "@/components/skill-icon";
import { Card } from "@/components/ui/card";
import { CORE_SKILLS, SKILL_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import type { ReportPayload } from "@/lib/reports/types";
import { formatBand } from "@/lib/scoring";

export function ProfileProgress({ payload, color }: { payload: ReportPayload; color: string }) {
  const r = payload.combined;
  const fmtWeek = (w: string) => formatDateShort(w, payload.today);
  const data = r.weeks.map((w) => {
    const v = Object.values(w.bands).filter((x): x is number => x != null);
    return { week: w.week, avg: v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null };
  });
  const bands = data.map((d) => d.avg).filter((x): x is number => x != null);
  const lo = Math.max(0, Math.floor(Math.min(...bands, r.targetBand ?? 9) - 0.5));
  const pct = (b: number | null) => `${((b ?? 0) / 9) * 100}%`;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Card className="gap-4 px-5 py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Current (all time)</div>
            <div className="text-6xl leading-none font-semibold tracking-tighter tabular">{formatBand(r.overallBand)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-muted-foreground">Target</div>
            <div className="text-3xl font-semibold tabular text-muted-foreground">{formatBand(r.targetBand)}</div>
          </div>
        </div>
        <ul className="grid gap-3">
          {CORE_SKILLS.map((s) => {
            const Icon = SKILL_ICONS[s];
            const current = r.skills[s].recentBand ?? r.skills[s].avgBand;
            return (
              <li key={s} className="grid gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-4" style={{ color: SKILL_COLORS[s] }} aria-hidden />
                    {SKILL_LABELS[s]}
                  </span>
                  <span className="tabular">
                    <span className="font-semibold">{formatBand(current)}</span>
                    <span className="text-muted-foreground"> / {formatBand(r.targetBand)}</span>
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-muted" aria-hidden>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(current), backgroundColor: color }} />
                  {r.targetBand != null && <div className="absolute -top-1 h-3.5 w-0.5 rounded bg-foreground/70" style={{ left: pct(r.targetBand) }} />}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">Current = average of the last 5 bands per skill.</p>
      </Card>
      <ChartCard
        title="Progress timeline"
        description="Weekly average band across skills"
        table={<MiniTable head={["Week", "Average band"]} rows={data.map((d) => [fmtWeek(d.week), d.avg?.toFixed(2) ?? null])} />}
      >
        {bands.length ? (
          <LineTrendChart
            data={data}
            series={[{ key: "avg", label: "Average band", color }]}
            xKey="week"
            xFormat={fmtWeek}
            yDomain={[lo, 9]}
            target={r.targetBand != null ? { value: r.targetBand, label: `Target ${formatBand(r.targetBand)}` } : null}
            height={300}
          />
        ) : (
          <NoData>No banded attempts yet.</NoData>
        )}
      </ChartCard>
    </div>
  );
}
