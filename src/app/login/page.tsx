import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/brand";
import { safeCallbackPath } from "@/lib/redirect";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(typeof params.callbackUrl === "string" ? params.callbackUrl : undefined);
  if (await getSession()) redirect(callbackUrl);

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        <BrandMark className="size-12 rounded-xl text-base" />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">IELTS Tracker</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Log every Cambridge practice test, watch your bands climb, and keep each other on pace.
        </p>
        <div className="mt-8">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
