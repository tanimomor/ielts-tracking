/**
 * The only accounts that can sign in. Passwords are stored as scrypt hashes;
 * to change one, run `pnpm hash-password '<new password>'` and paste the
 * result here. To add someone, add an entry (id and username must be unique).
 */
export type AppUser = { id: string; username: string; name: string; passwordHash: string };

export const USERS: readonly AppUser[] = [
  {
    id: "tanim",
    username: "tanim",
    name: "Tanim",
    passwordHash: "scrypt$OwfnlL5NfZJFTGcZHZo6sA==$LDIOJzfaAlanRIpcSMDqJilDxVpbPns+PBt4yxxAA9c=",
  },
  {
    id: "habiba",
    username: "habiba",
    name: "Habiba",
    passwordHash: "scrypt$NSgFTlslE3e/mP15xIDWCQ==$8ZSARt9uqsq25cmo42z1O2VSeFQFkgqSww+0Kn+gz/8=",
  },
];

/** Students need a unique email; these accounts use a local placeholder. */
export const emailFor = (u: Pick<AppUser, "username">) => `${u.username}@ielts.local`;

export function findUser(username: string): AppUser | undefined {
  const u = username.trim().toLowerCase();
  return USERS.find((x) => x.username === u);
}

export function findUserById(id: string): AppUser | undefined {
  return USERS.find((x) => x.id === id);
}
