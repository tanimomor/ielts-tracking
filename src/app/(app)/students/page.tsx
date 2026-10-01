import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { StudentAvatar } from "@/components/students/student-avatar";
import { Card } from "@/components/ui/card";
import { diffDays, formatDateShort, today } from "@/lib/dates";
import { formatBand } from "@/lib/scoring";
import { pluralize } from "@/lib/utils";
import { listStudentSummaries } from "@/server/queries/students";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  const { student: me } = await requireStudent();
  const students = await listStudentSummaries();
  const date = today();

  return (
    <PageContainer>
      <PageHeader title="Students" description="Everyone in the group. Profiles are visible to all; only you can change your own entries." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => {
          const ago = s.lastPractised ? diffDays(s.lastPractised, date) : null;
          return (
            <li key={s.id}>
              <Link href={`/students/${s.id}`} className="group block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none">
                <Card className="relative gap-4 overflow-hidden px-5 py-5 transition-shadow group-hover:shadow-md">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: s.color }} />
                  <div className="flex items-center gap-3">
                    <StudentAvatar student={s} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {s.name}
                        {s.id === me.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">Target {formatBand(s.targetBand)}</div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Attempts</dt>
                      <dd className="font-semibold tabular">{s.attempts}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Days</dt>
                      <dd className="font-semibold tabular">{s.practiceDays}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Last practice</dt>
                      <dd className="font-semibold">
                        {ago == null ? "—" : ago === 0 ? "Today" : ago === 1 ? "Yesterday" : ago < 7 ? `${pluralize(ago, "day")} ago` : formatDateShort(s.lastPractised!, date)}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageContainer>
  );
}
