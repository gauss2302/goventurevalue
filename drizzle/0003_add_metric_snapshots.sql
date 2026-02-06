DO $$
BEGIN
  CREATE TYPE "startup_stage" AS ENUM ('idea', 'early_growth', 'scale');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "metric_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "stage" "startup_stage" NOT NULL,
  "metric_key" text NOT NULL,
  "value" numeric(18, 4) NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "metric_snapshots_user_period_idx" ON "metric_snapshots" ("user_id", "period_end");
CREATE INDEX IF NOT EXISTS "metric_snapshots_stage_idx" ON "metric_snapshots" ("stage");
