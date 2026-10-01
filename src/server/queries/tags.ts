import "server-only";
import { sql } from "drizzle-orm";
import { DEFAULT_MISTAKE_TAGS } from "@/lib/constants";
import { db } from "@/server/db";

/** Tags already used (most frequent first) followed by the built-in suggestions. */
export async function listTagSuggestions(): Promise<string[]> {
  const rows = await db.execute<{ tag: string }>(sql`
    select tag from attempts, unnest(mistake_tags) as tag
    group by tag order by count(*) desc, tag limit 200
  `);
  return [...new Set([...rows.rows.map((r) => r.tag), ...DEFAULT_MISTAKE_TAGS])];
}
