import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { and, eq, isNull } from "drizzle-orm";
import { isEmailAllowed, parseAllowedEmails } from "@/lib/allowlist";
import { db } from "./db";
import * as schema from "./db/schema";

export const NOT_INVITED = "not_invited";

export function allowedEmails() {
  return parseAllowedEmails(process.env.ALLOWED_EMAILS);
}

function notInvited(): APIError {
  return new APIError("FORBIDDEN", { code: NOT_INVITED, message: "This account isn't invited" });
}

function baseURL(): string | undefined {
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return undefined;
}

/** Links a signed-in user to their student row (by email) and refreshes the avatar. */
async function linkStudent(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) return;
  const linked = await db
    .update(schema.students)
    .set({ avatarUrl: user.image })
    .where(eq(schema.students.userId, user.id))
    .returning({ id: schema.students.id });
  if (linked.length) return;
  await db
    .update(schema.students)
    .set({ userId: user.id, avatarUrl: user.image })
    .where(and(eq(schema.students.email, user.email.toLowerCase()), isNull(schema.students.userId)));
}

export const auth = betterAuth({
  appName: "IELTS Tracker",
  secret: process.env.AUTH_SECRET,
  baseURL: baseURL(),
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true, transaction: true }),
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      prompt: "select_account",
      // Keep name and profile photo in sync with Google on every sign-in.
      overrideUserInfoOnSignIn: true,
    },
  },
  // Google is the only way in: no email/password, no magic links.
  emailAndPassword: { enabled: false },
  session: {
    // Database sessions; deleting a row signs that device out.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isEmailAllowed(user.email, allowedEmails())) throw notInvited();
          return { data: { ...user, email: user.email.toLowerCase() } };
        },
      },
    },
    session: {
      create: {
        // Runs on every sign-in, so removing an email from ALLOWED_EMAILS locks it out.
        before: async (session) => {
          const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.userId) });
          if (!user || !isEmailAllowed(user.email, allowedEmails())) throw notInvited();
        },
        after: async (session) => {
          await linkStudent(session.userId);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
