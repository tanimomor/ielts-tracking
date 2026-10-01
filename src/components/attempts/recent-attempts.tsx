"use client";

import { SKILL_ICONS } from "@/components/skill-icon";
import { SKILL_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import { formatBand } from "@/lib/scoring";
import type { Attempt } from "@/server/db/schema";
import { DeleteAttemptButton } from "./delete-attempt-button";

export function RecentAttempts({ attempts, today }: { attempts: Attempt[]; today: string }) {
  if (!attempts.length) {
    return (
      <p className="rounded-lg border border-dashed bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
        Nothing logged yet. Your entries will show up here.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-xl border bg-background">
      {attempts.map((a) => (
        <RecentRow key={a.id} attempt={a} today={today} />
      ))}
    </ul>
  );
}

function RecentRow({ attempt: a, today }: { attempt: Attempt; today: string }) {
  const Icon = SKILL_ICONS[a.skill];
  const score = a.rawScore != null && a.total != null ? `${a.rawScore}/${a.total}` : null;

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-label={SKILL_LABELS[a.skill]} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{a.code || SKILL_LABELS[a.skill]}</div>
        <div className="truncate text-xs text-muted-foreground">
          {a.date === today ? "Today" : formatDateShort(a.date, today)}
          {score && ` · ${score}`}
        </div>
      </div>
      <span className="text-sm font-semibold tabular">{a.band != null ? formatBand(a.band) : a.percent != null ? `${Math.round(a.percent)}%` : ""}</span>
      <DeleteAttemptButton id={a.id} label={`${a.code || SKILL_LABELS[a.skill]} (${a.date})`} />
    </li>
  );
}
