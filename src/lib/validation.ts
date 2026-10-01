import { z } from "zod";
import { PART_RE } from "./code";
import { MAX_TEST, MAX_VOLUME } from "./books";
import { SKILLS } from "./constants";
import { isDateStr } from "./dates";
import { isValidBand } from "./scoring";

const optionalInt = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : typeof v === "string" ? Number(v) : v),
    z
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`)
      .nullable(),
  );

const bandField = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : typeof v === "string" ? Number(v) : v),
  z
    .number()
    .refine(isValidBand, "Band must be between 0 and 9 in steps of 0.5")
    .nullable(),
);

export const studentProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter a display name").max(60, "Keep it under 60 characters"),
  targetBand: z.coerce
    .number()
    .refine((b) => isValidBand(b) && b >= 4, "Pick a target between 4.0 and 9.0"),
  color: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, "Pick a colour"),
});
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;

export const tagSchema = z
  .string()
  .transform((t) => t.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1).max(40));

export const attemptInputSchema = z
  .object({
    date: z.string().refine(isDateStr, "Pick a valid date"),
    skill: z.enum(SKILLS),
    seriesId: optionalInt(1, 1_000_000, "Book"),
    book: optionalInt(1, MAX_VOLUME, "Volume"),
    test: optionalInt(1, MAX_TEST, "Test"),
    part: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() || null : v ?? null),
      z.string().regex(PART_RE, "Part must look like 2 or 1-3").nullable(),
    ),
    rawScore: optionalInt(0, 200, "Correct answers"),
    total: optionalInt(1, 200, "Out of"),
    band: bandField,
    timeTakenMin: optionalInt(0, 600, "Time taken"),
    mistakeTags: z.array(tagSchema).max(15, "Up to 15 tags").default([]),
    notes: z.string().trim().max(2000, "Notes are limited to 2000 characters").default(""),
  })
  .superRefine((v, ctx) => {
    if (v.rawScore != null && v.total == null) {
      ctx.addIssue({ code: "custom", path: ["total"], message: "Enter what the score is out of" });
    }
    if (v.rawScore != null && v.total != null && v.rawScore > v.total) {
      ctx.addIssue({ code: "custom", path: ["rawScore"], message: "Can't be more than the total" });
    }
    if ((v.test != null || v.book != null) && v.seriesId == null) {
      ctx.addIssue({ code: "custom", path: ["seriesId"], message: "Pick the book for this test" });
    }
    if ((v.skill === "listening" || v.skill === "reading") && v.rawScore == null) {
      ctx.addIssue({ code: "custom", path: ["rawScore"], message: "Enter how many you got right" });
    }
    if ((v.skill === "writing" || v.skill === "speaking") && v.band == null) {
      ctx.addIssue({ code: "custom", path: ["band"], message: "Pick a band" });
    }
  });
export type AttemptInput = z.infer<typeof attemptInputSchema>;

export const seriesInputSchema = z.object({
  name: z.string().trim().min(2, "Enter the book's name").max(40, "Keep it under 40 characters"),
  prefix: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{1,6}$/, "1–6 letters, used in codes like mk2t5"),
  volumes: optionalInt(1, MAX_VOLUME, "Volumes"),
  testsPerBook: z.coerce.number().int().min(1, "At least 1 test").max(MAX_TEST, `At most ${MAX_TEST} tests`),
});
export type SeriesInput = z.infer<typeof seriesInputSchema>;

export const seriesUpdateSchema = seriesInputSchema.pick({ name: true, volumes: true, testsPerBook: true });

export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };
