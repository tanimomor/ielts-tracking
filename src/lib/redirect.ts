/** Only same-origin relative paths are allowed as post-login destinations. */
export function safeCallbackPath(value: string | null | undefined, fallback = "/log"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login")) return fallback;
  return value;
}
