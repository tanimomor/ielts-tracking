"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Follows Google's sign-in branding: white, #747775 border, #1F1F1F label. */
export function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
      errorCallbackURL: "/login",
    });
    if (error) setPending(false);
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[#747775] bg-white px-4 text-[15px] font-medium text-[#1F1F1F] transition-colors hover:bg-[#F8F9FA] focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none active:bg-[#F1F3F4] disabled:cursor-wait disabled:opacity-70"
      style={{ fontFamily: "Roboto, var(--font-geist-sans), system-ui, sans-serif" }}
    >
      {pending ? <Loader2 className="size-5 animate-spin text-[#5f6368]" aria-hidden /> : <GoogleG />}
      <span>Continue with Google</span>
    </button>
  );
}
