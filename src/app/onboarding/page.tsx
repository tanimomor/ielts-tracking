import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { ProfileForm } from "@/components/students/profile-form";
import { safeCallbackPath } from "@/lib/allowlist";
import { STUDENT_COLORS } from "@/lib/constants";
import { createStudentAction } from "@/server/actions/students";
import { listStudents } from "@/server/queries/students";
import { getStudentForUser, requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser();
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(typeof params.callbackUrl === "string" ? params.callbackUrl : undefined);
  if (await getStudentForUser(user.id)) redirect(callbackUrl);

  const others = await listStudents();
  const taken = others.map((s) => s.color);
  const color = STUDENT_COLORS.find((c) => !taken.includes(c)) ?? STUDENT_COLORS[0];

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6 py-12">
      <div className="w-full max-w-md">
        <BrandMark className="size-12 rounded-xl text-base" />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          A few quick choices and you&apos;re in. You can change these later from your profile.
        </p>
        <div className="mt-8">
          <ProfileForm
            action={createStudentAction}
            defaults={{ name: user.name || user.email.split("@")[0], targetBand: 7, color }}
            takenColors={taken}
            callbackUrl={callbackUrl}
            submitLabel="Start tracking"
          />
        </div>
      </div>
    </main>
  );
}
