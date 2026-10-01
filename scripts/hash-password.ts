/** Usage: pnpm hash-password 'new password'  → paste the output into src/server/users.ts */
import { hashPassword } from "../src/lib/password";

const pw = process.argv[2];
if (!pw) {
  console.error("Usage: pnpm hash-password '<password>'");
  process.exit(1);
}
console.log(hashPassword(pw));
