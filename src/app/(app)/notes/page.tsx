import type { Metadata } from "next";
import { NotesBoard } from "@/components/notes/notes-board";
import { PageContainer, PageHeader } from "@/components/page-header";
import { listNotesFor } from "@/server/queries/notes";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage() {
  const { student } = await requireStudent();
  const notes = await listNotesFor(student.id);
  return (
    <PageContainer className="max-w-7xl">
      <PageHeader title="Notes" description="Vocabulary, mistakes to avoid, tips. Private unless you share them with the group." />
      <NotesBoard notes={notes} me={student.id} />
    </PageContainer>
  );
}
