import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Neon's WebSocket Pool in production (supports transactions, which Better
 * Auth and the importer use). A plain local Postgres falls back to node-postgres,
 * which exposes the identical Drizzle API.
 */
export function createDb(url: string): Db {
  const host = new URL(url).hostname;
  if (LOCAL_HOSTS.has(host)) {
    return drizzlePg(new pg.Pool({ connectionString: url, max: 5 }), { schema });
  }
  if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;
  const neon = drizzleNeon(new NeonPool({ connectionString: url }), { schema });
  return neon as unknown as Db;
}
