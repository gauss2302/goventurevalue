CREATE TYPE "public"."business_model_type" AS ENUM('saas_subscription', 'marketplace', 'usage_based', 'ecommerce', 'other');--> statement-breakpoint
CREATE TABLE "model_cohorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"cohort_month" date NOT NULL,
	"cohort_size" integer NOT NULL,
	"retention_by_month" jsonb,
	"revenue_by_month" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_fundraising" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"target_raise" numeric(18, 2),
	"pre_money_valuation" numeric(18, 2),
	"use_of_funds" jsonb,
	"runway_target" integer,
	"planned_close" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_fundraising_model_id_unique" UNIQUE("model_id")
);
--> statement-breakpoint
CREATE TABLE "model_monthly_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"month" date NOT NULL,
	"mrr" numeric(18, 4),
	"new_mrr" numeric(18, 4),
	"expansion_mrr" numeric(18, 4),
	"contraction_mrr" numeric(18, 4),
	"churned_mrr" numeric(18, 4),
	"customers" integer,
	"new_customers" integer,
	"churned_customers" integer,
	"gmv" numeric(18, 4),
	"revenue" numeric(18, 4),
	"gross_profit" numeric(18, 4),
	"opex" numeric(18, 4),
	"cash_balance" numeric(18, 4),
	"headcount" integer,
	"marketing_spend" numeric(18, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_models" ADD COLUMN "business_model_type" "business_model_type";--> statement-breakpoint
ALTER TABLE "financial_models" ADD COLUMN "stage" "startup_stage";--> statement-breakpoint
ALTER TABLE "financial_models" ADD COLUMN "founded_at" date;--> statement-breakpoint
ALTER TABLE "financial_models" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "financial_models" ADD COLUMN "last_round_size" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "financial_models" ADD COLUMN "last_round_valuation" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "model_scenarios" ADD COLUMN "revenue_growth_rate" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "model_scenarios" ADD COLUMN "gross_margin_target" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "model_scenarios" ADD COLUMN "expansion_rate" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "model_scenarios" ADD COLUMN "take_rate" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "model_scenarios" ADD COLUMN "gmv_growth" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "model_settings" ADD COLUMN "monthly_burn_rate" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "model_settings" ADD COLUMN "current_cash" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "model_settings" ADD COLUMN "revenue_multiple" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "model_settings" ADD COLUMN "arr_multiple" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "model_cohorts" ADD CONSTRAINT "model_cohorts_model_id_financial_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."financial_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_fundraising" ADD CONSTRAINT "model_fundraising_model_id_financial_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."financial_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_monthly_metrics" ADD CONSTRAINT "model_monthly_metrics_model_id_financial_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."financial_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "model_cohorts_model_cohort_month_idx" ON "model_cohorts" USING btree ("model_id","cohort_month");--> statement-breakpoint
CREATE INDEX "model_cohorts_model_id_idx" ON "model_cohorts" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_monthly_metrics_model_month_idx" ON "model_monthly_metrics" USING btree ("model_id","month");--> statement-breakpoint
CREATE INDEX "model_monthly_metrics_model_id_idx" ON "model_monthly_metrics" USING btree ("model_id");