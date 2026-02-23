CREATE TABLE IF NOT EXISTS "billing_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "polar_customer_id" text,
  "polar_subscription_id" text,
  "product_id" text,
  "status" text DEFAULT 'inactive' NOT NULL,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "billing_subscriptions_user_id_unique" UNIQUE("user_id")
);

CREATE INDEX IF NOT EXISTS "billing_subscriptions_user_idx" ON "billing_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "billing_subscriptions_status_idx" ON "billing_subscriptions" ("status");
