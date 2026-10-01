import type { NextRequest } from "next/server";
import { today } from "@/lib/dates";
import { parseFilters } from "@/lib/filters";
import { buildGrid } from "@/lib/grid";
import { addAttemptsSheet, addGridSheet } from "@/server/excel/attempts";
import { newWorkbook, workbookResponse } from "@/server/excel/common";
import { listAttemptsForExport } from "@/server/queries/attempts";
import { listSeries } from "@/server/queries/books";
import { listStudents } from "@/server/queries/students";
import { AuthError, authorizeStudent } from "@/server/session";

/** Exports exactly what /attempts shows for the same query string (all pages). */
export async function GET(request: NextRequest) {
  try {
    await authorizeStudent();
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: 401 });
    throw e;
  }
  const filters = parseFilters(request.nextUrl.searchParams);
  const [rows, students, series] = await Promise.all([listAttemptsForExport(filters), listStudents(), listSeries()]);

  const wb = newWorkbook();
  addAttemptsSheet(wb, "Attempts", rows, new Map(series.map((s) => [s.id, s])));
  const dates = [...new Set(rows.map((r) => r.date))].sort((a, b) => (filters.dir === "asc" ? a.localeCompare(b) : b.localeCompare(a)));
  addGridSheet(wb, buildGrid(rows, dates, students, { skills: filters.skills, studentIds: filters.students }));

  return workbookResponse(wb, `ielts-attempts-${today()}.xlsx`);
}
