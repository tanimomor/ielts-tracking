import type { Skill } from "./constants";
import { textToParts } from "./parts";

/** String-based form state shared by the log form and the edit dialog. */
export type AttemptFormValues = {
  date: string;
  skill: Skill;
  seriesId: string; // "" = no book
  book: string; // volume within the series, "" = none
  test: string;
  parts: string[]; // [] = full test
  rawScore: string;
  total: string;
  band: string;
  timeTakenMin: string;
  mistakeTags: string[];
  notes: string;
};

export function emptyAttemptValues(date: string): AttemptFormValues {
  return {
    date,
    skill: "reading",
    seriesId: "",
    book: "",
    test: "",
    parts: [],
    rawScore: "",
    total: "40",
    band: "",
    timeTakenMin: "",
    mistakeTags: [],
    notes: "",
  };
}

const str = (v: number | null | undefined) => (v == null ? "" : String(v));

export function attemptToValues(a: {
  date: string;
  skill: Skill;
  seriesId: number | null;
  book: number | null;
  test: number | null;
  part: string | null;
  rawScore: number | null;
  total: number | null;
  band: number | null;
  timeTakenMin: number | null;
  mistakeTags: string[];
  notes: string;
}): AttemptFormValues {
  return {
    date: a.date,
    skill: a.skill,
    seriesId: str(a.seriesId),
    book: str(a.book),
    test: str(a.test),
    parts: textToParts(a.part),
    rawScore: str(a.rawScore),
    total: str(a.total),
    band: a.band == null ? "" : a.band.toFixed(1),
    timeTakenMin: str(a.timeTakenMin),
    mistakeTags: a.mistakeTags,
    notes: a.notes,
  };
}
