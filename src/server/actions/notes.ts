"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notePatchSchema, noteInputSchema } from "@/lib/notes";
import type { ActionResult } from "@/lib/validation";
import { db } from "@/server/db";
import { notes, type Note } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import { AuthError, authorizeStudent } from "@/server/session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guarded<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Couldn't save the note. Please try again." };
  }
}

export async function createNoteAction(raw: unknown): Promise<ActionResult<Note>> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    const parsed = noteInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note" };
    const [row] = await db.insert(notes).values({ ...parsed.data, studentId: student.id }).returning();
    if (row!.shared) await recordActivity({ kind: "note", action: "created", studentId: student.id, label: row!.title || "a note" });
    revalidatePath("/notes");
    return { ok: true, data: row! };
  });
}

/** Only the author can change a note; others only ever see shared notes read-only. */
export async function updateNoteAction(id: string, raw: unknown): Promise<ActionResult<Note>> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    if (!UUID_RE.test(id)) return { ok: false, error: "That note doesn't exist." };
    const parsed = notePatchSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Invalid note" };
    const [row] = await db
      .update(notes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.studentId, student.id)))
      .returning();
    if (!row) return { ok: false, error: "You can only edit your own notes." };
    if (!row.title && !row.body.trim()) {
      await db.delete(notes).where(eq(notes.id, row.id));
      revalidatePath("/notes");
      return { ok: true, data: row };
    }
    if (row.shared) await recordActivity({ kind: "note", action: "updated", studentId: student.id, label: row.title || "a note" });
    revalidatePath("/notes");
    return { ok: true, data: row };
  });
}

export async function deleteNoteAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const { student } = await authorizeStudent();
    if (!UUID_RE.test(id)) return { ok: false, error: "That note doesn't exist." };
    const deleted = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.studentId, student.id)))
      .returning({ id: notes.id, shared: notes.shared });
    if (!deleted.length) return { ok: false, error: "You can only delete your own notes." };
    if (deleted[0].shared) await recordActivity({ kind: "note", action: "deleted", studentId: student.id, label: "a note" });
    revalidatePath("/notes");
    return { ok: true, data: null };
  });
}
