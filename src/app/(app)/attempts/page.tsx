import type { Metadata } from "next";
import { ListX, PenLine } from "lucide-react";
import { AttemptsShell } from "@/components/attempts/attempts-shell";
import { AttemptsTable } from "@/components/attempts/attempts-table";
import { AttemptsToolbar } from "@/components/attempts/attempts-toolbar";
import { GridView } from "@/components/attempts/grid-view";
import { Pagination } from "@/components/attempts/pagination";
import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import { QuickLogButton } from "@/components/log/quick-log";
import { today } from "@/lib/dates";
import { hasActiveFilters, parseFilters } from "@/lib/filters";
import { buildGrid } from "@/lib/grid";
import { bookName } from "@/lib/books";
import { bookKeyToString } from "@/lib/filters";
import { listAttempts, listBooksUsed, listGrid } from "@/server/queries/attempts";
import { listSeries } from "@/server/queries/books";
import { listStudents } from "@/server/queries/students";
import { listTagSuggestions } from "@/server/queries/tags";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Attempts" };

export default async function AttemptsPage({ searchParams }: PageProps<"/attempts">) {
  const { student } = await requireStudent();
  const filters = parseFilters(await searchParams);
  const date = today();

  const [students, used, series, tags, data] = await Promise.all([
    listStudents(),
    listBooksUsed(),
    listSeries(),
    listTagSuggestions(),
    filters.view === "grid" ? listGrid(filters).then((g) => ({ kind: "grid" as const, ...g })) : listAttempts(filters).then((l) => ({ kind: "table" as const, ...l })),
  ]);
  const studentOpts = students.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  // Book filter: each series used ("All Cambridge"), then each volume ("Cambridge 17").
  const bookOptions = series.flatMap((s) => {
    const vols = used.filter((u) => u.seriesId === s.id);
    if (!vols.length) return [];
    const whole = { value: bookKeyToString({ seriesId: s.id, volume: null }), label: s.volumes != null ? `All ${s.name}` : s.name };
    const each = s.volumes != null
      ? vols.filter((v) => v.volume != null).map((v) => ({ value: bookKeyToString({ seriesId: s.id, volume: v.volume }), label: bookName(s, v.volume) }))
      : [];
    return [whole, ...each];
  });
  const empty = data.kind === "grid" ? data.dates.length === 0 : data.rows.length === 0;

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title="Attempts"
        description="Every practice session, newest first. You can edit or delete your own."
        actions={
          <QuickLogButton className="md:hidden" />
        }
      />
      <AttemptsShell
        filters={filters}
        toolbar={<AttemptsToolbar students={studentOpts} books={bookOptions} tags={tags} total={data.total} />}
      >
        {empty ? (
          hasActiveFilters(filters) ? (
            <EmptyState icon={ListX} title="No attempts match these filters" description="Try a wider date range or clear the filters." />
          ) : (
            <EmptyState
              icon={PenLine}
              title="No practice logged yet"
              description="Log your first practice test and it will appear here, grouped by date."
              action={<QuickLogButton />}
            />
          )
        ) : data.kind === "grid" ? (
          <GridView
            grid={buildGrid(data.rows, data.dates, studentOpts, { skills: filters.skills, studentIds: filters.students })}
            today={date}
          />
        ) : (
          <AttemptsTable rows={data.rows} currentStudentId={student.id} today={date} tagSuggestions={tags} series={series} />
        )}
        {!empty && <Pagination total={data.total} unit={data.kind === "grid" ? "days" : "attempts"} />}
      </AttemptsShell>
    </PageContainer>
  );
}
