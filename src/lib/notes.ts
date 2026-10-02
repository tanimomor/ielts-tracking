import { z } from "zod";

export const NOTE_COLOR_KEYS = ["default", "yellow", "green", "blue", "pink", "purple", "orange", "teal"] as const;
export type NoteColor = (typeof NOTE_COLOR_KEYS)[number];

/** Keep-style pastel note colours (light + dark). Static class names for Tailwind. */
export const NOTE_COLORS: Record<NoteColor, { label: string; card: string; swatch: string }> = {
  default: { label: "Default", card: "bg-card border-border", swatch: "bg-background" },
  yellow: { label: "Yellow", card: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/40 dark:border-yellow-900/60", swatch: "bg-yellow-200" },
  green: { label: "Green", card: "bg-lime-50 border-lime-200 dark:bg-lime-950/40 dark:border-lime-900/60", swatch: "bg-lime-200" },
  blue: { label: "Blue", card: "bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900/60", swatch: "bg-sky-200" },
  pink: { label: "Pink", card: "bg-pink-50 border-pink-200 dark:bg-pink-950/40 dark:border-pink-900/60", swatch: "bg-pink-200" },
  purple: { label: "Purple", card: "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900/60", swatch: "bg-violet-200" },
  orange: { label: "Orange", card: "bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900/60", swatch: "bg-orange-200" },
  teal: { label: "Teal", card: "bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900/60", swatch: "bg-teal-200" },
};

export const noteInputSchema = z
  .object({
    title: z.string().trim().max(200, "Title is limited to 200 characters").default(""),
    body: z.string().max(20000, "Note is too long").default(""),
    color: z.enum(NOTE_COLOR_KEYS).default("default"),
    pinned: z.boolean().default(false),
    shared: z.boolean().default(false),
  })
  .refine((n) => n.title.length > 0 || n.body.trim().length > 0, { message: "Write something first", path: ["body"] });

export type NoteInput = z.infer<typeof noteInputSchema>;
export const notePatchSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(20000).optional(),
  color: z.enum(NOTE_COLOR_KEYS).optional(),
  pinned: z.boolean().optional(),
  shared: z.boolean().optional(),
});
