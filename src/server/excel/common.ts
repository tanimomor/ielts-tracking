import "server-only";
import ExcelJS from "exceljs";
import { toExcelDate } from "@/lib/dates";

export const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F4F7" } };
export const DATE_FMT = "dd mmm yyyy";

export function newWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IELTS Tracker";
  wb.created = new Date();
  return wb;
}

export type Col = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  wrap?: boolean;
};

/** A sheet with a bold, shaded, frozen header row and an autofilter. */
export function addTableSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: Col[],
  rows: Record<string, unknown>[],
  opts: { tabColor?: string } = {},
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { tabColor: opts.tabColor ? { argb: `FF${opts.tabColor.replace("#", "")}` } : undefined },
  });
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? Math.max(10, c.header.length + 2),
    style: { numFmt: c.numFmt, alignment: c.wrap ? { wrapText: true, vertical: "top" } : { vertical: "top" } },
  }));
  ws.addRows(rows);
  styleHeader(ws, columns.length);
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

export function styleHeader(ws: ExcelJS.Worksheet, columnCount: number, row = 1) {
  const header = ws.getRow(row);
  header.height = 22;
  for (let c = 1; c <= columnCount; c++) {
    const cell = header.getCell(c);
    cell.font = { bold: true, color: { argb: "FF101828" } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD0D5DD" } } };
  }
}

export const excelDate = (d: string | null | undefined) => (d ? toExcelDate(d) : null);

export async function workbookResponse(wb: ExcelJS.Workbook, filename: string): Promise<Response> {
  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
