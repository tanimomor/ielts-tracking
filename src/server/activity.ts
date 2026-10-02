import "server-only";
import { lt } from "drizzle-orm";
import { db } from "./db";
import { activity } from "./db/schema";

export type ActivityKind = "attempt" | "book" | "note" | "report" | "import" | "profile";
export type ActivityAction = "created" | "updated" | "deleted" | "synced";

/**
 * Records a change for live updates. Never throws: a failed broadcast must
 * not fail the user's save.
 */
export async function recordActivity(e: { kind: ActivityKind; action: ActivityAction; studentId: string; label: string }) {
  try {
    const [row] = await db
      .insert(activity)
      .values({ kind: e.kind, action: e.action, studentId: e.studentId, label: e.label.slice(0, 120) })
      .returning({ id: activity.id });
    // Occasionally prune: the feed only needs to bridge reconnects.
    if (row && row.id % 50 === 0) {
      await db.delete(activity).where(lt(activity.createdAt, new Date(Date.now() - 7 * 86_400_000)));
    }
  } catch (err) {
    console.error("recordActivity failed", err);
  }
}
