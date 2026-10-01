import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { SESSION_DAYS } from "@/lib/session-cookie";
import { db } from "./db";
import { sessions, students, users } from "./db/schema";
import { emailFor, findUserById, type AppUser } from "./users";

/** Only a SHA-256 of the cookie token is stored, so a DB leak can't be replayed as a login. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

/** Mirrors the hardcoded account into `users` and links a matching student row. */
async function syncUser(user: AppUser) {
  const email = emailFor(user);
  await db
    .insert(users)
    .values({ id: user.id, name: user.name, email, emailVerified: true })
    .onConflictDoUpdate({ target: users.id, set: { name: user.name, email, updatedAt: new Date() } });
  await db
    .update(students)
    .set({ userId: user.id })
    .where(and(eq(students.email, email), isNull(students.userId)));
}

export async function createSession(user: AppUser, meta: { ipAddress?: string | null; userAgent?: string | null }) {
  await syncUser(user);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({
    id: randomUUID(),
    token: hashToken(token),
    userId: user.id,
    expiresAt,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
  });
  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, hashToken(token)));
}

export type SessionUser = { id: string; name: string; username: string };

export async function lookupSession(token: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.token, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  // Removing someone from src/server/users.ts locks them out even with a live cookie.
  const user = row ? findUserById(row.userId) : undefined;
  return user ? { id: user.id, name: user.name, username: user.username } : null;
}
