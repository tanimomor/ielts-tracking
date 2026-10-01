"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Fragment } from "react";
import { SkillBadge } from "@/components/skill-icon";
import { StudentChip } from "@/components/students/student-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { attemptToValues } from "@/lib/attempt-values";
import { SKILL_LABELS } from "@/lib/constants";
import { formatDateLong, formatDateShort } from "@/lib/dates";
import type { SortKey } from "@/lib/filters";
import { percentText, scoreText } from "@/lib/format";
import { formatBand } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { AttemptListRow } from "@/server/queries/attempts";
import { useAttemptFilters } from "./attempts-shell";
import { DeleteAttemptButton } from "./delete-attempt-button";
import { EditAttemptDialog } from "./edit-attempt-dialog";

type Props = {
  rows: AttemptListRow[];
  currentStudentId: string;
  today: string;
  tagSuggestions: string[];
};

function groupByDate(rows: AttemptListRow[]) {
  const groups: { date: string; rows: AttemptListRow[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last?.date === r.date) last.rows.push(r);
    else groups.push({ date: r.date, rows: [r] });
  }
  return groups;
}

function SortHeader({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) {
  const { filters, hrefFor } = useAttemptFilters();
  const active = filters.sort === k;
  const nextDir = active && filters.dir === "desc" ? "asc" : "desc";
  const Icon = active ? (filters.dir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (filters.dir === "desc" ? "descending" : "ascending") : "none"}
    >
      <Link
        href={hrefFor({ sort: k, dir: nextDir, page: 1 })}
        scroll={false}
        className={cn("inline-flex items-center gap-1 rounded-sm hover:text-foreground", active && "text-foreground")}
      >
        {children}
        <Icon className={cn("size-3", !active && "opacity-40")} aria-hidden />
      </Link>
    </TableHead>
  );
}

function RowActions({ row, today, tagSuggestions }: { row: AttemptListRow; today: string; tagSuggestions: string[] }) {
  const label = `${row.code || SKILL_LABELS[row.skill]} on ${formatDateShort(row.date, today)}`;
  return (
    <div className="flex justify-end gap-0.5">
      <EditAttemptDialog
        id={row.id}
        label={label}
        values={attemptToValues(row)}
        maxDate={today}
        tagSuggestions={tagSuggestions}
      />
      <DeleteAttemptButton id={row.id} label={label} />
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-secondary-foreground">
          {t}
        </span>
      ))}
    </div>
  );
}

export function AttemptsTable({ rows, currentStudentId, today, tagSuggestions }: Props) {
  const { filters } = useAttemptFilters();
  const grouped = filters.sort === "date";
  const groups = grouped ? groupByDate(rows) : [{ date: "", rows }];

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader className="bg-surface">
            <TableRow className="hover:bg-transparent">
              <SortHeader k="date" className="w-28">Date</SortHeader>
              <SortHeader k="student">Student</SortHeader>
              <SortHeader k="skill">Skill</SortHeader>
              <SortHeader k="code">Code</SortHeader>
              <SortHeader k="score" className="text-right">Score</SortHeader>
              <SortHeader k="percent" className="text-right">%</SortHeader>
              <SortHeader k="band" className="text-right">Band</SortHeader>
              <TableHead>Tags</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-20">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <Fragment key={g.date || "all"}>
                {grouped && (
                  <TableRow className="bg-surface/60 hover:bg-surface/60">
                    <TableCell colSpan={10} className="py-1.5 text-xs font-semibold text-muted-foreground">
                      <h3>
                        {g.date === today ? "Today · " : ""}
                        {formatDateLong(g.date)}
                        <span className="ml-2 font-normal">({g.rows.length})</span>
                      </h3>
                    </TableCell>
                  </TableRow>
                )}
                {g.rows.map((r) => {
                  const mine = r.studentId === currentStudentId;
                  return (
                    <TableRow key={r.id} className="relative">
                      <TableCell className="relative text-muted-foreground tabular">
                        <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] rounded-r" style={{ backgroundColor: r.studentColor }} />
                        {formatDateShort(r.date, today)}
                      </TableCell>
                      <TableCell>
                        <StudentChip student={{ name: r.studentName, color: r.studentColor }} />
                      </TableCell>
                      <TableCell>
                        <SkillBadge skill={r.skill} />
                      </TableCell>
                      <TableCell className="font-medium">{r.code || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right tabular">{scoreText(r)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular">{percentText(r.percent)}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{r.band != null ? formatBand(r.band) : ""}</TableCell>
                      <TableCell className="max-w-48">
                        <Tags tags={r.mistakeTags} />
                      </TableCell>
                      <TableCell className="max-w-64">
                        <p className="line-clamp-2 text-sm text-muted-foreground" title={r.notes}>
                          {r.notes}
                        </p>
                      </TableCell>
                      <TableCell>{mine && <RowActions row={r} today={today} tagSuggestions={tagSuggestions} />}</TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-5 md:hidden">
        {groups.map((g) => (
          <section key={g.date || "all"} aria-label={g.date ? formatDateLong(g.date) : "Attempts"}>
            {grouped && (
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {g.date === today ? "Today · " : ""}
                {formatDateLong(g.date)}
              </h3>
            )}
            <ul className="divide-y overflow-hidden rounded-xl border">
              {g.rows.map((r) => {
                const mine = r.studentId === currentStudentId;
                return (
                  <li key={r.id} className="relative flex gap-3 py-3 pr-2 pl-4">
                    <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r" style={{ backgroundColor: r.studentColor }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.code || SKILL_LABELS[r.skill]}</span>
                        <SkillBadge skill={r.skill} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <StudentChip student={{ name: r.studentName, color: r.studentColor }} className="text-xs" />
                        {!grouped && <span>· {formatDateShort(r.date, today)}</span>}
                        {scoreText(r) && <span className="tabular">· {scoreText(r)}</span>}
                        {r.percent != null && <span className="tabular">· {percentText(r.percent)}</span>}
                      </div>
                      {r.mistakeTags.length > 0 && (
                        <div className="mt-2">
                          <Tags tags={r.mistakeTags} />
                        </div>
                      )}
                      {r.notes && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{r.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <span className="text-lg font-semibold tabular">{r.band != null ? formatBand(r.band) : ""}</span>
                      {mine && <RowActions row={r} today={today} tagSuggestions={tagSuggestions} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
