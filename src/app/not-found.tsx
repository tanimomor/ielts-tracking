import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6">
      <div className="max-w-sm text-center">
        <BrandMark className="mx-auto size-12 rounded-xl text-base" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">That page doesn&apos;t exist, or the student was removed.</p>
        <Button asChild className="mt-6">
          <Link href="/log">Back to logging</Link>
        </Button>
      </div>
    </main>
  );
}
