"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { TooltipBox } from "./chart-card";


/** Single-series horizontal bars with the value at the tip. */
export function HBarChart({
  data,
  color,
  format = (v) => String(v),
  valueLabel,
}: {
  data: { label: string; value: number }[];
  color: string;
  format?: (v: number) => string;
  valueLabel: string;
}) {
  const height = Math.max(120, data.length * 30 + 16);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-label)", fontSize: 12 }}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-cursor)" }}
            content={(p: TooltipContentProps<ValueType, NameType>) => {
              const d = p.payload?.[0]?.payload;
              return p.active && d ? <TooltipBox title={d.label} items={[{ label: valueLabel, value: format(d.value), color }]} /> : null;
            }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => format(Number(v))} style={{ fill: "var(--chart-label)", fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
