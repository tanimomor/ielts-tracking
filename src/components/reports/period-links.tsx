"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PeriodPicker, type PeriodParams } from "./period-picker";

/** Period picker for the scoreboard's material mode (keeps the book/test/part filter). */
export function PeriodLinks({ period, today, extra }: { period: PeriodParams; today: string; extra: Record<string, string> }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <PeriodPicker
      value={period}
      today={today}
      onChange={(next) => {
        const p = new URLSearchParams(extra);
        for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
        start(() => router.push(`/scoreboard?${p.toString()}`, { scroll: false }));
      }}
    />
  );
}
