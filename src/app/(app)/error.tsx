"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageContainer>
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong"
        description={
          <>
            This page couldn&apos;t load. Try again — if it keeps happening, the database may be waking up.
            {error.digest && <span className="mt-2 block font-mono text-xs">Ref: {error.digest}</span>}
          </>
        }
        action={<Button onClick={reset}>Try again</Button>}
        className="py-20"
      />
    </PageContainer>
  );
}
