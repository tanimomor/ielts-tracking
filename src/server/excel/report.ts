import "server-only";
import type ExcelJS from "exceljs";
import { CORE_SKILLS, SKILLS, SKILL_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import type { ReportPayload, StudentReport } from "@/lib/reports/types";
import type { AttemptListRow } from "@/server/queries/attempts";
import { addAttemptsSheet } from "./attempts";
import { DATE_FMT, addTableSheet, excelDate } from "./common";

function summaryRow(r: StudentReport) {
  const row: Record<string, unknown> = {
    student: r.name,
    overall: r.overallBand,
    target: r.targetBand,
    attempts: r.attempts,
    days: r.practiceDays,
    streak: r.currentStreak,
    minutes: r.minutes,
    prevOverall: r.previous?.overallBand ?? null,
    prevAttempts: r.previous?.attempts ?? null,
  };
  for (const s of CORE_SKILLS) {
    row[`${s}Avg`] = r.skills[s].avgBand;
    row[`${s}Best`] = r.skills[s].bestBand;
    row[`${s}N`] = r.skills[s].attempts;
    row[`${s}Pct`] = r.skills[s].avgPercent == null ? null : r.skills[s].avgPercent! / 100;
  }
  return row;
}

/** Summary + insights + weekly trend + detail + one sheet per skill. */
export function buildReportWorkbook(wb: ExcelJS.Workbook, payload: ReportPayload, detail: AttemptListRow[], title: string) {
  const reports = payload.combined.studentId == null ? [payload.combined, ...payload.students] : payload.students;

  const summary = addTableSheet(
    wb,
    "Summary",
    [
      { header: "Student", key: "student", width: 18 },
      { header: "Overall band", key: "overall", width: 13, numFmt: "0.0" },
      { header: "Target", key: "target", width: 8, numFmt: "0.0" },
      { header: "Attempts", key: "attempts", width: 10 },
      { header: "Practice days", key: "days", width: 13 },
      { header: "Current streak", key: "streak", width: 14 },
      { header: "Minutes", key: "minutes", width: 9 },
      ...CORE_SKILLS.flatMap((s) => [
        { header: `${SKILL_LABELS[s]} avg`, key: `${s}Avg`, width: 13, numFmt: "0.00" },
        { header: `${SKILL_LABELS[s]} best`, key: `${s}Best`, width: 13, numFmt: "0.0" },
        { header: `${SKILL_LABELS[s]} attempts`, key: `${s}N`, width: 12 },
        ...(s === "listening" || s === "reading" ? [{ header: `${SKILL_LABELS[s]} %`, key: `${s}Pct`, width: 11, numFmt: "0.0%" }] : []),
      ]),
      { header: `Overall (${payload.period.previousPhrase || "previous"})`, key: "prevOverall", width: 16, numFmt: "0.0" },
      { header: `Attempts (${payload.period.previousPhrase || "previous"})`, key: "prevAttempts", width: 16 },
    ],
    reports.map(summaryRow),
  );
  summary.addRow([]);
  summary.addRow([`${title} · ${payload.period.label}`]);
  summary.addRow([`Generated ${formatDateTime(new Date(payload.generatedAt))} (Asia/Dhaka)`]);

  addTableSheet(
    wb,
    "Insights",
    [
      { header: "Student", key: "student", width: 18 },
      { header: "Insight", key: "text", width: 100, wrap: true },
    ],
    reports.flatMap((r) => r.insights.map((text) => ({ student: r.name, text }))),
  );

  addTableSheet(
    wb,
    "Weekly",
    [
      { header: "Student", key: "student", width: 18 },
      { header: "Week of", key: "week", width: 12, numFmt: DATE_FMT },
      ...CORE_SKILLS.map((s) => ({ header: `${SKILL_LABELS[s]} band`, key: `b_${s}`, width: 14, numFmt: "0.00" })),
      ...SKILLS.map((s) => ({ header: `${SKILL_LABELS[s]} attempts`, key: `n_${s}`, width: 12 })),
    ],
    reports.flatMap((r) =>
      r.weeks.map((w) => ({
        student: r.name,
        week: excelDate(w.week),
        ...Object.fromEntries(CORE_SKILLS.map((s) => [`b_${s}`, w.bands[s] ?? null])),
        ...Object.fromEntries(SKILLS.map((s) => [`n_${s}`, w.counts[s] ?? 0])),
      })),
    ),
  );

  addAttemptsSheet(wb, "Detail", detail);
  for (const s of SKILLS) {
    const rows = detail.filter((d) => d.skill === s);
    if (rows.length || s !== "other") addAttemptsSheet(wb, SKILL_LABELS[s], rows);
  }
}
