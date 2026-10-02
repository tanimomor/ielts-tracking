"use client";

import { BookOpenText, CalendarDays, ChevronDown, ClipboardList, Loader2, Pencil, Plus, Save, Target } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { SKILL_ICONS, SKILL_SOLID } from "@/components/skill-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AttemptFormValues } from "@/lib/attempt-values";
import { bookLabel, type SeriesInfo } from "@/lib/books";
import { buildCode } from "@/lib/code";
import { PARTS_BY_SKILL, SKILLS, SKILL_LABELS, defaultTotal, type Skill } from "@/lib/constants";
import { contiguous, partsToText } from "@/lib/parts";
import { computePercent, formatBand, resolveBand } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { FieldErrors } from "@/lib/validation";
import { createAttemptAction, updateAttemptAction } from "@/server/actions/attempts";
import { BookDialog } from "./book-dialog";
import { TagPicker } from "./tag-picker";

const BAND_CHOICES = Array.from({ length: 13 }, (_, i) => (3 + i * 0.5).toFixed(1));
const ADD_BOOK = "__add__";
const NO_BOOK = "none";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function toPayload(v: AttemptFormValues) {
  return {
    date: v.date,
    skill: v.skill,
    seriesId: v.seriesId || null,
    book: v.seriesId ? v.book || null : null,
    test: v.seriesId ? v.test || null : null,
    part: v.test ? partsToText(v.parts) : null,
    rawScore: v.rawScore,
    total: v.total,
    band: v.band,
    timeTakenMin: v.timeTakenMin,
    mistakeTags: v.mistakeTags,
    notes: v.notes,
  };
}

