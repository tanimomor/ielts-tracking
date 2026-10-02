import { desc, eq, gt } from "drizzle-orm";
import { db } from "@/server/db";
import { activity, students } from "@/server/db/schema";
import { getSession } from "@/server/session";

// Server-Sent Events: Vercel functions can't hold WebSockets, but they can
// stream. Each connection lives ~4.5 minutes; EventSource reconnects on its
// own and resumes from Last-Event-ID, so nothing is missed.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const POLL_MS = 4000;
const PING_MS = 20000;
const LIFETIME_MS = 270_000;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  // Resume after the last event the browser saw, or start from "now".
  const header = Number(request.headers.get("last-event-id"));
  let lastId = Number.isFinite(header) && header > 0 ? header : null;
  if (lastId == null) {
    const [row] = await db.select({ id: activity.id }).from(activity).orderBy(desc(activity.id)).limit(1);
    lastId = row?.id ?? 0;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      const started = Date.now();
      let lastPing = Date.now();
      let closed = false;
      request.signal.addEventListener("abort", () => (closed = true));

      send(`retry: 3000\n: connected\n\n`);
      while (!closed && Date.now() - started < LIFETIME_MS) {
        try {
          const rows = await db
            .select({
              id: activity.id,
              kind: activity.kind,
              action: activity.action,
              label: activity.label,
              studentId: activity.studentId,
              name: students.name,
              createdAt: activity.createdAt,
            })
            .from(activity)
            .leftJoin(students, eq(students.id, activity.studentId))
            .where(gt(activity.id, lastId!))
            .orderBy(activity.id)
            .limit(50);
          for (const r of rows) {
            send(`id: ${r.id}\nevent: activity\ndata: ${JSON.stringify(r)}\n\n`);
            lastId = r.id;
          }
          if (Date.now() - lastPing > PING_MS) {
            send(`: ping\n\n`);
            lastPing = Date.now();
          }
        } catch (err) {
          console.error("events stream", err);
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      try {
        controller.close();
      } catch {
        // already closed by the client
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
