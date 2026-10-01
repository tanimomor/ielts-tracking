import { describe, expect, it } from "vitest";
import { isEmailAllowed, parseAllowedEmails, safeCallbackPath } from "./allowlist";

describe("allow-list", () => {
  const allowed = parseAllowedEmails(" A@Gmail.com, b@example.com ;; not-an-email");
  it("parses, trims and lower-cases", () => {
    expect([...allowed]).toEqual(["a@gmail.com", "b@example.com"]);
  });
  it("matches case-insensitively", () => {
    expect(isEmailAllowed("a@GMAIL.com", allowed)).toBe(true);
    expect(isEmailAllowed("c@gmail.com", allowed)).toBe(false);
    expect(isEmailAllowed(null, allowed)).toBe(false);
  });
  it("is empty when unset", () => {
    expect(parseAllowedEmails(undefined).size).toBe(0);
  });
});

describe("safeCallbackPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeCallbackPath("/attempts?skill=reading")).toBe("/attempts?skill=reading");
  });
  it("rejects external and auth URLs", () => {
    expect(safeCallbackPath("https://evil.example")).toBe("/log");
    expect(safeCallbackPath("//evil.example")).toBe("/log");
    expect(safeCallbackPath("/\\evil.example")).toBe("/log");
    expect(safeCallbackPath("/login")).toBe("/log");
    expect(safeCallbackPath(undefined, "/dashboard")).toBe("/dashboard");
  });
});
