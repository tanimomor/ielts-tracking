export function parseAllowedEmails(raw: string | undefined | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[,\s;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

export function isEmailAllowed(email: string | null | undefined, allowed: Set<string>): boolean {
  return !!email && allowed.has(email.trim().toLowerCase());
}

/** Only same-origin relative paths are allowed as post-login destinations. */
export function safeCallbackPath(value: string | null | undefined, fallback = "/log"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/not-invited") || value.startsWith("/api/auth")) return fallback;
  return value;
}
