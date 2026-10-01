"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { CORE_SKILLS, SKILL_LABELS, type CoreSkill } from "@/lib/constants";
import { TooltipBox } from "./chart-card";

export type RadarSeries = { label: string; color: string; values: Partial<Record<CoreSkill, number | null>>; dashed?: boolean };

export function SkillRadar({ series, height = 260 }: { series: RadarSeries[]; height?: number }) {
  const data = CORE_SKILLS.map((s) => ({
    skill: SKILL_LABELS[s],
    ...Object.fromEntries(series.map((x, i) => [`s${i}`, x.values[s] ?? 0])),
  }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--chart-axis)" />
          <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--chart-label)", fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 9]} tickCount={4} tick={{ fill: "var(--chart-tick)", fontSize: 10 }} axisLine={false} angle={90} />
          <Tooltip
            content={(p: TooltipContentProps<ValueType, NameType>) => {
              const d = p.payload?.[0]?.payload;
              if (!p.active || !d) return null;
              return (
                <TooltipBox
                  title={String(d.skill)}
                  items={series.map((s, i) => ({
                    label: s.label,
                    value: Number(d[`s${i}`]) ? Number(d[`s${i}`]).toFixed(1) : "—",
                    color: s.color,
                  }))}
                />
              );
            }}
          />
          {series.map((s, i) => (
            <Radar
              key={s.label}
              dataKey={`s${i}`}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 4" : undefined}
              fill={s.color}
              fillOpacity={s.dashed ? 0 : 0.1}
              dot={s.dashed ? false : { r: 3, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
