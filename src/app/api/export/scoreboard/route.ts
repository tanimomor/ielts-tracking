import type { NextRequest } from "next/server";
import { SKILL_LABELS } from "@/lib/constants";
import { today } from "@/lib/dates";
import { buildMaterialBoard, parseMaterial } from "@/lib/material";
import { parsePeriod } from "@/lib/reports/period";
import { DATE_FMT, addTableSheet, excelDate, newWorkbook, workbookResponse } from "@/server/excel/common";
import { listMaterialAttempts } from "@/server/queries/attempts";
import { listStudents } from "@/server/queries/students";
import { AuthError, authorizeStudent } from "@/server/session";

/** Material comparison (book / test / part) as .xlsx: summary + one row per item. */
export async function GET(request: NextRequest) {
  try {
    await authorizeStudent();
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: 401 });
    throw e;
  }
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const material = parseMaterial(params);
  const period = parsePeriod(params.period ? params : { ...params, period: "all" }, today());
  const [rows, students] = await Promise.all([listMaterialAttempts(material, period.range), listStudents()]);
  const board = buildMaterialBoard(
    rows,
    students.map((s) => ({ id: s.id, name: s.name, color: s.color })),
  );

  const wb = newWorkbook();
  addTableSheet(
    wb,
    "Summary",
    [
      { header: "Rank", key: "rank", width: 6 },
      { header: "Student", key: "name", width: 18 },
      { header: "Wins", key: "wins", width: 7 },
      { header: "Attempts", key: "attempts", width: 10 },
      { header: "Items", key: "items", width: 8 },
      { header: "Avg %", key: "avgPct", width: 9, numFmt: "0.0%" },
      { header: "Best %", key: "bestPct", width: 9, numFmt: "0.0%" },
      { header: "Avg band", key: "avgBand", width: 10, numFmt: "0.00" },
      { header: "Best band", key: "bestBand", width: 10, numFmt: "0.0" },
    ],
    board.summaries.map((s, i) => ({
      rank: i + 1,
      name: s.student.name,
      wins: s.wins,
      attempts: s.attempts,
      items: s.items,
      avgPct: s.avgPercent == null ? null : s.avgPercent / 100,
      bestPct: s.bestPercent == null ? null : s.bestPercent / 100,
      avgBand: s.avgBand,
      bestBand: s.bestBand,
    })),
  );
  const cols = board.summaries.map((s) => s.student);
  addTableSheet(
    wb,
    "Items",
    [
      { header: "Code", key: "code", width: 12 },
      { header: "Skill", key: "skill", width: 11 },
      ...cols.flatMap((s, i) => [
        { header: `${s.name} score`, key: `s${i}`, width: 14 },
        { header: `${s.name} band`, key: `b${i}`, width: 12, numFmt: "0.0" },
        { header: `${s.name} date`, key: `d${i}`, width: 13, numFmt: DATE_FMT },
        { header: `${s.name} tries`, key: `n${i}`, width: 11 },
      ]),
      { header: "Leader", key: "leader", width: 16 },
    ],
    board.items.map((item) => ({
      code: item.code,
      skill: SKILL_LABELS[item.skill],
      ...Object.fromEntries(
        cols.flatMap((s, i) => {
          const c = item.cells[s.id];
          return [
            [`s${i}`, c && c.best.rawScore != null && c.best.total != null ? `${c.best.rawScore}/${c.best.total}` : null],
            [`b${i}`, c?.best.band ?? null],
            [`d${i}`, c ? excelDate(c.best.date) : null],
            [`n${i}`, c?.attempts ?? null],
          ];
        }),
      ),
      leader: item.leaders.map((id) => cols.find((s) => s.id === id)?.name).join(" & "),
    })),
  );
  return workbookResponse(wb, `ielts-scoreboard-${material.book ? "book" : "part"}-${today()}.xlsx`);
}
