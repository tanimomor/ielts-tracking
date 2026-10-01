CREATE TYPE "public"."period_type" AS ENUM('month', 'year', 'all', 'custom');--> statement-breakpoint
CREATE TYPE "public"."snapshot_scope" AS ENUM('student', 'students', 'all');--> statement-breakpoint
CREATE TYPE "public"."skill" AS ENUM('listening', 'reading', 'writing', 'speaking', 'other');--> statement-breakpoint
CREATE TYPE "public"."snapshot_kind" AS ENUM('dashboard', 'compare');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"date" date NOT NULL,
	"skill" "skill" NOT NULL,
	"book" integer,
	"test" integer,
	"part" text,
	"code" text DEFAULT '' NOT NULL,
	"raw_score" integer,
	"total" integer,
	"percent" numeric(5, 2) GENERATED ALWAYS AS (case when total > 0 and raw_score is not null then round(raw_score * 100.0 / total, 2) end) STORED,
	"band" numeric(2, 1),
	"time_taken_min" integer,
	"mistake_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_book_range" CHECK ("attempts"."book" between 1 and 30),
	CONSTRAINT "attempts_test_range" CHECK ("attempts"."test" between 1 and 4),
	CONSTRAINT "attempts_total_positive" CHECK ("attempts"."total" > 0),
	CONSTRAINT "attempts_raw_range" CHECK ("attempts"."raw_score" >= 0 and ("attempts"."total" is null or "attempts"."raw_score" <= "attempts"."total")),
	CONSTRAINT "attempts_band_range" CHECK ("attempts"."band" between 0 and 9 and ("attempts"."band" * 2) = floor("attempts"."band" * 2)),
	CONSTRAINT "attempts_time_range" CHECK ("attempts"."time_taken_min" between 0 and 600)
);
--> statement-breakpoint
CREATE TABLE "report_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "snapshot_kind" NOT NULL,
	"scope_type" "snapshot_scope" NOT NULL,
	"student_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"scope_key" text NOT NULL,
	"period_type" "period_type" NOT NULL,
	"period_start" date,
	"period_end" date,
	"payload" jsonb NOT NULL,
	"generated_by" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"color" text NOT NULL,
	"target_band" numeric(2, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "students_email_unique" UNIQUE("email"),
	CONSTRAINT "students_color_hex" CHECK ("students"."color" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "students_target_band_range" CHECK ("students"."target_band" between 0 and 9)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_generated_by_students_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attempts_student_date_idx" ON "attempts" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "attempts_date_idx" ON "attempts" USING btree ("date");--> statement-breakpoint
CREATE INDEX "attempts_tags_idx" ON "attempts" USING gin ("mistake_tags");--> statement-breakpoint
CREATE INDEX "report_snapshots_lookup_idx" ON "report_snapshots" USING btree ("kind","scope_key","period_type","period_start","period_end","generated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");