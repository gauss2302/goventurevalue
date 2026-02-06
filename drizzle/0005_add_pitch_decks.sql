DO $$
BEGIN
  CREATE TYPE "ai_provider" AS ENUM ('openai', 'gemini');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "pitch_deck_status" AS ENUM ('draft', 'generating', 'ready', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "pitch_decks" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "model_id" integer REFERENCES "financial_models"("id") ON DELETE set null,
  "title" text NOT NULL,
  "startup_name" text NOT NULL,
  "one_liner" text,
  "audience" text DEFAULT 'investors' NOT NULL,
  "language" text DEFAULT 'en' NOT NULL,
  "currency" text DEFAULT 'USD' NOT NULL,
  "provider" "ai_provider" NOT NULL,
  "provider_model" text NOT NULL,
  "status" "pitch_deck_status" DEFAULT 'draft' NOT NULL,
  "brief" jsonb NOT NULL,
  "slides" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "generation_meta" jsonb,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pitch_decks_user_idx" ON "pitch_decks" ("user_id");
CREATE INDEX IF NOT EXISTS "pitch_decks_model_idx" ON "pitch_decks" ("model_id");
CREATE INDEX IF NOT EXISTS "pitch_decks_updated_idx" ON "pitch_decks" ("updated_at");
