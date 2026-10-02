CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'default' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_color_valid" CHECK ("notes"."color" in ('default','yellow','green','blue','pink','purple','orange','teal')),
	CONSTRAINT "notes_not_empty" CHECK (length("notes"."title") + length("notes"."body") > 0),
	CONSTRAINT "notes_size" CHECK (length("notes"."title") <= 200 and length("notes"."body") <= 20000)
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_student_updated_idx" ON "notes" USING btree ("student_id","updated_at");--> statement-breakpoint
CREATE INDEX "notes_shared_idx" ON "notes" USING btree ("shared");