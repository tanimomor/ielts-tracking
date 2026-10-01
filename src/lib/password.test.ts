import { describe, expect, it } from "vitest";
import { findUser, USERS } from "@/server/users";
import { hashPassword, verifyPassword } from "./password";

describe("passwords", () => {
  it("verifies a hash it created and rejects others", () => {
    const h = hashPassword("s3cret!");
    expect(verifyPassword("s3cret!", h)).toBe(true);
    expect(verifyPassword("s3cret", h)).toBe(false);
    expect(verifyPassword("s3cret!", "garbage")).toBe(false);
  });

  it("matches the hardcoded accounts", () => {
    expect(verifyPassword("Test#123", findUser("tanim")!.passwordHash)).toBe(true);
    expect(verifyPassword("habiba@123", findUser("Habiba ")!.passwordHash)).toBe(true);
    expect(verifyPassword("Test#123", findUser("habiba")!.passwordHash)).toBe(false);
    expect(new Set(USERS.map((u) => u.id)).size).toBe(USERS.length);
  });
});
