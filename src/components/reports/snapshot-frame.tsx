"use client";

import { Download, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * Wraps a saved report: "Last synced" line, the Sync & refresh button (which
 * recomputes server-side and saves a new snapshot) and the Excel export.
 */
export function SnapshotFrame({
  sync,
  lastSynced,
  syncedBy,
  exportHref,
  controls,
  children,
}: {
  sync: () => Promise<ActionResult<{ id: string }>>;
  lastSynced: string | null;
  syncedBy?: string | null;
  exportHref: string | null;
  controls: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await sync();
      if (res.ok) {
        toast.success("Report refreshed");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-surface p-3 md:flex-row md:items-center md:justify-between">
        {controls}
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {pending ? "Recomputing from all attempts…" : lastSynced ? `Last synced: ${lastSynced}${syncedBy ? ` by ${syncedBy}` : ""}` : "Not synced yet"}
          </span>
          {exportHref && (
            <Button asChild variant="outline" size="sm">
              <a href={exportHref} download>
                <Download aria-hidden /> Export
              </a>
            </Button>
          )}
          <Button onClick={run} disabled={pending} className="shadow-sm">
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
            Sync &amp; refresh
          </Button>
        </div>
      </div>
      <div className="relative" aria-busy={pending}>
        <div className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-40")}>{children}</div>
        {pending && (
          <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-md">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden /> Syncing report…
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
