"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useState } from "react";
import { AttemptForm } from "@/components/attempts/attempt-form";
import { StudentAvatar } from "@/components/students/student-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emptyAttemptValues } from "@/lib/attempt-values";
import type { SeriesInfo } from "@/lib/books";
import { cn } from "@/lib/utils";

type Ctx = { open: () => void };
const QuickLogContext = createContext<Ctx | null>(null);

export function useQuickLog() {
  const ctx = useContext(QuickLogContext);
  if (!ctx) throw new Error("useQuickLog must be used inside QuickLogProvider");
  return ctx;
}

type Props = {
  today: string;
  series: SeriesInfo[];
  tagSuggestions: string[];
  student: { name: string; color: string; avatarUrl: string | null };
  children: React.ReactNode;
};

/** Opens the quick-entry dialog when the URL carries ?log=1 (e.g. old /log links). */
function OpenFromUrl({ onOpen }: { onOpen: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (params.get("log") !== "1") return;
    onOpen();
    const next = new URLSearchParams(params);
    next.delete("log");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [params, onOpen, router, pathname]);
  return null;
}

/** Quick entry for a practice attempt, available from every page. */
export function QuickLogProvider({ today, series, tagSuggestions, student, children }: Props) {
  const [open, setOpen] = useState(false);
  // Remount the form on each open so it starts fresh with today's date.
  const [session, setSession] = useState(0);
  const openDialog = useCallback(() => {
    setSession((n) => n + 1);
    setOpen(true);
  }, []);

  // "N" opens quick entry from anywhere (unless typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.closest("[role=dialog]"))) return;
      e.preventDefault();
      openDialog();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDialog]);

  return (
    <QuickLogContext.Provider value={{ open: openDialog }}>
      {children}
      <Suspense fallback={null}>
        <OpenFromUrl onOpen={openDialog} />
      </Suspense>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] gap-5 bg-surface p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-xl">
              Log practice
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background py-0.5 pr-2.5 pl-0.5 text-xs font-medium">
                <StudentAvatar student={student} size="xs" className="ring-offset-1" />
                {student.name}
              </span>
            </DialogTitle>
            <DialogDescription>Four quick steps. Only Practice and Result are needed.</DialogDescription>
          </DialogHeader>
          {open && (
            <AttemptForm
              key={session}
              mode="create"
              initial={emptyAttemptValues(today)}
              maxDate={today}
              series={series}
              tagSuggestions={tagSuggestions}
              onSaved={({ keepOpen }) => !keepOpen && setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </QuickLogContext.Provider>
  );
}

/** Primary "Log practice" button (sidebar / page headers). */
export function QuickLogButton({ className, size = "default" }: { className?: string; size?: "default" | "lg" | "sm" }) {
  const { open } = useQuickLog();
  return (
    <Button onClick={open} size={size} className={cn("bg-brand text-white shadow-md shadow-fuchsia-600/25 hover:brightness-110", className)}>
      <Plus aria-hidden /> Log practice
      <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 font-sans text-[10px] font-semibold lg:inline">N</kbd>
    </Button>
  );
}

/** Floating action button on mobile, above the bottom tab bar. */
export function QuickLogFab() {
  const { open } = useQuickLog();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Log practice"
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 grid size-14 cursor-pointer place-items-center rounded-full bg-brand text-white shadow-lg shadow-fuchsia-600/30 transition-transform focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-95 md:hidden"
    >
      <Plus className="size-6" aria-hidden />
    </button>
  );
}
