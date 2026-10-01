import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 32;
const COST = 16384;

/** "scrypt$<salt b64>$<hash b64>" — run `pnpm hash-password <password>` to make one. */
export function hashPassword(password: string, salt: Buffer = randomBytes(16)): string {
  const hash = scryptSync(password.normalize("NFKC"), salt, KEY_LEN, { N: COST });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, { N: COST });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
