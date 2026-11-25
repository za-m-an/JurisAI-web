-- 005_user_preferences.sql: User profile preferences, avatar, ToS acceptance, and analysis reference codes

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'BD',
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS reference_code TEXT NULL,
  ADD COLUMN IF NOT EXISTS brief_summary TEXT NULL;
