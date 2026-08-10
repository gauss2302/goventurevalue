CREATE TYPE "public"."notification_kind" AS ENUM('company_replied', 'reply_deadline_missed', 'reply_due_soon', 'reply_overdue', 'sla_warning', 'company_suspended');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"application_id" text,
	"company_id" text,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"email_sent_at" timestamp,
	"email_error" text
);
--> statement-breakpoint
CREATE TABLE "sla_warning" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"window_start" date NOT NULL,
	"level" integer NOT NULL,
	"breach_count" integer NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "sla_measured_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "sla_warning_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "sla_marked_at" timestamp;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_warning" ADD CONSTRAINT "sla_warning_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_dedupe_key_idx" ON "notification" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "notification_user_created_idx" ON "notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_user_unread_idx" ON "notification" USING btree ("user_id") WHERE "notification"."read_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sla_warning_company_window_idx" ON "sla_warning" USING btree ("company_id","window_start");--> statement-breakpoint
CREATE INDEX "sla_warning_company_issued_idx" ON "sla_warning" USING btree ("company_id","issued_at");