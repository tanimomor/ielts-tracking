"use client";

import Link from "next/link";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { SkillBadge } from "@/components/skill-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAX_IMPORT_ROWS, guessStudent, missingColumns, parseSheet, type DateOrder, type ImportRow } from "@/lib/csv-import";
import { formatDateShort } from "@/lib/dates";
import { scoreText } from "@/lib/format";
import { formatBand } from "@/lib/scoring";
import { cn, pluralize } from "@/lib/utils";
import { checkImportAction, importAttemptsAction, type ImportCandidate } from "@/server/actions/import";

type Student = { id: string; name: string; email: string; color: string };
type Status = "ready" | "duplicate" | "error" | "other" | "skipped";

const SKIP = "__skip__";
const PREVIEW_LIMIT = 200;

function toCandidate(r: ImportRow): ImportCandidate {
  return {
    line: r.line,
    date: r.date!,
    skill: r.skill,
    book: r.book,
    test: r.test,
    part: r.part,
    rawScore: r.rawScore,
    total: r.total,
    band: r.band,
    notes: r.notes,
  };
}

export function ImportWizard({ me, students, today }: { me: Student; students: Student[]; today: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, string>[] | null>(null);
  const [dateOrder, setDateOrder] = useState<DateOrder | "auto">("auto");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [checking, startCheck] = useTransition();
  const [importing, startImport] = useTransition();
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (records ? parseSheet(records, { dateOrder, today }) : null), [records, dateOrder, today]);
  const persons = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of parsed?.rows ?? []) if (r.person) counts.set(r.person, (counts.get(r.person) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [parsed]);

  const mine = useMemo(
    () => (parsed?.rows ?? []).filter((r) => r.errors.length === 0 && mapping[r.person] === me.id),
    [parsed, mapping, me.id],
  );

  // Ask the server which of my rows already exist whenever the selection changes.
  useEffect(() => {
    if (!mine.length) return;
    const handle = setTimeout(() => {
      startCheck(async () => {
        const res = await checkImportAction(mine.map(toCandidate));
        if (res.ok) setDuplicates(new Set(res.data.duplicates));
        else toast.error(res.error);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [mine]);

  function load(file: File) {
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        const missing = missingColumns(res.meta.fields ?? []);
        if (missing.length) {
          toast.error(`This doesn't look like the Log tab — missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
          return;
        }
        if (res.data.length > MAX_IMPORT_ROWS) toast.warning(`Only the first ${MAX_IMPORT_ROWS} rows will be imported.`);
        setFileName(file.name);
        setRecords(res.data);
        const next: Record<string, string> = {};
        for (const rec of res.data) {
          const p = (rec.Person ?? rec.person ?? "").trim();
          if (p && !(p in next)) next[p] = guessStudent(p, students)?.id ?? SKIP;
        }
        setMapping(next);
      },
      error: (err) => toast.error(`Couldn't read the file: ${err.message}`),
    });
  }

  function reset() {
    setRecords(null);
    setFileName(null);
    setMapping({});
    setResult(null);
    if (input.current) input.current.value = "";
  }

  const statusOf = (r: ImportRow): Status => {
    if (r.errors.length) return "error";
    const target = mapping[r.person];
    if (!target || target === SKIP) return "skipped";
    if (target !== me.id) return "other";
    return duplicates.has(r.line) ? "duplicate" : "ready";
  };
  const counts = (parsed?.rows ?? []).reduce(
    (acc, r) => ({ ...acc, [statusOf(r)]: (acc[statusOf(r)] ?? 0) + 1 }),
    {} as Partial<Record<Status, number>>,
  );
  const ready = counts.ready ?? 0;

  function runImport() {
    startImport(async () => {
      const res = await importAttemptsAction(mine.map(toCandidate));
      if (res.ok) {
        setResult(res.data);
        toast.success(`Imported ${pluralize(res.data.inserted, "attempt")}`);
        setDuplicates(new Set(mine.map((r) => r.line)));
      } else toast.error(res.error);
    });
  }

  if (!parsed) {
    return (
      <Card
        className={cn("items-center gap-4 border-dashed px-6 py-14 text-center transition-colors", drag && "border-primary bg-primary-soft/40")}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) load(f);
        }}
      >
        <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <FileSpreadsheet className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold">Upload the “Log” tab as CSV</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            In Google Sheets: File → Download → Comma-separated values, with the Log tab selected. Expected columns: Timestamp, Date,
            Person, Skill, Book, Test, Part, Code, Raw, Total, Percent, Band, Notes.
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          id="csv"
          onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
        />
        <Button asChild size="lg">
          <label htmlFor="csv" className="cursor-pointer">
            <Upload aria-hidden /> Choose CSV file
          </label>
        </Button>
        <p className="text-xs text-muted-foreground">Or drop it here. Nothing is saved until you press Import.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="flex-row flex-wrap items-center gap-3 px-5 py-4">
        <FileSpreadsheet className="size-5 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{fileName}</div>
          <div className="text-xs text-muted-foreground">{pluralize(parsed.rows.length, "row")}</div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="date-order" className="text-xs text-muted-foreground">
            Dates are
          </Label>
          <Select value={dateOrder} onValueChange={(v) => setDateOrder(v as DateOrder | "auto")}>
            <SelectTrigger id="date-order" size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({parsed.dateOrder === "dmy" ? "DD/MM" : "MM/DD"})</SelectItem>
              <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
              <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <X aria-hidden /> Choose another file
        </Button>
        {parsed.ambiguousDates && dateOrder === "auto" && (
          <p className="flex w-full items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Every date could be read either way. Check a few rows below and set the date format if they look wrong.
          </p>
        )}
      </Card>

      <section aria-labelledby="map-heading" className="grid gap-3">
        <div>
          <h2 id="map-heading" className="font-semibold">
            1. Who is who?
          </h2>
          <p className="text-sm text-muted-foreground">
            Match each name in the Person column to a student. You can only import your own rows — others can upload the same file
            after signing in, and duplicates are skipped automatically.
          </p>
        </div>
        <Card className="gap-0 divide-y py-0">
          {persons.map(([person, n]) => (
            <div key={person} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{person}</div>
                <div className="text-xs text-muted-foreground">{pluralize(n, "row")}</div>
              </div>
              <Select value={mapping[person] ?? SKIP} onValueChange={(v) => setMapping((m) => ({ ...m, [person]: v }))}>
                <SelectTrigger className="w-56" aria-label={`Student for ${person}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                      {s.id === me.id ? " (you)" : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value={SKIP}>Don&apos;t import</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </Card>
      </section>

      <section aria-labelledby="preview-heading" className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="preview-heading" className="font-semibold">
              2. Preview
            </h2>
            <ul className="mt-1 flex flex-wrap gap-2 text-xs" aria-live="polite">
              <StatusPill status="ready" n={ready} />
              <StatusPill status="duplicate" n={counts.duplicate ?? 0} />
              <StatusPill status="error" n={counts.error ?? 0} />
              <StatusPill status="other" n={counts.other ?? 0} />
              <StatusPill status="skipped" n={counts.skipped ?? 0} />
              {checking && (
                <li className="inline-flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> checking duplicates…
                </li>
              )}
            </ul>
          </div>
          <Button size="lg" disabled={!ready || checking || importing} onClick={runImport}>
            {importing ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
            Import {ready ? pluralize(ready, "attempt") : ""}
          </Button>
        </div>

        {result && (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
            <CheckCircle2 className="size-5 text-success" aria-hidden />
            Imported {pluralize(result.inserted, "attempt")}
            {result.skipped > 0 && `, skipped ${pluralize(result.skipped, "duplicate")}`}.
            <Link href="/attempts" className="font-medium text-primary hover:underline">
              View attempts
            </Link>
            <span className="text-muted-foreground">Then press Sync &amp; refresh on the dashboard.</span>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Line</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                <th scope="col" className="px-3 py-2 font-medium">Person</th>
                <th scope="col" className="px-3 py-2 font-medium">Date</th>
                <th scope="col" className="px-3 py-2 font-medium">Skill</th>
                <th scope="col" className="px-3 py-2 font-medium">Code</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Score</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Band</th>
                <th scope="col" className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(0, PREVIEW_LIMIT).map((r) => {
                const st = statusOf(r);
                return (
                  <tr key={r.line} className={cn("border-t", st !== "ready" && "text-muted-foreground")}>
                    <td className="px-3 py-1.5 tabular">{r.line}</td>
                    <td className="px-3 py-1.5">
                      <StatusLabel status={st} />
                      {r.errors.length > 0 && <div className="text-xs text-destructive">{r.errors.join("; ")}</div>}
                    </td>
                    <td className="px-3 py-1.5">{r.person}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular">{r.date ? formatDateShort(r.date, today) : "—"}</td>
                    <td className="px-3 py-1.5">
                      <SkillBadge skill={r.skill} />
                    </td>
                    <td className="px-3 py-1.5 font-medium">{r.code || "—"}</td>
                    <td className="px-3 py-1.5 text-right tabular">{scoreText(r)}</td>
                    <td className="px-3 py-1.5 text-right tabular">{r.band != null ? formatBand(r.band) : ""}</td>
                    <td className="max-w-56 truncate px-3 py-1.5" title={r.notes}>
                      {r.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {parsed.rows.length > PREVIEW_LIMIT && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              Showing the first {PREVIEW_LIMIT} of {parsed.rows.length} rows. All of them are checked and imported.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

const STATUS: Record<Status, { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-success/10 text-success" },
  duplicate: { label: "Duplicate", className: "bg-muted text-secondary-foreground" },
  error: { label: "Error", className: "bg-destructive/10 text-destructive" },
  other: { label: "Another student", className: "bg-muted text-secondary-foreground" },
  skipped: { label: "Not imported", className: "bg-muted text-secondary-foreground" },
};

function StatusLabel({ status }: { status: Status }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS[status].className)}>{STATUS[status].label}</span>;
}

function StatusPill({ status, n }: { status: Status; n: number }) {
  if (!n && status !== "ready") return null;
  return (
    <li className={cn("rounded-full px-2 py-0.5 font-medium", STATUS[status].className)}>
      {n} {STATUS[status].label.toLowerCase()}
    </li>
  );
}
