"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { AXIS, GRID, SURFACE, TooltipBox } from "./chart-card";

export type Series = { key: string; label: string; color: string };
type Row = Record<string, string | number | null | undefined>;

/** Multi-series line chart with a crosshair tooltip and an optional target line. */
export function LineTrendChart({
  data,
  series,
  xKey,
  xFormat,
  yDomain = [0, 9],
  yFormat = (v: number) => v.toFixed(1),
  target,
  height = 260,
}: {
  data: Row[];
  series: Series[];
  xKey: string;
  xFormat: (v: string) => string;
  yDomain?: [number, number];
  yFormat?: (v: number) => string;
  target?: { value: number; label: string } | null;
  height?: number;
}) {
  const ticks: number[] = [];
  for (let t = yDomain[0]; t <= yDomain[1] + 1e-9; t += yDomain[1] - yDomain[0] > 4 ? 1 : 0.5) ticks.push(Math.round(t * 10) / 10);

  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey={xKey} {...AXIS} tickFormatter={xFormat} minTickGap={24} />
          <YAxis {...AXIS} axisLine={false} domain={yDomain} ticks={ticks} tickFormatter={yFormat} width={36} allowDataOverflow />
          {target && (
            <ReferenceLine
              y={target.value}
              stroke="var(--chart-ref)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: target.label, position: "insideTopRight", fill: "var(--chart-ref)", fontSize: 11 }}
            />
          )}
          <Tooltip
            cursor={{ stroke: "var(--chart-crosshair)", strokeWidth: 1 }}
            content={(p: TooltipContentProps<ValueType, NameType>) =>
              p.active && p.payload?.length ? (
                <TooltipBox
                  title={xFormat(String(p.label))}
                  items={series.flatMap((s) => {
                    const v = p.payload!.find((x) => x.dataKey === s.key)?.value;
                    return typeof v === "number" ? [{ label: s.label, value: yFormat(v), color: s.color }] : [];
                  })}
                />
              ) : null
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls
              dot={{ r: 3, fill: s.color, stroke: SURFACE, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: s.color, stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
