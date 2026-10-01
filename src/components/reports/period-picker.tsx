"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMonths, formatMonth, startOfMonth } from "@/lib/dates";
import type { PeriodType } from "@/lib/reports/period";

export type PeriodParams = { period: PeriodType; month?: string; year?: string; from?: string; to?: string };

const LABELS: Record<PeriodType, string> = { month: "Month", year: "Year", all: "All time", custom: "Custom" };

export function PeriodPicker({
  value,
  today,
  onChange,
}: {
  value: PeriodParams;
  today: string;
  onChange: (p: PeriodParams) => void;
}) {
  const months = Array.from({ length: 24 }, (_, i) => addMonths(startOfMonth(today), -i).slice(0, 7));
  const thisYear = Number(today.slice(0, 4));
  const years = Array.from({ length: 5 }, (_, i) => String(thisYear - i));
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.period}
        onValueChange={(p) => {
          const period = p as PeriodType;
          if (period === "month") onChange({ period, month: today.slice(0, 7) });
          else if (period === "year") onChange({ period, year: today.slice(0, 4) });
          else if (period === "custom") onChange({ period, from: from || undefined, to: to || undefined });
          else onChange({ period });
        }}
      >
        <SelectTrigger className="w-32" aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LABELS) as PeriodType[]).map((p) => (
            <SelectItem key={p} value={p}>
              {LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.period === "month" && (
        <Select value={value.month ?? today.slice(0, 7)} onValueChange={(month) => onChange({ period: "month", month })}>
          <SelectTrigger className="w-36" aria-label="Month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonth(`${m}-01`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {value.period === "year" && (
        <Select value={value.year ?? today.slice(0, 4)} onValueChange={(year) => onChange({ period: "year", year })}>
          <SelectTrigger className="w-28" aria-label="Year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {value.period === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="From date"
            value={from}
            max={today}
            onChange={(e) => setFrom(e.target.value)}
            onBlur={() => from && onChange({ period: "custom", from, to: to || today })}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onBlur={() => to && onChange({ period: "custom", from: from || undefined, to })}
            className="w-auto"
          />
        </div>
      )}
    </div>
  );
}
