"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { AXIS, GRID, SURFACE, TooltipBox } from "./chart-card";
import type { Series } from "./line-trend-chart";

type Row = Record<string, string | number | null | undefined>;

/** Vertical bars, stacked or grouped. 2px surface gaps between touching marks. */
export function BarSeriesChart({
  data,
  series,
  xKey,
  xFormat = (v) => v,
  yFormat = (v) => String(v),
  stacked = false,
  height = 240,
  yDomain,
  totalLabel,
}: {
  data: Row[];
  series: Series[];
  xKey: string;
  xFormat?: (v: string) => string;
  yFormat?: (v: number) => string;
  stacked?: boolean;
  height?: number;
  yDomain?: [number, number];
  totalLabel?: string;
}) {
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%" barGap={2}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey={xKey} {...AXIS} tickFormatter={xFormat} minTickGap={12} />
          <YAxis {...AXIS} axisLine={false} width={36} allowDecimals={false} tickFormatter={yFormat} domain={yDomain} />
          <Tooltip
            cursor={{ fill: "#f2f4f7" }}
            content={(p: TooltipContentProps<ValueType, NameType>) => {
              if (!p.active || !p.payload?.length) return null;
              const items: { label: string; value: string; color?: string }[] = series.flatMap((s) => {
                const v = p.payload!.find((x) => x.dataKey === s.key)?.value;
                return typeof v === "number" && v !== 0 ? [{ label: s.label, value: yFormat(v), color: s.color }] : [];
              });
              if (stacked && totalLabel) {
                const total = p.payload.reduce((n, x) => n + (typeof x.value === "number" ? x.value : 0), 0);
                items.push({ label: totalLabel, value: yFormat(total) });
              }
              return <TooltipBox title={xFormat(String(p.label))} items={items} />;
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? "a" : undefined}
              stroke={SURFACE}
              strokeWidth={stacked ? 1 : 0}
              maxBarSize={24}
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
