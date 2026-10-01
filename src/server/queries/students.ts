import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/server/db";
import { students, type Student } from "@/server/db/schema";

export const listStudents = cache(async (): Promise<Student[]> => {
  return db.select().from(students).orderBy(asc(students.createdAt), asc(students.name));
});

export const getStudent = cache(async (id: string): Promise<Student | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return row ?? null;
});
