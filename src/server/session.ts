import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isEmailAllowed } from "@/lib/allowlist";
import { allowedEmails, auth } from "./auth";
import { db } from "./db";
import { students, type Student } from "./db/schema";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export class AuthError extends Error {}

async function currentPath(): Promise<string | null> {
  return (await headers()).get("x-pathname");
}

function withCallback(path: string, callback: string | null) {
  return callback && callback !== "/" ? `${path}?callbackUrl=${encodeURIComponent(callback)}` : path;
}

/** Signed-in, invited user — or a redirect to /login or /not-invited. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect(withCallback("/login", await currentPath()));
  if (!isEmailAllowed(session.user.email, allowedEmails())) redirect("/not-invited");
  return session.user;
}

export const getStudentForUser = cache(async (userId: string): Promise<Student | null> => {
  const row = await db.query.students.findFirst({ where: eq(students.userId, userId) });
  return row ?? null;
});

/** For pages: signed-in user with a student profile, else redirect to onboarding. */
export async function requireStudent() {
  const user = await requireUser();
  const student = await getStudentForUser(user.id);
  if (!student) redirect(withCallback("/onboarding", await currentPath()));
  return { user, student };
}

/**
 * For Server Actions and route handlers: same checks, but throws instead of
 * redirecting so callers can return a proper error.
 */
export async function authorizeStudent() {
  const session = await getSession();
  if (!session || !isEmailAllowed(session.user.email, allowedEmails())) {
    throw new AuthError("You need to sign in again.");
  }
  const student = await getStudentForUser(session.user.id);
  if (!student) throw new AuthError("Finish setting up your profile first.");
  return { user: session.user, student };
}
