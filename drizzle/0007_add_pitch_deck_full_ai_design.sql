-- Design mode and AI style for Full AI slides
DO $$ BEGIN
  CREATE TYPE "pitch_deck_design_mode" AS ENUM('manual_template', 'ai_designed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "pitch_decks" ADD COLUMN IF NOT EXISTS "design_mode" "pitch_deck_design_mode" DEFAULT 'manual_template' NOT NULL;
ALTER TABLE "pitch_decks" ADD COLUMN IF NOT EXISTS "ai_style_input" jsonb;
ALTER TABLE "pitch_decks" ADD COLUMN IF NOT EXISTS "ai_style_instructions" jsonb;
