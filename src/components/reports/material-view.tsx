import { Crown, Medal, Trophy } from "lucide-react";
import { SKILL_ICONS } from "@/components/skill-icon";
import { TONES, type Tone } from "@/components/tones";
import { formatDateShort } from "@/lib/dates";
import { percentText, scoreText } from "@/lib/format";
import type { MaterialBoard } from "@/lib/material";
import { formatBand } from "@/lib/scoring";
import { cn, initials, pluralize, readableTextOn } from "@/lib/utils";

const PLACES: { label: string; tone: Tone; icon: typeof Crown }[] = [
  { label: "1st", tone: "amber", icon: Crown },
  { label: "2nd", tone: "violet", icon: Medal },
  { label: "3rd", tone: "sky", icon: Medal },
];

/** Head-to-head on one book / test / part: ranked cards, then every item side by side. */
export function MaterialView({ board, title, today }: { board: MaterialBoard; title: string; today: string }) {
  const students = board.summaries.map((s) => s.student);
  const anyone = board.summaries.some((s) => s.attempts > 0);

  if (!anyone) {
    return (
      <div className="rounded-xl border border-dashed bg-surface/60 px-6 py-14 text-center">
        <h2 className="font-semibold">Nobody has logged {title} yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Log it from Quick entry and it will show up here straight away.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <ol className={cn("grid gap-3", students.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
        {board.summaries.map((s, i) => {
          const place = s.attempts > 0 ? PLACES[i] : undefined;
          const tone = place ? TONES[place.tone] : null;
          const Icon = place?.icon ?? Trophy;
          return (
            <li key={s.student.id} className={cn("rounded-2xl border p-5 shadow-sm", tone ? tone.tile : "bg-card")}>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-full text-sm font-bold ring-2 ring-background"
                  style={{ backgroundColor: s.student.color, color: readableTextOn(s.student.color) }}
                >
                  {initials(s.student.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.student.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.attempts ? `${pluralize(s.attempts, "attempt")} · ${pluralize(s.items, "item")}` : "Not attempted"}
                  </div>
                </div>
                {s.attempts > 0 && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", tone ? cn(tone.chip, "text-white") : "bg-muted")}>
                    <Icon className="size-3.5" aria-hidden /> {place?.label ?? `${i + 1}th`}
                  </span>
                )}
              </div>
              {s.attempts > 0 && (
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Wins</dt>
                    <dd className={cn("text-2xl font-bold tabular", tone?.text)}>{s.wins}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Best band</dt>
                    <dd className="text-2xl font-bold tabular">{formatBand(s.bestBand)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Avg %</dt>
                    <dd className="text-2xl font-bold tabular">{s.avgPercent != null ? `${Math.round(s.avgPercent)}%` : "—"}</dd>
                  </div>
                </dl>
              )}
            </li>
          );
        })}
      </ol>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="px-5 py-4">
          <h2 className="text-[15px] font-semibold">Score by score</h2>
          <p className="text-sm text-muted-foreground">Each student&apos;s best on every item, with how many times they tried it. The leader is marked.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">
                  Item
                </th>
                {students.map((s) => (
                  <th key={s.id} scope="col" className="px-3 py-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.items.map((item) => {
                const Icon = SKILL_ICONS[item.skill];
                return (
                  <tr key={item.key} className="border-t">
                    <th scope="row" className="px-5 py-2.5 text-left font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" aria-hidden />
                        {item.label}
                      </span>
                    </th>
                    {students.map((s) => {
                      const c = item.cells[s.id];
                      const lead = item.leaders.includes(s.id);
                      return (
                        <td key={s.id} className={cn("px-3 py-2.5 text-right align-top tabular", lead && "font-semibold")}>
                          {c ? (
                            <>
                              <span>
                                {[scoreText(c.best), c.best.band != null ? formatBand(c.best.band) : !scoreText(c.best) ? percentText(c.best.percent) : null]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </span>
                              {lead && (
                                <span className="ml-1.5 rounded bg-primary-soft px-1 py-0.5 text-[10px] font-semibold text-primary">▲ best</span>
                              )}
                              <span className="block text-xs font-normal text-muted-foreground">
                                {formatDateShort(c.best.date, today)}
                                {c.attempts > 1 && ` · ×${c.attempts}`}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
