import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const AXIS = { stroke: "#e4e7ec", tick: { fill: "#556070", fontSize: 12 }, tickLine: false } as const;
export const GRID = { stroke: "#eef0f3", vertical: false } as const;
export const SURFACE = "#ffffff";

export function ChartCard({
  title,
  description,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  description?: string;
  legend?: { label: string; color: string; dashed?: boolean }[];
  table?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle className="text-[15px]">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-3">
        {legend && legend.length > 1 && <Legend items={legend} />}
        {children}
        {table && (
          <details className="group text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">View as table</summary>
            <div className="mt-2 overflow-x-auto">{table}</div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <span aria-hidden className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: i.color }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function MiniTable({ head, rows }: { head: string[]; rows: (string | number | null)[][] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          {head.map((h) => (
            <th key={h} scope="col" className="py-1 pr-3 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b last:border-0">
            {r.map((c, j) => (
              <td key={j} className="py-1 pr-3 tabular">
                {c ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tooltip body styled with text tokens; series identity via a swatch. */
export function TooltipBox({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="min-w-36 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-foreground">{title}</div>
      <ul className="grid gap-0.5">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              {i.color && <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: i.color }} />}
              {i.label}
            </span>
            <span className="font-medium text-foreground tabular">{i.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NoData({ children = "Not enough data in this period." }: { children?: React.ReactNode }) {
  return (
    <div className="grid h-48 place-items-center rounded-lg bg-surface text-center text-sm text-muted-foreground">
      <p className="max-w-60">{children}</p>
    </div>
  );
}
