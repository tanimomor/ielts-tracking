import { SKILLS, type Skill } from "./constants";
import { cellLabel } from "./format";

type GridAttempt = {
  date: string;
  studentId: string;
  skill: Skill;
  code: string;
  rawScore: number | null;
  total: number | null;
  percent: number | null;
  band: number | null;
};

export type GridStudent = { id: string; name: string; color: string };
export type GridColumn = { student: GridStudent; skill: Skill };
export type GridModel = {
  columns: GridColumn[];
  rows: { date: string; cells: string[][] }[];
};

/**
 * Sheet-style grid: one row per date, a column group per student with a
 * column per skill. Skills/students with no data on the page are dropped
 * unless explicitly filtered for.
 */
export function buildGrid(
  attempts: GridAttempt[],
  dates: string[],
  students: GridStudent[],
  opts: { skills?: Skill[]; studentIds?: string[] } = {},
): GridModel {
  const studentList = opts.studentIds?.length
    ? students.filter((s) => opts.studentIds!.includes(s.id))
    : students.filter((s) => attempts.some((a) => a.studentId === s.id));
  const skillList = opts.skills?.length
    ? SKILLS.filter((s) => opts.skills!.includes(s))
    : SKILLS.filter((sk) => sk !== "other" || attempts.some((a) => a.skill === "other"));

  const columns: GridColumn[] = studentList.flatMap((student) => skillList.map((skill) => ({ student, skill })));

  const index = new Map(columns.map((c, i) => [`${c.student.id}:${c.skill}`, i]));
  const byDate = new Map(dates.map((d) => [d, columns.map(() => [] as string[])]));
  for (const a of attempts) {
    const col = index.get(`${a.studentId}:${a.skill}`);
    const cells = byDate.get(a.date);
    if (col != null && cells) cells[col].push(cellLabel(a));
  }
  return { columns, rows: dates.map((date) => ({ date, cells: byDate.get(date)! })) };
}
