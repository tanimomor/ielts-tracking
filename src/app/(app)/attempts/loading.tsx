import { PageContainer } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageContainer aria-busy className="max-w-7xl">
      <span className="sr-only">Loading attempts…</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <div className="mt-8 flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="ml-auto h-9 w-40" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-4 w-10" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
