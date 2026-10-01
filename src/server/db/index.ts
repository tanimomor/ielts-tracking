import "server-only";
import { createDb, type Db } from "./client";

const globalForDb = globalThis as unknown as { __db?: Db };

function getUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

/** One pool per server instance (and per dev HMR session). */
export const db: Db = globalForDb.__db ?? (globalForDb.__db = createDb(getUrl()));

export * as schema from "./schema";
