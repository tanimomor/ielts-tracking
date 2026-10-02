/**
 * Pastel tile tones: single light tinted surfaces (no gradients) with dark text, a coloured icon
 * chip carrying the accent. Static class names so Tailwind picks them up.
 */
export const TONES = {
  violet: {
    tile: "border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/40",
    chip: "bg-violet-600",
    text: "text-violet-700 dark:text-violet-300",
  },
  amber: {
    tile: "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40",
    chip: "bg-amber-600",
    text: "text-amber-800 dark:text-amber-300",
  },
  sky: {
    tile: "border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/40",
    chip: "bg-sky-600",
    text: "text-sky-800 dark:text-sky-300",
  },
  pink: {
    tile: "border-pink-200 bg-pink-50 dark:border-pink-900/60 dark:bg-pink-950/40",
    chip: "bg-pink-600",
    text: "text-pink-700 dark:text-pink-300",
  },
  orange: {
    tile: "border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/40",
    chip: "bg-orange-600",
    text: "text-orange-700 dark:text-orange-300",
  },
  emerald: {
    tile: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40",
    chip: "bg-emerald-600",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  blue: {
    tile: "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40",
    chip: "bg-blue-600",
    text: "text-blue-700 dark:text-blue-300",
  },
  yellow: {
    tile: "border-yellow-200 bg-yellow-50 dark:border-yellow-900/60 dark:bg-yellow-950/40",
    chip: "bg-yellow-600",
    text: "text-yellow-800 dark:text-yellow-300",
  },
} as const;

export type Tone = keyof typeof TONES;
