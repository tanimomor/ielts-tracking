import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen, Headphones, Mic, PenLine, Trophy } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/brand";
import { ThemeSwitch } from "@/components/theme";
import { safeCallbackPath } from "@/lib/redirect";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Log in" };

const CHIPS = [
  { label: "Listening 8.0", icon: Headphones, bg: "#1d4ed8" },
  { label: "Reading 7.5", icon: BookOpen, bg: "#c2410c" },
  { label: "Writing 7.0", icon: PenLine, bg: "#047857" },
  { label: "Speaking 7.5", icon: Mic, bg: "#b45309" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(typeof params.callbackUrl === "string" ? params.callbackUrl : undefined);
  if (await getSession()) redirect(callbackUrl);

  return (
    <main className="relative grid min-h-dvh bg-background lg:grid-cols-[1fr_1.1fr]">
      <div className="h-2 bg-brand lg:hidden" aria-hidden />
      <ThemeSwitch className="absolute top-4 right-4 z-10 lg:right-auto lg:left-4" />
      <div className="grid place-items-center px-6 py-12">
        <div className="w-full max-w-sm">
          <BrandMark className="size-12 rounded-xl text-base" />
          <h1 className="mt-8 text-3xl font-bold tracking-tight">
            IELTS <span className="text-brand">Tracker</span>
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Log every practice test, watch your bands climb, and keep each other on pace.
          </p>
          <div className="mt-8">
            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-center" aria-hidden>
        <span className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <span className="absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-white/10" />
        <div className="relative max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            <Trophy className="size-4" /> Band 7.5 or bust
          </div>
          <p className="mt-6 text-4xl leading-tight font-bold tracking-tight">Practise together. Climb together.</p>
          <ul className="mt-10 grid grid-cols-2 gap-3">
            {CHIPS.map(({ label, icon: Icon, bg }) => (
              <li key={label} className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 text-sm font-semibold text-[#0c111d] shadow-lg">
                <span className="grid size-9 place-items-center rounded-xl text-white" style={{ backgroundColor: bg }}>
                  <Icon className="size-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
