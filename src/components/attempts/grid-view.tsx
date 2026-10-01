import { SKILL_SHORT } from "@/lib/constants";
import { SKILL_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import type { GridModel } from "@/lib/grid";

/** Mirrors the original Google Sheet: rows = dates, column groups = students × skills. */
export function GridView({ grid, today }: { grid: GridModel; today: string }) {
  const groups: { student: GridModel["columns"][number]["student"]; span: number }[] = [];
  for (const c of grid.columns) {
    const last = groups[groups.length - 1];
    if (last?.student.id === c.student.id) last.span++;
    else groups.push({ student: c.student, span: 1 });
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface">
          <tr>
            <th rowSpan={2} scope="col" className="sticky left-0 z-10 border-r border-b bg-surface px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
              Date
            </th>
            {groups.map((g) => (
              <th
                key={g.student.id}
                colSpan={g.span}
                scope="colgroup"
                className="border-b border-l px-3 py-2 text-left text-sm font-semibold"
                style={{ boxShadow: `inset 0 -2px 0 ${g.student.color}` }}
              >
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: g.student.color }} />
                  {g.student.name}
                </span>
              </th>
            ))}
          </tr>
          <tr>
            {grid.columns.map((c, i) => (
              <th
                key={`${c.student.id}-${c.skill}`}
                scope="col"
                className={`border-b px-3 py-1.5 text-left text-xs font-medium text-muted-foreground ${i === 0 || grid.columns[i - 1].student.id !== c.student.id ? "border-l" : ""}`}
              >
                <abbr title={SKILL_LABELS[c.skill]} className="no-underline">
                  {SKILL_SHORT[c.skill]}
                </abbr>
                <span className="sr-only"> ({c.student.name})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.date} className="border-b last:border-0 hover:bg-surface/50">
              <th scope="row" className="sticky left-0 z-10 border-r bg-background px-3 py-2 text-left font-medium whitespace-nowrap tabular">
                {row.date === today ? "Today" : formatDateShort(row.date, today)}
              </th>
              {row.cells.map((cell, i) => (
                <td
                  key={i}
                  className={`px-3 py-2 align-top whitespace-nowrap ${i === 0 || grid.columns[i - 1].student.id !== grid.columns[i].student.id ? "border-l" : ""}`}
                >
                  {cell.map((label, j) => (
                    <div key={j} className="tabular">
                      {label}
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
