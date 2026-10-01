import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Not invited" };

export default async function NotInvitedPage() {
  const session = await getSession();
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldX className="size-6" aria-hidden />
        </span>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">This account isn&apos;t invited</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          {session ? (
            <>
              <span className="font-medium text-foreground">{session.user.email}</span> isn&apos;t on the list of
              students for this tracker.
            </>
          ) : (
            "The Google account you chose isn't on the list of students for this tracker."
          )}{" "}
          Ask whoever runs it to add your email, or sign in with a different account.
        </p>
        <div className="mt-8">
          {session ? (
            <form action={signOutAction}>
              <Button type="submit" size="lg" className="w-full">
                Use a different account
              </Button>
            </form>
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link href="/login">Use a different account</Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
