import "server-only";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/server/db";
import { notes, students } from "@/server/db/schema";

/** My notes plus notes others have shared, pinned first, newest first. */
export async function listNotesFor(studentId: string) {
  return db
    .select({
      id: notes.id,
      studentId: notes.studentId,
      title: notes.title,
      body: notes.body,
      color: notes.color,
      pinned: notes.pinned,
      shared: notes.shared,
      updatedAt: notes.updatedAt,
      authorName: students.name,
      authorColor: students.color,
    })
    .from(notes)
    .innerJoin(students, eq(students.id, notes.studentId))
    .where(or(eq(notes.studentId, studentId), eq(notes.shared, true)))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt))
    .limit(500);
}

export type NoteRow = Awaited<ReturnType<typeof listNotesFor>>[number];
