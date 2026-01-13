CREATE TYPE "public"."scenario_type" AS ENUM('conservative', 'base', 'optimistic');--> statement-breakpoint
CREATE TABLE "financial_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"description" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_sizing" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"tam" integer NOT NULL,
	"sam" integer NOT NULL,
	"som" integer[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_projections" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"scenario_type" "scenario_type" NOT NULL,
	"year" integer NOT NULL,
	"users" integer NOT NULL,
	"farmers" integer NOT NULL,
	"mau" integer NOT NULL,
	"new_users" integer NOT NULL,
	"platform_revenue" integer NOT NULL,
	"farmer_rev_share" integer NOT NULL,
	"b2b_revenue" integer NOT NULL,
	"total_revenue" integer NOT NULL,
	"hosting_costs" integer NOT NULL,
	"payment_processing" integer NOT NULL,
	"customer_support" integer NOT NULL,
	"cogs" integer NOT NULL,
	"gross_profit" integer NOT NULL,
	"gross_margin" numeric(5, 2) NOT NULL,
	"personnel" integer NOT NULL,
	"employees" integer NOT NULL,
	"marketing" integer NOT NULL,
	"rd" integer NOT NULL,
	"gna" integer NOT NULL,
	"opex" integer NOT NULL,
	"ebitda" integer NOT NULL,
	"ebitda_margin" numeric(5, 2) NOT NULL,
	"capex" integer NOT NULL,
	"depreciation" integer NOT NULL,
	"ebit" integer NOT NULL,
	"taxes" integer NOT NULL,
	"net_income" integer NOT NULL,
	"accounts_receivable" integer NOT NULL,
	"accounts_payable" integer NOT NULL,
	"working_capital" integer NOT NULL,
	"operating_cf" integer NOT NULL,
	"investing_cf" integer NOT NULL,
	"free_cash_flow" integer NOT NULL,
	"ltv" integer NOT NULL,
	"ltv_cac" numeric(5, 2) NOT NULL,
	"payback_months" integer NOT NULL,
	"revenue_per_employee" integer NOT NULL,
	"market_share" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"scenario_type" "scenario_type" NOT NULL,
	"user_growth" numeric(5, 4) NOT NULL,
	"arpu" numeric(10, 2) NOT NULL,
	"churn_rate" numeric(5, 4) NOT NULL,
	"farmer_growth" numeric(5, 4) NOT NULL,
	"cac" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"start_users" integer DEFAULT 1000 NOT NULL,
	"start_farmers" integer DEFAULT 50 NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0.12' NOT NULL,
	"discount_rate" numeric(5, 4) DEFAULT '0.30' NOT NULL,
	"terminal_growth" numeric(5, 4) DEFAULT '0.03' NOT NULL,
	"safety_buffer" integer DEFAULT 50000 NOT NULL,
	"personnel_by_year" integer[] DEFAULT '{36000,72000,144000,216000,288000}' NOT NULL,
	"employees_by_year" integer[] DEFAULT '{2,4,8,12,16}' NOT NULL,
	"capex_by_year" integer[] DEFAULT '{15000,10000,20000,15000,10000}' NOT NULL,
	"depreciation_by_year" integer[] DEFAULT '{3750,6250,11250,15000,13750}' NOT NULL,
	"projection_years" integer[] DEFAULT '{2025,2026,2027,2028,2029}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "market_sizing" ADD CONSTRAINT "market_sizing_model_id_financial_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."financial_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_projections" ADD CONSTRAINT "model_projections_model_id_financial_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."financial_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_scenarios" ADD CONSTRAINT "model_scenarios_model_id_financial_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."financial_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_settings" ADD CONSTRAINT "model_settings_model_id_financial_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."financial_models"("id") ON DELETE cascade ON UPDATE no action;