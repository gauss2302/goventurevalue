ALTER TABLE "pitch_decks" ADD COLUMN IF NOT EXISTS "template" text DEFAULT 'minimal' NOT NULL;
