import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/auth/google-button";
import { BrandMark } from "@/components/brand";
import { safeCallbackPath } from "@/lib/allowlist";
import { NOT_INVITED } from "@/server/auth";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  access_denied: "Sign-in was cancelled. Try again when you're ready.",
  state_mismatch: "Your sign-in session expired. Please try again.",
  please_restart_the_process: "Your sign-in session expired. Please try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const callbackUrl = safeCallbackPath(typeof params.callbackUrl === "string" ? params.callbackUrl : undefined);

  if (error?.toLowerCase() === NOT_INVITED) redirect("/not-invited");
  if (!error && (await getSession())) redirect(callbackUrl);

  const message = error ? (ERRORS[error.toLowerCase()] ?? "Something went wrong while signing in. Please try again.") : null;

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        <BrandMark className="size-12 rounded-xl text-base" />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">IELTS Tracker</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Log every Cambridge practice test, watch your bands climb, and keep each other on pace.
        </p>
        {message && (
          <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        )}
        <div className="mt-8">
          <GoogleButton callbackUrl={callbackUrl} />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Invite-only. Use the Google account your study group added.</p>
      </div>
    </main>
  );
}
