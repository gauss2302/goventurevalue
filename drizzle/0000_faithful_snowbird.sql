CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `billing_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`polar_customer_id` text,
	`polar_subscription_id` text,
	`product_id` text,
	`status` text DEFAULT 'inactive' NOT NULL,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_subscriptions_user_id_unique` ON `billing_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `billing_subscriptions_user_idx` ON `billing_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `billing_subscriptions_status_idx` ON `billing_subscriptions` (`status`);--> statement-breakpoint
CREATE TABLE `financial_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`company_name` text,
	`description` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`business_model_type` text,
	`stage` text,
	`founded_at` text,
	`industry` text,
	`last_round_size` text,
	`last_round_valuation` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `market_sizing` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`tam` integer NOT NULL,
	`tam_description` text DEFAULT '',
	`sam` integer NOT NULL,
	`sam_description` text DEFAULT '',
	`som` text NOT NULL,
	`som_description` text DEFAULT '',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `metric_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`stage` text NOT NULL,
	`metric_key` text NOT NULL,
	`value` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `metric_snapshots_user_period_idx` ON `metric_snapshots` (`user_id`,`period_end`);--> statement-breakpoint
CREATE INDEX `metric_snapshots_stage_idx` ON `metric_snapshots` (`stage`);--> statement-breakpoint
CREATE TABLE `model_cohorts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`cohort_month` text NOT NULL,
	`cohort_size` integer NOT NULL,
	`retention_by_month` text,
	`revenue_by_month` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_cohorts_model_cohort_month_idx` ON `model_cohorts` (`model_id`,`cohort_month`);--> statement-breakpoint
CREATE INDEX `model_cohorts_model_id_idx` ON `model_cohorts` (`model_id`);--> statement-breakpoint
CREATE TABLE `model_fundraising` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`target_raise` text,
	`pre_money_valuation` text,
	`use_of_funds` text,
	`runway_target` integer,
	`planned_close` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_fundraising_model_id_unique` ON `model_fundraising` (`model_id`);--> statement-breakpoint
CREATE TABLE `model_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`users_total` text,
	`dau` text,
	`mau` text,
	`growth_rate` text,
	`activation_rate` text,
	`retention_rate` text,
	`churn_rate` text,
	`mrr` text,
	`arr` text,
	`arpu` text,
	`revenue_growth_rate` text,
	`expansion_revenue` text,
	`contraction_revenue` text,
	`cac` text,
	`ltv` text,
	`ltv_cac` text,
	`payback_period_months` text,
	`conversion_rate` text,
	`cpl` text,
	`sales_cycle_length_days` text,
	`win_rate` text,
	`dau_mau_ratio` text,
	`feature_adoption_rate` text,
	`time_to_value_days` text,
	`nps` text,
	`burn_rate` text,
	`runway_months` text,
	`gross_margin` text,
	`operating_margin` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `model_monthly_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`month` text NOT NULL,
	`mrr` text,
	`new_mrr` text,
	`expansion_mrr` text,
	`contraction_mrr` text,
	`churned_mrr` text,
	`customers` integer,
	`new_customers` integer,
	`churned_customers` integer,
	`gmv` text,
	`revenue` text,
	`gross_profit` text,
	`opex` text,
	`cash_balance` text,
	`headcount` integer,
	`marketing_spend` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_monthly_metrics_model_month_idx` ON `model_monthly_metrics` (`model_id`,`month`);--> statement-breakpoint
CREATE INDEX `model_monthly_metrics_model_id_idx` ON `model_monthly_metrics` (`model_id`);--> statement-breakpoint
CREATE TABLE `model_projections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`scenario_type` text NOT NULL,
	`year` integer NOT NULL,
	`users` integer NOT NULL,
	`farmers` integer NOT NULL,
	`mau` integer NOT NULL,
	`new_users` integer NOT NULL,
	`platform_revenue` integer NOT NULL,
	`farmer_rev_share` integer NOT NULL,
	`b2b_revenue` integer NOT NULL,
	`total_revenue` integer NOT NULL,
	`hosting_costs` integer NOT NULL,
	`payment_processing` integer NOT NULL,
	`customer_support` integer NOT NULL,
	`cogs` integer NOT NULL,
	`gross_profit` integer NOT NULL,
	`gross_margin` text NOT NULL,
	`personnel` integer NOT NULL,
	`employees` integer NOT NULL,
	`marketing` integer NOT NULL,
	`rd` integer NOT NULL,
	`gna` integer NOT NULL,
	`opex` integer NOT NULL,
	`ebitda` integer NOT NULL,
	`ebitda_margin` text NOT NULL,
	`capex` integer NOT NULL,
	`depreciation` integer NOT NULL,
	`ebit` integer NOT NULL,
	`taxes` integer NOT NULL,
	`net_income` integer NOT NULL,
	`accounts_receivable` integer NOT NULL,
	`accounts_payable` integer NOT NULL,
	`working_capital` integer NOT NULL,
	`operating_cf` integer NOT NULL,
	`investing_cf` integer NOT NULL,
	`free_cash_flow` integer NOT NULL,
	`ltv` integer NOT NULL,
	`ltv_cac` text NOT NULL,
	`payback_months` integer NOT NULL,
	`revenue_per_employee` integer NOT NULL,
	`market_share` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `model_scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`scenario_type` text NOT NULL,
	`user_growth` text NOT NULL,
	`arpu` text NOT NULL,
	`churn_rate` text NOT NULL,
	`farmer_growth` text NOT NULL,
	`cac` text NOT NULL,
	`revenue_growth_rate` text,
	`gross_margin_target` text,
	`expansion_rate` text,
	`take_rate` text,
	`gmv_growth` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `model_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`start_users` integer DEFAULT 1000 NOT NULL,
	`start_farmers` integer DEFAULT 50 NOT NULL,
	`tax_rate` text DEFAULT '0.12' NOT NULL,
	`discount_rate` text DEFAULT '0.30' NOT NULL,
	`terminal_growth` text DEFAULT '0.03' NOT NULL,
	`safety_buffer` integer DEFAULT 50000 NOT NULL,
	`personnel_by_year` text DEFAULT '[36000,72000,144000,216000,288000]' NOT NULL,
	`employees_by_year` text DEFAULT '[2,4,8,12,16]' NOT NULL,
	`capex_by_year` text DEFAULT '[15000,10000,20000,15000,10000]' NOT NULL,
	`depreciation_by_year` text DEFAULT '[3750,6250,11250,15000,13750]' NOT NULL,
	`projection_years` text DEFAULT '[2025,2026,2027,2028,2029]' NOT NULL,
	`monthly_burn_rate` text,
	`current_cash` text,
	`revenue_multiple` text,
	`arr_multiple` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pitch_decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`model_id` integer,
	`title` text NOT NULL,
	`startup_name` text NOT NULL,
	`one_liner` text,
	`audience` text DEFAULT 'investors' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`provider` text NOT NULL,
	`provider_model` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`brief` text NOT NULL,
	`slides` text DEFAULT '[]' NOT NULL,
	`template` text DEFAULT 'minimal' NOT NULL,
	`design_mode` text DEFAULT 'manual_template' NOT NULL,
	`ai_style_input` text,
	`ai_style_instructions` text,
	`generation_meta` text,
	`last_error` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`model_id`) REFERENCES `financial_models`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `pitch_decks_user_idx` ON `pitch_decks` (`user_id`);--> statement-breakpoint
CREATE INDEX `pitch_decks_model_idx` ON `pitch_decks` (`model_id`);--> statement-breakpoint
CREATE INDEX `pitch_decks_updated_idx` ON `pitch_decks` (`updated_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);