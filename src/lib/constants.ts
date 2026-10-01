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

/** Typical number of questions, used to pre-fill "out of". */
export function defaultTotal(skill: Skill, part: string): number | null {
  if (skill === "listening") return part ? 10 : 40;
  if (skill === "reading") return part ? 13 : 40;
  return null;
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

/** Palette offered during onboarding; all pass AA against white for text/markers. */
export const STUDENT_COLORS = [
  "#2563eb",
  "#be185d",
  "#047857",
  "#b45309",
  "#7c3aed",
  "#0e7490",
  "#dc2626",
  "#4d7c0f",
];

export const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) => i * 0.5);
