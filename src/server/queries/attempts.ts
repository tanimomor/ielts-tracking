import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";

export async function recentAttemptsFor(studentId: string, limit = 8) {
  return db
    .select()
    .from(attempts)
    .where(eq(attempts.studentId, studentId))
    .orderBy(desc(attempts.date), desc(attempts.createdAt))
    .limit(limit);
}
