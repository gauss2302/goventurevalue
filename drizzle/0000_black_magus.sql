-- pgvector must exist before any vector(768) column or hnsw index below.
-- drizzle-kit does not emit extension statements, so this line is added by hand
-- and must be kept at the top of the baseline migration.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."alert_cadence" AS ENUM('off', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."application_event_kind" AS ENUM('submitted', 'status_changed', 'internal_note', 'assigned', 'message_to_candidate', 'decision', 'candidate_message', 'candidate_withdrew');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('submitted', 'in_review', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."auto_decision" AS ENUM('approved', 'rejected', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."blocklist_kind" AS ENUM('domain', 'company_name', 'source');--> statement-breakpoint
CREATE TYPE "public"."claim_state" AS ENUM('pending', 'domain_verified', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."company_lifecycle" AS ENUM('prospect', 'contacted', 'onboarding', 'onboarded', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."company_role" AS ENUM('owner', 'admin', 'recruiter', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."company_tier" AS ENUM('free', 'growth', 'scale');--> statement-breakpoint
CREATE TYPE "public"."company_trust_state" AS ENUM('unreviewed', 'qualified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."data_request_kind" AS ENUM('export', 'delete');--> statement-breakpoint
CREATE TYPE "public"."data_request_state" AS ENUM('pending', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."experience_source" AS ENUM('candidate', 'resume_parse');--> statement-breakpoint
CREATE TYPE "public"."invite_state" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('prospect', 'pending', 'published', 'archived', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."moderation_kind" AS ENUM('new_company', 'dedupe_ambiguous', 'low_confidence', 'claim', 'user_report', 'sla_breach', 'audit_sample');--> statement-breakpoint
CREATE TYPE "public"."moderation_state" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."outreach_state" AS ENUM('queued', 'sent', 'replied', 'declined', 'won');--> statement-breakpoint
CREATE TYPE "public"."profile_visibility" AS ENUM('hidden', 'visible_to_onboarded', 'public');--> statement-breakpoint
CREATE TYPE "public"."provenance_kind" AS ENUM('ats_api', 'funding_db', 'company_claimed', 'derived', 'user_reported');--> statement-breakpoint
CREATE TYPE "public"."remote_type" AS ENUM('remote', 'hybrid', 'onsite');--> statement-breakpoint
CREATE TYPE "public"."role_family" AS ENUM('backend', 'frontend', 'fullstack', 'mobile', 'ml_ai', 'infra_devops', 'data', 'security', 'engineering_leadership', 'product_management');--> statement-breakpoint
CREATE TYPE "public"."seniority" AS ENUM('junior', 'mid', 'senior', 'staff', 'principal', 'lead');--> statement-breakpoint
CREATE TYPE "public"."sla_state" AS ENUM('pending', 'answered', 'breached', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('greenhouse', 'lever', 'ashby', 'workable', 'recruitee', 'smartrecruiters', 'rss', 'crawl');--> statement-breakpoint
CREATE TYPE "public"."startup_stage" AS ENUM('pre_seed', 'seed', 'series_a', 'series_b_plus', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."user_report_kind" AS ENUM('dead', 'wrong_salary', 'not_startup', 'spam', 'other');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"cover_letter" text,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"assignee_member_id" text,
	"first_response_at" timestamp,
	"sla_due_at" timestamp NOT NULL,
	"sla_state" "sla_state" DEFAULT 'pending' NOT NULL,
	"reminded_at" timestamp,
	"breached_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "application_event" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"kind" "application_event_kind" NOT NULL,
	"actor_user_id" text,
	"actor_member_id" text,
	"is_candidate_visible" boolean NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status",
	"body" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_quota" (
	"user_id" text NOT NULL,
	"window_start" date NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"limit_per_window" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text,
	"provider" text DEFAULT 'polar' NOT NULL,
	"external_id" text,
	"product_id" text,
	"status" text NOT NULL,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocklist" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "blocklist_kind" NOT NULL,
	"pattern" text NOT NULL,
	"reason" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_embedding" (
	"user_id" text PRIMARY KEY NOT NULL,
	"embedding" vector(768) NOT NULL,
	"model" text NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_experience" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_name" text NOT NULL,
	"company_stage_at_join" "startup_stage",
	"team_size_at_join" integer,
	"title" text NOT NULL,
	"started_at" date,
	"ended_at" date,
	"was_first_in_function" boolean,
	"source" "experience_source" DEFAULT 'candidate' NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"headline" text,
	"bio" text,
	"years_experience" integer,
	"role_families" "role_family"[],
	"seniority" "seniority",
	"tech_stack" text[],
	"timezone" text,
	"locations" text[],
	"needs_visa" boolean,
	"open_to" "remote_type",
	"salary_expectation_min" integer,
	"preferred_stages" "startup_stage"[],
	"resume_r2_key" text,
	"resume_uploaded_at" timestamp,
	"resume_parsed" jsonb,
	"resume_parsed_at" timestamp,
	"resume_parse_model" text,
	"resume_confirmed_at" timestamp,
	"visibility" "profile_visibility" DEFAULT 'hidden' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"description" text,
	"logo_r2_key" text,
	"website" text,
	"hq_location" text,
	"remote_policy" text,
	"team_size" integer,
	"team_size_updated_at" timestamp,
	"stage" "startup_stage" DEFAULT 'unknown' NOT NULL,
	"founded_year" integer,
	"tier" "company_tier" DEFAULT 'free' NOT NULL,
	"ats_provider" "source_kind",
	"ats_external_id" text,
	"trust_state" "company_trust_state" DEFAULT 'unreviewed' NOT NULL,
	"trust_reason" text,
	"trust_reviewed_by" text,
	"trust_reviewed_at" timestamp,
	"lifecycle" "company_lifecycle" DEFAULT 'prospect' NOT NULL,
	"sla_response_days" integer,
	"sla_accepted_at" timestamp,
	"sla_accepted_by_user_id" text,
	"sla_terms_version" text,
	"domain_verified_at" timestamp,
	"response_rate_30d" numeric(5, 4),
	"median_first_response_hours" integer,
	"sla_breach_count" integer DEFAULT 0 NOT NULL,
	"suspended_for_sla_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_claim" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"work_email" text NOT NULL,
	"state" "claim_state" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_estimate" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"key" text NOT NULL,
	"value_numeric" numeric(16, 4),
	"method" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"confidence" "confidence" NOT NULL,
	"as_of" timestamp NOT NULL,
	"is_disputed" boolean DEFAULT false NOT NULL,
	"disputed_by_company_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_funding" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"round_type" text NOT NULL,
	"amount_usd" numeric(16, 2),
	"announced_at" date,
	"lead_investor" text,
	"investors" jsonb,
	"source_kind" "provenance_kind" NOT NULL,
	"source_url" text,
	"as_of" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_headcount" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"observed_at" timestamp NOT NULL,
	"headcount" integer NOT NULL,
	"source_kind" "provenance_kind" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "company_role" NOT NULL,
	"token" text NOT NULL,
	"state" "invite_state" DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" text,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "company_member" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "company_role" NOT NULL,
	"title" text,
	"work_email" text,
	"work_email_verified_at" timestamp,
	"is_sla_contact" boolean DEFAULT false NOT NULL,
	"notify_on_new_application" boolean DEFAULT true NOT NULL,
	"invited_by_user_id" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_signal" (
	"company_id" text PRIMARY KEY NOT NULL,
	"months_since_last_raise" integer,
	"months_since_last_raise_as_of" timestamp,
	"team_growth_rate_90d" numeric(6, 4),
	"team_growth_rate_90d_as_of" timestamp,
	"open_roles_count" integer,
	"open_roles_count_as_of" timestamp,
	"median_days_to_first_response" integer,
	"median_days_to_first_response_as_of" timestamp,
	"hiring_mix" jsonb,
	"hiring_mix_as_of" timestamp,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "data_request_kind" NOT NULL,
	"state" "data_request_state" DEFAULT 'pending' NOT NULL,
	"export_r2_key" text,
	"note" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ingest_run" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"fetched" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"errors" jsonb
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"title" text NOT NULL,
	"role_family" "role_family",
	"seniority" "seniority",
	"description_md" text,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text,
	"salary_is_public" boolean DEFAULT false NOT NULL,
	"equity_min" numeric(8, 5),
	"equity_max" numeric(8, 5),
	"hiring_manager_member_id" text,
	"remote_type" "remote_type",
	"timezones" text[],
	"locations" text[],
	"visa_sponsorship" boolean,
	"tech_stack" text[],
	"status" "job_status" DEFAULT 'prospect' NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_verified_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"archived_at" timestamp,
	"apply_url" text,
	"source_id" text,
	"source_external_id" text,
	"canonical_job_id" text,
	"content_hash" text NOT NULL,
	"field_confidence" jsonb,
	"auto_decision" "auto_decision",
	"auto_decision_rule" text,
	"auto_decision_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_embedding" (
	"job_id" text PRIMARY KEY NOT NULL,
	"embedding" vector(768) NOT NULL,
	"model" text NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_view" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"user_id" text,
	"session_hash" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_item" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "moderation_kind" NOT NULL,
	"company_id" text,
	"job_id" text,
	"payload" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"state" "moderation_state" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"curator_id" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "outreach" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"state" "outreach_state" DEFAULT 'queued' NOT NULL,
	"hiring_intent_score" numeric(6, 3),
	"contacted_at" timestamp,
	"replied_at" timestamp,
	"note" text,
	"owner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_posting" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"external_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_job" (
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_search" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"alert_cadence" "alert_cadence" DEFAULT 'off' NOT NULL,
	"last_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "source_kind" NOT NULL,
	"config" jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"health" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_report" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"user_id" text,
	"kind" "user_report_kind" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_assignee_member_id_company_member_id_fk" FOREIGN KEY ("assignee_member_id") REFERENCES "public"."company_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_event" ADD CONSTRAINT "application_event_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_event" ADD CONSTRAINT "application_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_event" ADD CONSTRAINT "application_event_actor_member_id_company_member_id_fk" FOREIGN KEY ("actor_member_id") REFERENCES "public"."company_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_quota" ADD CONSTRAINT "application_quota_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocklist" ADD CONSTRAINT "blocklist_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_embedding" ADD CONSTRAINT "candidate_embedding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_experience" ADD CONSTRAINT "candidate_experience_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_profile" ADD CONSTRAINT "candidate_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_trust_reviewed_by_user_id_fk" FOREIGN KEY ("trust_reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_sla_accepted_by_user_id_user_id_fk" FOREIGN KEY ("sla_accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_claim" ADD CONSTRAINT "company_claim_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_claim" ADD CONSTRAINT "company_claim_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_estimate" ADD CONSTRAINT "company_estimate_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_funding" ADD CONSTRAINT "company_funding_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_headcount" ADD CONSTRAINT "company_headcount_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invite" ADD CONSTRAINT "company_invite_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invite" ADD CONSTRAINT "company_invite_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invite" ADD CONSTRAINT "company_invite_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_member" ADD CONSTRAINT "company_member_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_member" ADD CONSTRAINT "company_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_member" ADD CONSTRAINT "company_member_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_signal" ADD CONSTRAINT "company_signal_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_request" ADD CONSTRAINT "data_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingest_run" ADD CONSTRAINT "ingest_run_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_hiring_manager_member_id_company_member_id_fk" FOREIGN KEY ("hiring_manager_member_id") REFERENCES "public"."company_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_embedding" ADD CONSTRAINT "job_embedding_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_view" ADD CONSTRAINT "job_view_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_view" ADD CONSTRAINT "job_view_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_item" ADD CONSTRAINT "moderation_item_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_item" ADD CONSTRAINT "moderation_item_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_item" ADD CONSTRAINT "moderation_item_curator_id_user_id_fk" FOREIGN KEY ("curator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_posting" ADD CONSTRAINT "raw_posting_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_job" ADD CONSTRAINT "saved_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_job" ADD CONSTRAINT "saved_job_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search" ADD CONSTRAINT "saved_search_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "application_job_user_idx" ON "application" USING btree ("job_id","user_id");--> statement-breakpoint
CREATE INDEX "application_user_id_idx" ON "application" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "application_sla_state_due_idx" ON "application" USING btree ("sla_state","sla_due_at");--> statement-breakpoint
CREATE INDEX "application_assignee_sla_idx" ON "application" USING btree ("assignee_member_id","sla_state");--> statement-breakpoint
CREATE INDEX "application_event_application_idx" ON "application_event" USING btree ("application_id","occurred_at");--> statement-breakpoint
CREATE INDEX "application_event_response_idx" ON "application_event" USING btree ("application_id","occurred_at") WHERE "application_event"."kind" IN ('message_to_candidate', 'decision');--> statement-breakpoint
CREATE INDEX "application_event_actor_member_idx" ON "application_event" USING btree ("actor_member_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "application_quota_user_window_idx" ON "application_quota" USING btree ("user_id","window_start");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_user_id_idx" ON "billing_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_external_id_idx" ON "billing_subscriptions" USING btree ("provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blocklist_kind_pattern_idx" ON "blocklist" USING btree ("kind","pattern");--> statement-breakpoint
CREATE INDEX "candidate_embedding_hnsw_idx" ON "candidate_embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "candidate_experience_user_id_idx" ON "candidate_experience" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "candidate_experience_confirmed_idx" ON "candidate_experience" USING btree ("user_id") WHERE "candidate_experience"."confirmed_at" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "company_domain_idx" ON "company" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "company_lifecycle_idx" ON "company" USING btree ("lifecycle");--> statement-breakpoint
CREATE INDEX "company_trust_state_idx" ON "company" USING btree ("trust_state");--> statement-breakpoint
CREATE INDEX "company_stage_idx" ON "company" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "company_claim_company_id_idx" ON "company_claim" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_estimate_company_key_idx" ON "company_estimate" USING btree ("company_id","key");--> statement-breakpoint
CREATE INDEX "company_funding_company_id_idx" ON "company_funding" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_headcount_company_observed_idx" ON "company_headcount" USING btree ("company_id","observed_at");--> statement-breakpoint
CREATE INDEX "company_invite_company_id_idx" ON "company_invite" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_invite_company_email_idx" ON "company_invite" USING btree ("company_id","email") WHERE "company_invite"."state" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "company_member_company_user_idx" ON "company_member" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX "company_member_user_id_idx" ON "company_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "company_member_company_role_idx" ON "company_member" USING btree ("company_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "company_member_sla_contact_idx" ON "company_member" USING btree ("company_id") WHERE "company_member"."is_sla_contact" AND "company_member"."removed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "data_request_state_idx" ON "data_request" USING btree ("state","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "data_request_user_kind_open_idx" ON "data_request" USING btree ("user_id","kind") WHERE "data_request"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "ingest_run_source_id_idx" ON "ingest_run" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "job_company_id_idx" ON "job" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "job_status_idx" ON "job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_role_family_idx" ON "job" USING btree ("role_family");--> statement-breakpoint
CREATE INDEX "job_last_verified_at_idx" ON "job" USING btree ("last_verified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_external_idx" ON "job" USING btree ("source_id","source_external_id");--> statement-breakpoint
CREATE INDEX "job_content_hash_idx" ON "job" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "job_embedding_hnsw_idx" ON "job_embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "job_view_job_id_occurred_idx" ON "job_view" USING btree ("job_id","occurred_at");--> statement-breakpoint
CREATE INDEX "moderation_item_state_priority_idx" ON "moderation_item" USING btree ("state","priority");--> statement-breakpoint
CREATE INDEX "moderation_item_kind_idx" ON "moderation_item" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_company_id_idx" ON "outreach" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "outreach_state_score_idx" ON "outreach" USING btree ("state","hiring_intent_score");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_posting_source_external_idx" ON "raw_posting" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_job_user_job_idx" ON "saved_job" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "saved_search_user_id_idx" ON "saved_search" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "source_kind_idx" ON "source" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "user_report_job_id_idx" ON "user_report" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");