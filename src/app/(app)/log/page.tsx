import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AttemptForm } from "@/components/attempts/attempt-form";
import { RecentAttempts } from "@/components/attempts/recent-attempts";
import { PageContainer, PageHeader } from "@/components/page-header";
import { StudentAvatar } from "@/components/students/student-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { emptyAttemptValues } from "@/lib/attempt-values";
import { today } from "@/lib/dates";
import { recentAttemptsFor } from "@/server/queries/attempts";
import { listStudents } from "@/server/queries/students";
import { listTagSuggestions } from "@/server/queries/tags";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Log practice" };

export default async function LogPage() {
  const { student } = await requireStudent();
  const [students, tags, recent] = await Promise.all([listStudents(), listTagSuggestions(), recentAttemptsFor(student.id)]);
  const date = today();
  const others = students.filter((s) => s.id !== student.id);

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="Log practice" description="Saved straight to your history. The form stays open for the next one." />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="New attempt" className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background py-1 pr-3 pl-1 text-sm font-medium shadow-xs">
              <StudentAvatar student={student} size="xs" className="ring-offset-1" />
              {student.name}
              <span className="text-xs font-normal text-muted-foreground">(you)</span>
            </span>
            {others.map((o) => (
              <Tooltip key={o.id}>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-dashed py-1 pr-3 pl-1 text-sm text-muted-foreground"
                  >
                    <StudentAvatar student={o} size="xs" className="opacity-60 ring-offset-1" />
                    {o.name}
                    <Lock className="size-3" aria-label="read-only" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>You can only log your own practice</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <AttemptForm mode="create" initial={emptyAttemptValues(date)} maxDate={date} tagSuggestions={tags} />
        </section>

        <aside aria-labelledby="recent-heading" className="lg:sticky lg:top-10 lg:self-start">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="recent-heading" className="text-sm font-semibold">
              Your recent entries
            </h2>
            <Link href="/attempts" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <RecentAttempts attempts={recent} today={date} />
        </aside>
      </div>
    </PageContainer>
  );
}
