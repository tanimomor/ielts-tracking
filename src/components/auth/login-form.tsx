"use client";

import { Loader2, LogIn } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/server/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={state?.username ?? ""}
          className="h-11"
          aria-invalid={!!state?.error}
          required
          autoFocus
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? "login-error" : undefined}
          required
        />
      </div>
      {state?.error && (
        <p id="login-error" role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}
        Log in
      </Button>
    </form>
  );
}
