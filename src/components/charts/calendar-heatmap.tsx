"use client";

import { useEffect, useRef } from "react";
import { addDays, eachDay, formatDateLong, startOfWeek, type DateStr } from "@/lib/dates";

// Single-hue sequential ramp (violet), light → dark; 0 is the surface tint.
const RAMP = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function level(count: number, max: number) {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}

/** GitHub-style practice calendar: columns are Monday-start weeks. */
export function CalendarHeatmap({ days, from, to }: { days: { date: string; count: number }[]; from: DateStr; to: DateStr }) {
  const scroller = useRef<HTMLDivElement>(null);
  // Long ranges overflow on small screens: start at the most recent weeks.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [from, to]);
  const counts = new Map(days.map((d) => [d.date, d.count]));
  const max = Math.max(1, ...days.map((d) => d.count));
  const start = startOfWeek(from);
  const all = eachDay(start, addDays(startOfWeek(to), 6));
  const weeks: DateStr[][] = [];
  for (let i = 0; i < all.length; i += 7) weeks.push(all.slice(i, i + 7));

  return (
    <div className="grid gap-2">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="inline-grid grid-flow-col gap-[3px]" role="img" aria-label={`Practice calendar: ${days.length} active days`}>
          <div className="grid grid-rows-[12px_repeat(7,12px)] gap-[3px] pr-1 text-[10px] leading-3 text-muted-foreground">
            <span />
            {["M", "", "W", "", "F", "", ""].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          {weeks.map((week, wi) => {
            const firstOfMonth = wi === 0 ? from : week.find((d) => d.endsWith("-01") && d >= from && d <= to);
            return (
              <div key={week[0]} className="grid grid-rows-[12px_repeat(7,12px)] gap-[3px]">
                <span className="text-[10px] leading-3 whitespace-nowrap text-muted-foreground">
                  {firstOfMonth ? MONTHS[Number(firstOfMonth.slice(5, 7)) - 1] : ""}
                </span>
                {week.map((d) => {
                  const inRange = d >= from && d <= to;
                  const c = counts.get(d) ?? 0;
                  return (
                    <span
                      key={d}
                      title={inRange ? `${formatDateLong(d)}: ${c} ${c === 1 ? "attempt" : "attempts"}` : undefined}
                      className="size-3 rounded-[3px]"
                      style={{ backgroundColor: inRange ? RAMP[level(c, max)] : "transparent" }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        Less
        {RAMP.map((c) => (
          <span key={c} aria-hidden className="size-3 rounded-[3px]" style={{ backgroundColor: c }} />
        ))}
        More
      </div>
    </div>
  );
}
