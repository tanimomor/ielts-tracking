import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { SKILLS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Auth: accounts are hardcoded in src/server/users.ts and mirrored here
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .unique()
      .references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    avatarUrl: text("avatar_url"),
    color: text("color").notNull(),
    targetBand: numeric("target_band", { precision: 2, scale: 1, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("students_color_hex", sql`${t.color} ~ '^#[0-9a-f]{6}$'`),
    check("students_target_band_range", sql`${t.targetBand} between 0 and 9`),
  ],
);

export const skillEnum = pgEnum("skill", SKILLS);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    skill: skillEnum("skill").notNull(),
    book: integer("book"),
    test: integer("test"),
    part: text("part"),
    code: text("code").notNull().default(""),
    rawScore: integer("raw_score"),
    total: integer("total"),
    percent: numeric("percent", { precision: 5, scale: 2, mode: "number" }).generatedAlwaysAs(
      sql`case when total > 0 and raw_score is not null then round(raw_score * 100.0 / total, 2) end`,
    ),
    band: numeric("band", { precision: 2, scale: 1, mode: "number" }),
    timeTakenMin: integer("time_taken_min"),
    mistakeTags: text("mistake_tags").array().notNull().default(sql`'{}'::text[]`),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("attempts_student_date_idx").on(t.studentId, t.date),
    index("attempts_date_idx").on(t.date),
    index("attempts_tags_idx").using("gin", t.mistakeTags),
    check("attempts_book_range", sql`${t.book} between 1 and 30`),
    check("attempts_test_range", sql`${t.test} between 1 and 4`),
    check("attempts_total_positive", sql`${t.total} > 0`),
    check("attempts_raw_range", sql`${t.rawScore} >= 0 and (${t.total} is null or ${t.rawScore} <= ${t.total})`),
    check("attempts_band_range", sql`${t.band} between 0 and 9 and (${t.band} * 2) = floor(${t.band} * 2)`),
    check("attempts_time_range", sql`${t.timeTakenMin} between 0 and 600`),
  ],
);

export const snapshotKindEnum = pgEnum("snapshot_kind", ["dashboard", "compare"]);
export const scopeTypeEnum = pgEnum("snapshot_scope", ["student", "students", "all"]);
export const periodTypeEnum = pgEnum("period_type", ["month", "year", "all", "custom"]);

export const reportSnapshots = pgTable(
  "report_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: snapshotKindEnum("kind").notNull(),
    scopeType: scopeTypeEnum("scope_type").notNull(),
    /** Sorted student ids; empty for "all". */
    studentIds: uuid("student_ids").array().notNull().default(sql`'{}'::uuid[]`),
    /** Lookup key: "all", "s:<id>" or "c:<id>,<id>…". */
    scopeKey: text("scope_key").notNull(),
    periodType: periodTypeEnum("period_type").notNull(),
    periodStart: date("period_start", { mode: "string" }),
    periodEnd: date("period_end", { mode: "string" }),
    payload: jsonb("payload").notNull(),
    generatedBy: uuid("generated_by").references(() => students.id, { onDelete: "set null" }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("report_snapshots_lookup_idx").on(
      t.kind,
      t.scopeKey,
      t.periodType,
      t.periodStart,
      t.periodEnd,
      t.generatedAt.desc(),
    ),
  ],
);

export type Student = typeof students.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;
export type ReportSnapshot = typeof reportSnapshots.$inferSelect;
