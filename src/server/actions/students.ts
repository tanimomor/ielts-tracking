"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeCallbackPath } from "@/lib/redirect";
import { fieldErrors, studentProfileSchema, type ActionResult } from "@/lib/validation";
import { db } from "@/server/db";
import { students } from "@/server/db/schema";
import { recordActivity } from "@/server/activity";
import { emailFor } from "@/server/users";
import { AuthError, authorizeStudent, getStudentForUser, requireUser } from "@/server/session";

function readProfile(formData: FormData) {
  return studentProfileSchema.safeParse({
    name: formData.get("name"),
    targetBand: formData.get("targetBand"),
    color: formData.get("color"),
  });
}

/** Onboarding: create the student for the signed-in account. */
export async function createStudentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = readProfile(formData);
  if (!parsed.success) {
    return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (!(await getStudentForUser(user.id))) {
    const email = emailFor(user);
    // A student row may already exist for this email (seeded or imported) —
    // claim it rather than failing on the unique email.
    await db
      .insert(students)
      .values({ ...parsed.data, email, userId: user.id, avatarUrl: null })
      .onConflictDoUpdate({
        target: students.email,
        set: { ...parsed.data, userId: user.id },
        setWhere: isNull(students.userId),
      });
  }

  revalidatePath("/", "layout");
  redirect(safeCallbackPath(formData.get("callbackUrl")?.toString()));
}

/** Profile edits from the student page (own profile only). */
export async function updateProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const { student } = await authorizeStudent();
    const parsed = readProfile(formData);
    if (!parsed.success) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }
    await db.update(students).set(parsed.data).where(eq(students.id, student.id));
    await recordActivity({ kind: "profile", action: "updated", studentId: student.id, label: parsed.data.name });
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}
