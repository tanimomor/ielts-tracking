import type { Metadata } from "next";
import Link from "next/link";
import { ListX, PenLine } from "lucide-react";
import { AttemptsShell } from "@/components/attempts/attempts-shell";
import { AttemptsTable } from "@/components/attempts/attempts-table";
import { AttemptsToolbar } from "@/components/attempts/attempts-toolbar";
import { GridView } from "@/components/attempts/grid-view";
import { Pagination } from "@/components/attempts/pagination";
import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { today } from "@/lib/dates";
import { hasActiveFilters, parseFilters } from "@/lib/filters";
import { buildGrid } from "@/lib/grid";
import { listAttempts, listBooksUsed, listGrid } from "@/server/queries/attempts";
import { listStudents } from "@/server/queries/students";
import { listTagSuggestions } from "@/server/queries/tags";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Attempts" };

export default async function AttemptsPage({ searchParams }: PageProps<"/attempts">) {
  const { student } = await requireStudent();
  const filters = parseFilters(await searchParams);
  const date = today();

  const [students, books, tags, data] = await Promise.all([
    listStudents(),
    listBooksUsed(),
    listTagSuggestions(),
    filters.view === "grid" ? listGrid(filters).then((g) => ({ kind: "grid" as const, ...g })) : listAttempts(filters).then((l) => ({ kind: "table" as const, ...l })),
  ]);
  const studentOpts = students.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  const empty = data.kind === "grid" ? data.dates.length === 0 : data.rows.length === 0;

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title="Attempts"
        description="Every practice session, newest first. You can edit or delete your own."
        actions={
          <Button asChild>
            <Link href="/log">
              <PenLine aria-hidden /> Log practice
            </Link>
          </Button>
        }
      />
      <AttemptsShell
        filters={filters}
        toolbar={<AttemptsToolbar students={studentOpts} books={books} tags={tags} total={data.total} />}
      >
        {empty ? (
          hasActiveFilters(filters) ? (
            <EmptyState icon={ListX} title="No attempts match these filters" description="Try a wider date range or clear the filters." />
          ) : (
            <EmptyState
              icon={PenLine}
              title="No practice logged yet"
              description="Log your first Cambridge test and it will appear here, grouped by date."
              action={
                <Button asChild>
                  <Link href="/log">Log practice</Link>
                </Button>
              }
            />
          )
        ) : data.kind === "grid" ? (
          <GridView
            grid={buildGrid(data.rows, data.dates, studentOpts, { skills: filters.skills, studentIds: filters.students })}
            today={date}
          />
        ) : (
          <AttemptsTable rows={data.rows} currentStudentId={student.id} today={date} tagSuggestions={tags} />
        )}
        {!empty && <Pagination total={data.total} unit={data.kind === "grid" ? "days" : "attempts"} />}
      </AttemptsShell>
    </PageContainer>
  );
}
