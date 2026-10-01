import type { Metadata } from "next";
import { ImportWizard } from "@/components/import/import-wizard";
import { PageContainer, PageHeader } from "@/components/page-header";
import { today } from "@/lib/dates";
import { listStudents } from "@/server/queries/students";
import { requireStudent } from "@/server/session";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const { student } = await requireStudent();
  const students = (await listStudents()).map((s) => ({ id: s.id, name: s.name, email: s.email, color: s.color }));
  const me = students.find((s) => s.id === student.id)!;
  return (
    <PageContainer className="max-w-6xl">
      <PageHeader title="Import from Google Sheets" description="A one-time move of your existing practice log. Preview everything before it's saved." />
      <ImportWizard me={me} students={students} today={today()} />
    </PageContainer>
  );
}
