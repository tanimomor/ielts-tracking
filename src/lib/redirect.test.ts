import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./redirect";

describe("safeCallbackPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeCallbackPath("/attempts?skill=reading")).toBe("/attempts?skill=reading");
  });
  it("rejects external URLs and the login page", () => {
    expect(safeCallbackPath("https://evil.example")).toBe("/log");
    expect(safeCallbackPath("//evil.example")).toBe("/log");
    expect(safeCallbackPath("/\\evil.example")).toBe("/log");
    expect(safeCallbackPath("/login")).toBe("/log");
    expect(safeCallbackPath(undefined, "/dashboard")).toBe("/dashboard");
  });
});