type Props = {
  mode: "create" | "edit";
  attemptId?: string;
  initial: AttemptFormValues;
  maxDate: string;
  series: SeriesInfo[];
  tagSuggestions: string[];
  /** keepOpen = "Save & add another" */
  onSaved?: (opts: { keepOpen: boolean }) => void;
  onCancel?: () => void;
  className?: string;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

/** A numbered form section with a coloured icon chip. */
function Section({
  step,
  title,
  icon: Icon,
  tone,
  aside,
  children,
}: {
  step: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-4 rounded-2xl border bg-background p-4 shadow-xs sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3" aria-hidden>
        <span className="grid size-8 place-items-center rounded-xl text-white shadow-sm" style={{ background: tone }}>
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Step {step}</span>
        <span className="text-[15px] font-semibold">{title}</span>
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      {children}
    </fieldset>
  );
}

export function AttemptForm({ mode, attemptId, initial, maxDate, series: initialSeries, tagSuggestions, onSaved, onCancel, className }: Props) {
  const [values, setValues] = useState<AttemptFormValues>(initial);
  const [series, setSeries] = useState(initialSeries);
  const [totalTouched, setTotalTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const [bookDialog, setBookDialog] = useState<{ open: boolean; editing: SeriesInfo | null }>({ open: false, editing: null });
  const [detailsOpen, setDetailsOpen] = useState(
    mode === "edit" && (!!initial.timeTakenMin || initial.mistakeTags.length > 0 || !!initial.notes),
  );
  const keepOpenRef = useRef(false);
  const scoreRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof AttemptFormValues>(key: K, value: AttemptFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const selected = useMemo(() => series.find((s) => String(s.id) === values.seriesId) ?? null, [series, values.seriesId]);
  const scoredByQuestions = values.skill === "listening" || values.skill === "reading";
  const bandEntered = values.skill === "writing" || values.skill === "speaking";
  const partOptions = PARTS_BY_SKILL[values.skill].filter((p) => p.value !== "");

  function changeSkill(skill: Skill) {
    setValues((v) => {
      const parts = v.parts.filter((p) => PARTS_BY_SKILL[skill].some((o) => o.value === p));
      const total = totalTouched ? v.total : (defaultTotal(skill, parts)?.toString() ?? "");
      return { ...v, skill, parts, total, band: "" };
    });
  }

  function changeParts(next: string[]) {
    const parts = contiguous(next);
    setValues((v) => ({ ...v, parts, total: totalTouched ? v.total : (defaultTotal(v.skill, parts)?.toString() ?? v.total) }));
  }

  function changeSeries(id: string) {
    // Radix's hidden native <select> can echo "" when an option was only just added; never a real choice here.
    if (!id) return;
    if (id === ADD_BOOK) {
      setBookDialog({ open: true, editing: null });
      return;
    }
    const s = series.find((x) => String(x.id) === id);
    setValues((v) => ({
      ...v,
      seriesId: id === NO_BOOK ? "" : id,
      book: s?.volumes != null && v.book && Number(v.book) <= s.volumes ? v.book : "",
      test: s && v.test && Number(v.test) <= s.testsPerBook ? v.test : "",
    }));
  }

  const rawScore = num(values.rawScore);
  const total = num(values.total);
  const band = resolveBand({ skill: values.skill, rawScore, total, band: num(values.band) });
  const percent = computePercent(rawScore, total);
  const volume = selected?.volumes != null ? num(values.book) : null;
  const test = selected ? num(values.test) : null;
  const part = test != null ? partsToText(values.parts) : null;
  const code = buildCode(selected?.prefix, volume, test, part);
  const label = bookLabel(selected, volume, test, part);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const keepOpen = keepOpenRef.current;
    keepOpenRef.current = false;
    startTransition(async () => {
      const payload = toPayload(values);
      const res = mode === "edit" && attemptId ? await updateAttemptAction(attemptId, payload) : await createAttemptAction(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setErrors({});
      const msg = [res.data.code || SKILL_LABELS[values.skill], res.data.band != null ? `band ${formatBand(res.data.band)}` : null]
        .filter(Boolean)
        .join(" · ");
      toast.success(mode === "edit" ? `Updated ${msg}` : `Saved ${msg}`);
      if (mode === "create" && keepOpen) {
        // Ready for the next entry: keep date/skill/book/test, move on to the next part.
        setValues((v) => {
          const last = v.parts.length === 1 ? Number(v.parts[0]) : null;
          const nextPart = last != null && partOptions.some((p) => p.value === String(last + 1)) ? [String(last + 1)] : v.parts;
          return {
            ...v,
            parts: nextPart,
            total: totalTouched ? v.total : (defaultTotal(v.skill, nextPart)?.toString() ?? v.total),
            rawScore: "",
            band: "",
            timeTakenMin: "",
            mistakeTags: [],
            notes: "",
          };
        });
        requestAnimationFrame(() => scoreRef.current?.focus());
      }
      onSaved?.({ keepOpen });
    });
  }

  const err = (k: string) => errors[k];
  const describedBy = (k: string) => (errors[k] ? `${k}-error` : undefined);
  const skillColor = SKILL_SOLID[values.skill];

  return (
    <form onSubmit={submit} noValidate className={cn("grid gap-4", className)}>
      {/* 1 — what & when */}
      <Section step={1} title="Practice" icon={CalendarDays} tone="#7c3aed">
        <ToggleGroup
          type="single"
          value={values.skill}
          onValueChange={(s) => s && changeSkill(s as Skill)}
          aria-label="Skill"
          className="grid grid-cols-3 gap-2 sm:grid-cols-5"
        >
          {SKILLS.map((s) => {
            const Icon = SKILL_ICONS[s];
            const on = values.skill === s;
            return (
              <ToggleGroupItem
                key={s}
                value={s}
                className="h-12 flex-col gap-0.5 text-xs data-[state=on]:border-2 data-[state=on]:font-semibold data-[state=on]:text-foreground sm:h-14"
                style={on ? { borderColor: SKILL_SOLID[s], backgroundColor: `color-mix(in oklab, ${SKILL_SOLID[s]} 10%, var(--background))` } : undefined}
              >
                <Icon className="size-[18px]" style={{ color: SKILL_SOLID[s] }} aria-hidden />
                {SKILL_LABELS[s]}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
        <div className="grid gap-2 sm:max-w-56">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={values.date}
            max={maxDate}
            onChange={(e) => set("date", e.target.value)}
            aria-invalid={!!err("date")}
            aria-describedby={describedBy("date")}
            required
          />
          <FieldError id="date-error" message={err("date")} />
        </div>
      </Section>

      {/* 2 — material */}
      <Section
        step={2}
        title="Book & test"
        icon={BookOpenText}
        tone="#2563eb"
        aside={code ? <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{code}</span> : null}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div className="col-span-2 grid gap-2 sm:col-span-1">
            <Label htmlFor="seriesId">Book</Label>
            <div className="flex gap-1.5">
              <Select value={values.seriesId || NO_BOOK} onValueChange={changeSeries}>
                <SelectTrigger id="seriesId" aria-invalid={!!err("seriesId")} aria-describedby={describedBy("seriesId")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NO_BOOK}>No book</SelectItem>
                  {series.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={ADD_BOOK}>
                    <Plus aria-hidden /> Add a new book…
                  </SelectItem>
                </SelectContent>
              </Select>
              {selected && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Edit ${selected.name}`}
                  onClick={() => setBookDialog({ open: true, editing: selected })}
                >
                  <Pencil />
                </Button>
              )}
            </div>
            <FieldError id="seriesId-error" message={err("seriesId")} />
          </div>
          {selected?.volumes != null && (
            <div className="grid gap-2">
              <Label htmlFor="book">Volume</Label>
              <Select value={values.book || "none"} onValueChange={(b) => b && set("book", b === "none" ? "" : b)}>
                <SelectTrigger id="book" aria-invalid={!!err("book")} aria-describedby={describedBy("book")}>
                  <SelectValue placeholder="Pick" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">—</SelectItem>
                  {Array.from({ length: selected.volumes }, (_, i) => selected.volumes! - i).map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {selected.name} {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="book-error" message={err("book")} />
            </div>
          )}
          {selected && (
            <div className="grid gap-2">
              <Label htmlFor="test">Test no.</Label>
              {selected.testsPerBook <= 6 ? (
                <ToggleGroup
                  type="single"
                  value={values.test}
                  onValueChange={(t) => set("test", t)}
                  aria-label="Test number"
                  className="flex flex-nowrap gap-1"
                >
                  {Array.from({ length: selected.testsPerBook }, (_, i) => String(i + 1)).map((t) => (
                    <ToggleGroupItem key={t} value={t} className="h-9 min-w-9 flex-1 px-0 tabular" id={t === "1" ? "test" : undefined}>
                      {t}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              ) : (
                <Input
                  id="test"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={selected.testsPerBook}
                  placeholder={`1–${selected.testsPerBook}`}
                  value={values.test}
                  onChange={(e) => set("test", e.target.value)}
                  aria-invalid={!!err("test")}
                  aria-describedby={describedBy("test")}
                />
              )}
              <FieldError id="test-error" message={err("test")} />
            </div>
          )}
        </div>

        {values.skill !== "other" && (
          <div className="grid gap-2">
            <span className="text-sm font-medium" id="part-label">
              {values.skill === "reading" ? "Passage" : values.skill === "writing" ? "Task" : "Part"}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <ToggleGroup
                type="single"
                value={values.parts.length ? "" : "full"}
                onValueChange={(v) => v === "full" && changeParts([])}
                className="w-auto"
                aria-label="Full test"
              >
                <ToggleGroupItem value="full">{PARTS_BY_SKILL[values.skill][0].label}</ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup type="multiple" value={values.parts} onValueChange={changeParts} aria-labelledby="part-label" className="w-auto">
                {partOptions.map((p) => (
                  <ToggleGroupItem key={p.value} value={p.value} aria-label={p.label}>
                    {p.label.replace(/^(Part|Passage|Task) /, (m) => `${m[0]}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {selected && !values.test && values.parts.length > 0 && (
              <p className="text-xs text-muted-foreground">Pick the test number to include the part in the code.</p>
            )}
          </div>
        )}
        {label && <p className="-mt-1 text-xs text-muted-foreground">{label}</p>}
      </Section>

      {/* 3 — result */}
      <Section step={3} title="Result" icon={Target} tone="#ea580c">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid flex-1 gap-2">
            {(scoredByQuestions || values.skill === "other") && (
              <>
                <Label htmlFor="rawScore">
                  Score {values.skill === "other" && <span className="font-normal text-muted-foreground">(optional)</span>}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    ref={scoreRef}
                    id="rawScore"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Correct"
                    value={values.rawScore}
                    onChange={(e) => set("rawScore", e.target.value)}
                    className="h-14 w-28 text-center text-2xl font-semibold tabular placeholder:text-base placeholder:font-normal md:text-2xl"
                    aria-invalid={!!err("rawScore")}
                    aria-describedby={describedBy("rawScore")}
                  />
                  <span className="text-2xl text-muted-foreground" aria-hidden>
                    /
                  </span>
                  <Label htmlFor="total" className="sr-only">
                    Out of
                  </Label>
                  <Input
                    id="total"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Out of"
                    value={values.total}
                    onChange={(e) => {
                      setTotalTouched(true);
                      set("total", e.target.value);
                    }}
                    className="h-14 w-24 text-center text-2xl tabular placeholder:text-base md:text-2xl"
                    aria-invalid={!!err("total")}
                    aria-describedby={describedBy("total")}
                  />
                </div>
                <FieldError id="rawScore-error" message={err("rawScore")} />
                <FieldError id="total-error" message={err("total")} />
              </>
            )}
            {bandEntered && (
              <>
                <span className="text-sm font-medium" id="band-label">
                  Band
                </span>
                <ToggleGroup
                  type="single"
                  value={values.band}
                  onValueChange={(b) => set("band", b)}
                  aria-labelledby="band-label"
                  className="grid grid-cols-5 gap-1.5 sm:grid-cols-7"
                >
                  {BAND_CHOICES.map((b) => (
                    <ToggleGroupItem key={b} value={b} className="h-10 px-0 tabular">
                      {b}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <FieldError id="band-error" message={err("band")} />
              </>
            )}
          </div>
          <BandPreview skill={values.skill} band={band} percent={percent} rawScore={rawScore} total={total} color={skillColor} />
        </div>
      </Section>

      {/* 4 — optional details */}
      <div className="rounded-2xl border bg-background shadow-xs">
        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-controls="details-panel"
          onClick={() => setDetailsOpen((o) => !o)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-4 text-left focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none sm:px-5"
        >
          <span className="grid size-8 place-items-center rounded-xl text-white shadow-sm" style={{ background: "#059669" }}>
            <ClipboardList className="size-4" aria-hidden />
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Step 4</span>
          <span className="text-[15px] font-semibold">Details</span>
          <span className="text-sm text-muted-foreground">
            optional
            {values.mistakeTags.length > 0 && ` · ${values.mistakeTags.length} tag${values.mistakeTags.length > 1 ? "s" : ""}`}
            {values.notes && " · note"}
          </span>
          <ChevronDown className={cn("ml-auto size-4 text-muted-foreground transition-transform", detailsOpen && "rotate-180")} aria-hidden />
        </button>
        {detailsOpen && (
          <div id="details-panel" className="grid gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
              <div className="grid content-start gap-2">
                <Label htmlFor="timeTakenMin">Time taken</Label>
                <div className="relative">
                  <Input
                    id="timeTakenMin"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={600}
                    value={values.timeTakenMin}
                    onChange={(e) => set("timeTakenMin", e.target.value)}
                    className="pr-12"
                    aria-invalid={!!err("timeTakenMin")}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">min</span>
                </div>
                <FieldError id="timeTakenMin-error" message={err("timeTakenMin")} />
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="tags">Mistake tags</Label>
                <TagPicker id="tags" value={values.mistakeTags} onChange={(t) => set("mistakeTags", t)} suggestions={tagSuggestions} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="What went well, what to fix next time…"
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
                aria-invalid={!!err("notes")}
              />
              <FieldError id="notes-error" message={err("notes")} />
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-2 bg-surface/95 px-1 pt-2 pb-1 backdrop-blur">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending} className="mr-auto hidden sm:inline-flex">
            Cancel
          </Button>
        )}
        {mode === "create" && (
          <Button type="submit" variant="outline" disabled={pending} onClick={() => (keepOpenRef.current = true)} className="flex-1 sm:flex-none">
            <Plus aria-hidden /> <span className="sm:hidden">Save + next</span>
            <span className="hidden sm:inline">Save &amp; add another</span>
          </Button>
        )}
        <Button type="submit" disabled={pending} className="min-w-28 flex-1 sm:flex-none">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {mode === "edit" ? "Save changes" : "Save"}
        </Button>
      </div>

      <BookDialog
        open={bookDialog.open}
        onOpenChange={(open) => setBookDialog((d) => ({ ...d, open }))}
        existing={series}
        editing={bookDialog.editing}
        onSaved={(s) => {
          setSeries((list) => (list.some((x) => x.id === s.id) ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s]));
          setValues((v) => ({ ...v, seriesId: String(s.id) }));
          setBookDialog({ open: false, editing: null });
        }}
      />
    </form>
  );
}

function BandPreview({
  skill,
  band,
  percent,
  rawScore,
  total,
  color,
}: {
  skill: Skill;
  band: number | null;
  percent: number | null;
  rawScore: number | null;
  total: number | null;
  color: string;
}) {
  const hint =
    skill === "listening" || skill === "reading"
      ? total === 40
        ? rawScore == null
          ? "Enter your score"
          : band == null
            ? "Below band 2.5"
            : `${SKILL_LABELS[skill]} band`
        : "Band only for full tests (/40)"
      : skill === "other"
        ? "No band for other practice"
        : band == null
          ? "Pick a band"
          : `${SKILL_LABELS[skill]} band`;
  const value = band != null ? formatBand(band) : percent != null ? `${Math.round(percent)}%` : "—";
  const lit = band != null || percent != null;

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 sm:min-w-44 sm:flex-col sm:items-start sm:gap-1",
        lit ? "border text-foreground" : "bg-muted text-muted-foreground",
      )}
      style={lit ? { borderColor: color, backgroundColor: `color-mix(in oklab, ${color} 10%, var(--background))` } : undefined}
    >
      <span className="text-4xl leading-none font-bold tracking-tight tabular" style={lit ? { color } : undefined}>
        {value}
      </span>
      <span className={cn("text-xs font-medium", lit && "text-muted-foreground")}>
        {hint}
        {band != null && percent != null ? ` · ${Math.round(percent)}%` : ""}
      </span>
    </div>
  );
}
