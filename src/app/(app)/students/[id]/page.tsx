import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, Download, Flag, ListOrdered, RefreshCw } from "lucide-react";
import { AttemptsShell } from "@/components/attempts/attempts-shell";
import { AttemptsTable } from "@/components/attempts/attempts-table";
import { Pagination } from "@/components/attempts/pagination";
import { EmptyState, PageContainer } from "@/components/page-header";
import { SKILL_COLORS } from "@/components/skill-icon";
import { EditProfileDialog } from "@/components/students/edit-profile-dialog";
import { ProfileProgress } from "@/components/students/profile-progress";
import { ProfileSync } from "@/components/students/profile-sync";
import { StudentAvatar } from "@/components/students/student-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CORE_SKILLS, SKILL_LABELS } from "@/lib/constants";
import { formatDateLong, formatDateTime, today } from "@/lib/dates";
import { parseFilters } from "@/lib/filters";
import { buildMilestones, nextGoals } from "@/lib/milestones";
import { parsePeriod } from "@/lib/reports/period";
import { formatBand } from "@/lib/scoring";
import { listAttempts } from "@/server/queries/attempts";
import { latestOrCreateSnapshot } from "@/server/reports/store";
import { getStudent, listStudents, studentMilestoneRows } from "@/server/queries/students";
import { listSeries } from "@/server/queries/books";
import { listTagSuggestions } from "@/server/queries/tags";
import { requireStudent } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/students/[id]">): Promise<Metadata> {
  const s = await getStudent((await params).id);
  return { title: s?.name ?? "Student" };
}

export default async function StudentPage({ params, searchParams }: PageProps<"/students/[id]">) {
  const { student: me } = await requireStudent();
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  const isMe = student.id === me.id;
  const date = today();
  const filters = { ...parseFilters(await searchParams), students: [student.id], view: "table" as const };
  const allTime = parsePeriod({ period: "all" }, date);

  const [all, snapshot, history, tags, milestoneRows, series] = await Promise.all([
    listStudents(),
    latestOrCreateSnapshot("dashboard", [student.id], allTime, me.id),
    listAttempts(filters),
    listTagSuggestions(),
    studentMilestoneRows(student.id),
    listSeries(),
  ]);
  const milestones = buildMilestones(milestoneRows.firsts, milestoneRows.nth);
  const best = Object.fromEntries(
    CORE_SKILLS.map((s) => [s, Math.max(0, ...milestoneRows.firsts.filter((f) => f.skill === s).map((f) => f.threshold)) || null]),
  );
  const goals = nextGoals(best);
  const syncedBy = snapshot?.generatedBy ? all.find((s) => s.id === snapshot.generatedBy)?.name ?? null : null;

  return (
    <PageContainer className="max-w-7xl">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <StudentAvatar student={student} size="xl" className="ring-4" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">
              {student.name}
              {isMe && <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">(you)</span>}
            </h1>
            <p className="text-sm text-muted-foreground">@{student.email.split("@")[0]}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
              <Flag className="size-3.5 text-muted-foreground" aria-hidden /> Target band{" "}
              <span className="font-semibold tabular">{formatBand(student.targetBand)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isMe && (
            <EditProfileDialog
              defaults={{ name: student.name, targetBand: student.targetBand, color: student.color }}
              takenColors={all.filter((s) => s.id !== student.id).map((s) => s.color)}
            />
          )}
          <Button asChild variant="outline">
            <a href={`/api/export/attempts?students=${student.id}`} download>
              <Download aria-hidden /> Export history
            </a>
          </Button>
        </div>
      </div>

      <section aria-label="Progress" className="mb-8">
        <ProfileSync studentId={student.id} lastSynced={snapshot ? formatDateTime(snapshot.generatedAt) : null} syncedBy={syncedBy}>
          {snapshot ? (
            <ProfileProgress payload={snapshot.payload} color={student.color} />
          ) : (
            <EmptyState icon={RefreshCw} title="Couldn't build the progress view" description="Press Sync & refresh to try again." />
          )}
        </ProfileSync>
      </section>

      <section aria-labelledby="milestones-heading" className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="gap-4 px-5 py-5">
          <h2 id="milestones-heading" className="flex items-center gap-2 text-[15px] font-semibold">
            <Award className="size-4 text-warning" aria-hidden /> Milestones
          </h2>
          {milestones.length ? (
            <ol className="relative grid gap-4 border-l pl-5">
              {milestones.map((m) => (
                <li key={m.key} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-1 -left-[26px] size-3 rounded-full ring-4 ring-background"
                    style={{ backgroundColor: m.kind === "band" ? SKILL_COLORS[m.key.split("-")[0] as keyof typeof SKILL_COLORS] : "#556070" }}
                  />
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateLong(m.date)}
                    {m.detail && ` · ${m.detail}`}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Milestones appear as bands and attempt counts are reached.</p>
          )}
        </Card>
        <Card className="gap-3 px-5 py-5">
          <h2 className="text-[15px] font-semibold">Next goals</h2>
          <ul className="grid gap-2 text-sm">
            {goals.map((g) => (
              <li key={g.skill} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                <span>{SKILL_LABELS[g.skill]}</span>
                <span className="font-semibold tabular">First {formatBand(g.band)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <ListOrdered className="size-5 text-muted-foreground" aria-hidden /> Attempt history
          <span className="text-sm font-normal text-muted-foreground">({history.total})</span>
        </h2>
        <AttemptsShell filters={filters} toolbar={null}>
          {history.rows.length ? (
            <>
              <AttemptsTable rows={history.rows} currentStudentId={me.id} today={date} tagSuggestions={tags} series={series} />
              <Pagination total={history.total} unit="attempts" />
            </>
          ) : (
            <EmptyState title="No attempts yet" description={isMe ? "Log your first practice from the Log page." : `${student.name} hasn't logged anything yet.`} />
          )}
        </AttemptsShell>
      </section>
    </PageContainer>
  );
}
