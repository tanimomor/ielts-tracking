"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Event = {
  id: number;
  kind: string;
  action: string;
  label: string;
  studentId: string | null;
  name: string | null;
};

type Status = "connecting" | "live" | "paused";
const LiveContext = createContext<Status>("connecting");
export const useLiveStatus = () => useContext(LiveContext);

const VERB: Record<string, Record<string, string>> = {
  attempt: { created: "logged", updated: "edited", deleted: "deleted" },
  book: { created: "added the book", updated: "edited the book" },
  note: { created: "shared a note:", updated: "updated a shared note:", deleted: "removed a shared note" },
  report: { synced: "refreshed" },
  import: { created: "imported" },
  profile: { updated: "updated their profile" },
};

function message(e: Event) {
  const verb = VERB[e.kind]?.[e.action] ?? `${e.action} ${e.kind}`;
  const label = e.kind === "profile" || (e.kind === "note" && e.action === "deleted") ? "" : ` ${e.label}`;
  return `${e.name ?? "Someone"} ${verb}${label}`;
}

/**
 * Listens to /api/events (Server-Sent Events). Other students' changes pop a
 * toast and refresh the current page's data in place; the stream pauses
 * while the tab is hidden to save free-tier quota.
 */
export function LiveUpdates({ me, children }: { me: string; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 600);
    };

    const open = () => {
      if (source) return;
      source = new EventSource("/api/events");
      source.onopen = () => setStatus("live");
      source.onerror = () => setStatus("connecting"); // the browser retries on its own
      source.addEventListener("activity", (ev) => {
        const e = JSON.parse((ev as MessageEvent).data) as Event;
        // Report syncs only matter on report pages, which refresh anyway.
        if (e.studentId !== me && e.kind !== "report") toast.info(message(e));
        scheduleRefresh();
      });
    };
    const close = () => {
      source?.close();
      source = null;
      setStatus("paused");
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setStatus("connecting");
        open();
        scheduleRefresh();
      } else close();
    };

    // Hidden tabs connect when they become visible.
    if (document.visibilityState === "visible") open();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      source?.close();
    };
  }, [me, router]);

  return <LiveContext.Provider value={status}>{children}</LiveContext.Provider>;
}

export function LiveBadge() {
  const status = useLiveStatus();
  const label = status === "live" ? "Live" : status === "paused" ? "Paused" : "Connecting…";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite" title="Updates from others appear automatically">
      <span
        aria-hidden
        className={
          status === "live"
            ? "size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20"
            : status === "paused"
              ? "size-2 rounded-full bg-muted-foreground/50"
              : "size-2 animate-pulse rounded-full bg-amber-500"
        }
      />
      {label}
    </span>
  );
}
