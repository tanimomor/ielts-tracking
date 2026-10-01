"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useTransition } from "react";
import { filtersToParams, type AttemptFilters } from "@/lib/filters";
import { cn } from "@/lib/utils";

type Ctx = {
  filters: AttemptFilters;
  pending: boolean;
  update: (patch: Partial<AttemptFilters>, opts?: { keepPage?: boolean }) => void;
  hrefFor: (patch: Partial<AttemptFilters>) => string;
};

const FiltersContext = createContext<Ctx | null>(null);

export function useAttemptFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useAttemptFilters must be used inside AttemptsShell");
  return ctx;
}

/** Holds the URL-backed filters and dims the results while a new query loads. */
export function AttemptsShell({
  filters,
  toolbar,
  children,
}: {
  filters: AttemptFilters;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  const hrefFor = useCallback(
    (patch: Partial<AttemptFilters>) => {
      const qs = filtersToParams({ ...filters, ...patch }).toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [filters, pathname],
  );

  const update = useCallback(
    (patch: Partial<AttemptFilters>, opts?: { keepPage?: boolean }) => {
      const href = hrefFor(opts?.keepPage ? patch : { ...patch, page: 1 });
      start(() => router.push(href, { scroll: false }));
    },
    [hrefFor, router],
  );

  return (
    <FiltersContext.Provider value={{ filters, pending, update, hrefFor }}>
      {toolbar}
      <div aria-busy={pending} className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-50")}>
        {children}
      </div>
    </FiltersContext.Provider>
  );
}
