CREATE TABLE "book_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"volumes" integer,
	"tests_per_book" integer DEFAULT 4 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_series_name_unique" UNIQUE("name"),
	CONSTRAINT "book_series_prefix_unique" UNIQUE("prefix"),
	CONSTRAINT "book_series_prefix_format" CHECK ("book_series"."prefix" ~ '^[a-z]{1,6}$'),
	CONSTRAINT "book_series_volumes_range" CHECK ("book_series"."volumes" between 1 and 200),
	CONSTRAINT "book_series_tests_range" CHECK ("book_series"."tests_per_book" between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_book_range";--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_test_range";--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "series_id" integer;--> statement-breakpoint
ALTER TABLE "book_series" ADD CONSTRAINT "book_series_created_by_students_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_series_id_book_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."book_series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_series_idx" ON "attempts" USING btree ("series_id","book");--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_book_range" CHECK ("attempts"."book" between 1 and 200);--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_test_range" CHECK ("attempts"."test" between 1 and 200);--> statement-breakpoint
INSERT INTO "book_series" ("id", "name", "prefix", "volumes", "tests_per_book") VALUES (1, 'Cambridge', 'c', 21, 4) ON CONFLICT DO NOTHING;--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('book_series', 'id'), GREATEST((SELECT max("id") FROM "book_series"), 1));--> statement-breakpoint
UPDATE "attempts" SET "series_id" = 1 WHERE "book" IS NOT NULL AND "series_id" IS NULL;
