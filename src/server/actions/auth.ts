"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/password";
import { safeCallbackPath } from "@/lib/redirect";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { createSession, deleteSession } from "@/server/auth";
import { USERS, findUser } from "@/server/users";

export type LoginState = { error: string; username: string } | null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().slice(0, 64);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const user = findUser(username);
  // Always run one hash check so unknown usernames take as long as wrong passwords.
  const ok = verifyPassword(password, (user ?? USERS[0]).passwordHash) && !!user;
  if (!ok) {
    await sleep(400 + Math.random() * 300); // slows down guessing
    return { error: "Wrong username or password.", username };
  }

  const h = await headers();
  const { token, expiresAt } = await createSession(user, {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: h.get("user-agent"),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  redirect(safeCallbackPath(formData.get("callbackUrl")?.toString()));
}

export async function signOutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
