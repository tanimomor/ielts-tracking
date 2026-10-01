export const TIME_ZONE = "Asia/Dhaka";

export const SKILLS = ["listening", "reading", "writing", "speaking", "other"] as const;
export type Skill = (typeof SKILLS)[number];

/** The four skills that make up an IELTS overall band. */
export const CORE_SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type CoreSkill = (typeof CORE_SKILLS)[number];

export const SKILL_LABELS: Record<Skill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
  other: "Other",
};

export const SKILL_SHORT: Record<Skill, string> = {
  listening: "L",
  reading: "R",
  writing: "W",
  speaking: "S",
  other: "O",
};

/** Cambridge IELTS books offered in the log form's dropdown. */
export const CAMBRIDGE_BOOKS = Array.from({ length: 20 }, (_, i) => i + 1);
export const MAX_BOOK = 30;
export const MAX_TEST = 4;

/** Part choices per skill. "" means the full test. */
export const PARTS_BY_SKILL: Record<Skill, { value: string; label: string }[]> = {
  listening: [
    { value: "", label: "Full test" },
    { value: "1", label: "Part 1" },
    { value: "2", label: "Part 2" },
    { value: "3", label: "Part 3" },
    { value: "4", label: "Part 4" },
  ],
  reading: [
    { value: "", label: "Full test" },
    { value: "1", label: "Passage 1" },
    { value: "2", label: "Passage 2" },
    { value: "3", label: "Passage 3" },
  ],
  writing: [
    { value: "", label: "Both tasks" },
    { value: "1", label: "Task 1" },
    { value: "2", label: "Task 2" },
  ],
  speaking: [
    { value: "", label: "Full test" },
    { value: "1", label: "Part 1" },
    { value: "2", label: "Part 2" },
    { value: "3", label: "Part 3" },
  ],
  other: [{ value: "", label: "—" }],
};

/** Questions per section, used to pre-fill "out of". */
const SECTION_QUESTIONS: Partial<Record<Skill, Record<string, number>>> = {
  listening: { "1": 10, "2": 10, "3": 10, "4": 10 },
  reading: { "1": 13, "2": 13, "3": 14 },
};

/** Typical "out of" for the chosen parts ([] = full test); null when not scored by questions. */
export function defaultTotal(skill: Skill, parts: string[]): number | null {
  const sections = SECTION_QUESTIONS[skill];
  if (!sections) return null;
  if (parts.length === 0) return 40;
  return parts.reduce((sum, p) => sum + (sections[p] ?? 0), 0) || null;
}

export const DEFAULT_MISTAKE_TAGS = [
  "map labelling",
  "T/F/NG",
  "Y/N/NG",
  "matching headings",
  "multiple choice",
  "sentence completion",
  "summary completion",
  "spelling",
  "plurals",
  "time management",
  "vocabulary",
  "grammar",
  "coherence",
  "task response",
  "fluency",
  "pronunciation",
];

/**
 * Categorical palette (validated for colour-vision deficiency in this order).
 * Students are offered these in order; names always accompany the colour.
 */
export const STUDENT_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

export const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) => i * 0.5);
