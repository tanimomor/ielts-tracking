import "server-only";
import type ExcelJS from "exceljs";
import { SKILL_LABELS } from "@/lib/constants";
import type { GridModel } from "@/lib/grid";
import type { AttemptListRow } from "@/server/queries/attempts";
import { DATE_FMT, addTableSheet, excelDate, styleHeader } from "./common";

export const ATTEMPT_COLUMNS = [
  { header: "Date", key: "date", width: 13, numFmt: DATE_FMT },
  { header: "Student", key: "student", width: 16 },
  { header: "Skill", key: "skill", width: 11 },
  { header: "Book", key: "book", width: 7 },
  { header: "Test", key: "test", width: 6 },
  { header: "Part", key: "part", width: 6 },
  { header: "Code", key: "code", width: 11 },
  { header: "Correct", key: "raw", width: 9 },
  { header: "Out of", key: "total", width: 8 },
  { header: "Percent", key: "percent", width: 9, numFmt: "0.0%" },
  { header: "Band", key: "band", width: 7, numFmt: "0.0" },
  { header: "Time (min)", key: "time", width: 11 },
  { header: "Mistake tags", key: "tags", width: 28, wrap: true },
  { header: "Notes", key: "notes", width: 40, wrap: true },
];

export function attemptRow(a: AttemptListRow) {
  return {
    date: excelDate(a.date),
    student: a.studentName,
    skill: SKILL_LABELS[a.skill],
    book: a.book,
    test: a.test,
    part: a.part,
    code: a.code,
    raw: a.rawScore,
    total: a.total,
    percent: a.percent == null ? null : a.percent / 100,
    band: a.band,
    time: a.timeTakenMin,
    tags: a.mistakeTags.join(", "),
    notes: a.notes,
  };
}

export function addAttemptsSheet(wb: ExcelJS.Workbook, name: string, rows: AttemptListRow[], tabColor?: string) {
  return addTableSheet(wb, name, ATTEMPT_COLUMNS, rows.map(attemptRow), { tabColor });
}

export function addGridSheet(wb: ExcelJS.Workbook, grid: GridModel) {
  const ws = wb.addWorksheet("Grid", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });
  ws.columns = [
    { header: "Date", key: "date", width: 13, style: { numFmt: DATE_FMT, alignment: { vertical: "top" } } },
    ...grid.columns.map((c, i) => ({
      header: `${c.student.name} · ${SKILL_LABELS[c.skill]}`,
      key: `c${i}`,
      width: 18,
      style: { alignment: { wrapText: true, vertical: "top" as const } },
    })),
  ];
  for (const row of grid.rows) {
    const values: Record<string, unknown> = { date: excelDate(row.date) };
    row.cells.forEach((cell, i) => {
      values[`c${i}`] = cell.join("\n");
    });
    ws.addRow(values);
  }
  styleHeader(ws, grid.columns.length + 1);
  grid.columns.forEach((c, i) => {
    const cell = ws.getRow(1).getCell(i + 2);
    cell.border = { bottom: { style: "medium", color: { argb: `FF${c.student.color.replace("#", "")}` } } };
  });
  return ws;
}
