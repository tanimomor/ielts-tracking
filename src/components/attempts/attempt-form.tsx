"use client";

import { Loader2, Save } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { SKILL_ICONS } from "@/components/skill-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buildCode } from "@/lib/code";
import { CAMBRIDGE_BOOKS, PARTS_BY_SKILL, SKILLS, SKILL_LABELS, defaultTotal, type Skill } from "@/lib/constants";
import type { AttemptFormValues } from "@/lib/attempt-values";
import { contiguous, partsToText } from "@/lib/parts";
import { computePercent, formatBand, resolveBand } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { FieldErrors } from "@/lib/validation";
import { createAttemptAction, updateAttemptAction } from "@/server/actions/attempts";
import { TagPicker } from "./tag-picker";

const BAND_CHOICES = Array.from({ length: 13 }, (_, i) => (3 + i * 0.5).toFixed(1));

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function toPayload(v: AttemptFormValues) {
  return {
    date: v.date,
    skill: v.skill,
    book: v.book || null,
    test: v.test || null,
    part: partsToText(v.parts),
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
  tagSuggestions: string[];
  onSaved?: () => void;
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

export function AttemptForm({ mode, attemptId, initial, maxDate, tagSuggestions, onSaved, className }: Props) {
  const [values, setValues] = useState<AttemptFormValues>(initial);
  const [totalTouched, setTotalTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const scoreRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof AttemptFormValues>(key: K, value: AttemptFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

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
    setValues((v) => ({
      ...v,
      parts,
      total: totalTouched ? v.total : (defaultTotal(v.skill, parts)?.toString() ?? v.total),
    }));
  }

  const rawScore = num(values.rawScore);
  const total = num(values.total);
  const band = resolveBand({ skill: values.skill, rawScore, total, band: num(values.band) });
  const percent = computePercent(rawScore, total);
  const code = buildCode(num(values.book), values.book ? num(values.test) : null, values.test ? partsToText(values.parts) : null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = toPayload(values);
      const res =
        mode === "edit" && attemptId ? await updateAttemptAction(attemptId, payload) : await createAttemptAction(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setErrors({});
      const label = [res.data.code || SKILL_LABELS[values.skill], res.data.band != null ? `band ${formatBand(res.data.band)}` : null]
        .filter(Boolean)
        .join(" · ");
      toast.success(mode === "edit" ? `Updated ${label}` : `Saved ${label}`);
      if (mode === "create") {
        // Stay open for the next entry: keep date/skill/book/test, move to the next part.
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
      onSaved?.();
    });
  }

  const err = (k: string) => errors[k];
  const describedBy = (k: string) => (errors[k] ? `${k}-error` : undefined);

  return (
    <form onSubmit={submit} noValidate className={cn("grid gap-6", className)}>
      <div className="grid gap-2">
        <span className="text-sm font-medium" id="skill-label">
          Skill
        </span>
        <ToggleGroup
          type="single"
          value={values.skill}
          onValueChange={(s) => s && changeSkill(s as Skill)}
          aria-labelledby="skill-label"
          className="grid grid-cols-3 sm:grid-cols-5"
        >
          {SKILLS.map((s) => {
            const Icon = SKILL_ICONS[s];
            return (
              <ToggleGroupItem key={s} value={s} className="h-11 sm:h-10">
                <Icon aria-hidden />
                {SKILL_LABELS[s]}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1.3fr_0.7fr]">
        <div className="col-span-2 grid gap-2 sm:col-span-1">
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
        <div className="grid gap-2">
          <Label htmlFor="book">Cambridge book</Label>
          <Select value={values.book || "none"} onValueChange={(b) => set("book", b === "none" ? "" : b)}>
            <SelectTrigger id="book" aria-invalid={!!err("book")} aria-describedby={describedBy("book")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none">No book</SelectItem>
              {[...CAMBRIDGE_BOOKS].reverse().map((b) => (
                <SelectItem key={b} value={String(b)}>
                  Cambridge {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id="book-error" message={err("book")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="test">Test no.</Label>
          <Input
            id="test"
            type="number"
            inputMode="numeric"
            min={1}
            max={4}
            placeholder="1–4"
            value={values.test}
            disabled={!values.book}
            onChange={(e) => set("test", e.target.value)}
            aria-invalid={!!err("test")}
            aria-describedby={describedBy("test")}
          />
          <FieldError id="test-error" message={err("test")} />
        </div>
      </div>

      {values.skill !== "other" && (
        <div className="grid gap-2">
          <span className="text-sm font-medium" id="part-label">
            {values.skill === "reading" ? "Passage" : values.skill === "writing" ? "Task" : "Part"}
            <span className="ml-2 font-normal text-muted-foreground">
              {values.parts.length ? "" : PARTS_BY_SKILL[values.skill][0].label.toLowerCase()}
            </span>
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
            <ToggleGroup
              type="multiple"
              value={values.parts}
              onValueChange={changeParts}
              aria-labelledby="part-label"
              className="w-auto"
            >
              {partOptions.map((p) => (
                <ToggleGroupItem key={p.value} value={p.value} aria-label={p.label}>
                  {p.label.replace(/^(Part|Passage|Task) /, (m) => `${m[0]}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {!values.test && values.parts.length > 0 && (
            <p className="text-xs text-muted-foreground">Add the test number to include the part in the code.</p>
          )}
        </div>
      )}

      {(scoredByQuestions || values.skill === "other") && (
        <div className="grid gap-2">
          <Label htmlFor="rawScore">Score {values.skill === "other" && <span className="font-normal text-muted-foreground">(optional)</span>}</Label>
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
              className="h-12 w-28 text-center text-xl font-semibold tabular placeholder:text-base placeholder:font-normal md:text-xl"
              aria-invalid={!!err("rawScore")}
              aria-describedby={describedBy("rawScore")}
            />
            <span className="text-2xl text-muted-foreground" aria-hidden>
              /
            </span>
            <div className="grid">
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
                className="h-12 w-24 text-center text-xl tabular placeholder:text-base md:text-xl"
                aria-invalid={!!err("total")}
                aria-describedby={describedBy("total")}
              />
            </div>
          </div>
          <FieldError id="rawScore-error" message={err("rawScore")} />
          <FieldError id="total-error" message={err("total")} />
        </div>
      )}

      {bandEntered && (
        <div className="grid gap-2">
          <span className="text-sm font-medium" id="band-label">
            Band
          </span>
          <ToggleGroup
            type="single"
            value={values.band}
            onValueChange={(b) => set("band", b)}
            aria-labelledby="band-label"
            className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-[repeat(13,minmax(0,1fr))]"
          >
            {BAND_CHOICES.map((b) => (
              <ToggleGroupItem key={b} value={b} className="h-10 px-0 tabular">
                {b}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldError id="band-error" message={err("band")} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
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
              aria-describedby={describedBy("timeTakenMin")}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              min
            </span>
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

      <div
        className={cn(
          "flex items-center gap-4",
          mode === "create" &&
            "sticky bottom-16 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0",
        )}
      >
        <BandPreview skill={values.skill} band={band} percent={percent} code={code} rawScore={rawScore} total={total} />
        <Button type="submit" size="lg" disabled={pending} className="ml-auto min-w-32">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {mode === "edit" ? "Save changes" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function BandPreview({
  skill,
  band,
  percent,
  code,
  rawScore,
  total,
}: {
  skill: Skill;
  band: number | null;
  percent: number | null;
  code: string;
  rawScore: number | null;
  total: number | null;
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

  return (
    <div className="flex min-w-0 items-center gap-3" aria-live="polite">
      <div
        className={cn(
          "grid h-12 min-w-14 place-items-center rounded-lg px-2 text-2xl font-semibold tabular",
          band != null ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {band != null ? formatBand(band) : percent != null ? `${Math.round(percent)}%` : "—"}
      </div>
      <div className="min-w-0 text-sm leading-tight">
        <div className="truncate font-medium">{code || SKILL_LABELS[skill]}</div>
        <div className="truncate text-muted-foreground">
          {hint}
          {band != null && percent != null ? ` · ${Math.round(percent)}%` : ""}
        </div>
      </div>
    </div>
  );
}
