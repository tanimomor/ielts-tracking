import "server-only";
import { asc, sql } from "drizzle-orm";
import { cache } from "react";
import type { SeriesInfo } from "@/lib/books";
import { db } from "@/server/db";
import { bookSeries } from "@/server/db/schema";

/** Every book series, Cambridge first, then alphabetical. */
export const listSeries = cache(async (): Promise<SeriesInfo[]> => {
  return db
    .select({
      id: bookSeries.id,
      name: bookSeries.name,
      prefix: bookSeries.prefix,
      volumes: bookSeries.volumes,
      testsPerBook: bookSeries.testsPerBook,
    })
    .from(bookSeries)
    .orderBy(sql`${bookSeries.id} = 1 desc`, asc(bookSeries.name));
});
