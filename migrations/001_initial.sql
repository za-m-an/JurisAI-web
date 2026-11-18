-- 001_initial.sql: Initial schema and seed data for Juris AI Web Service

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'business', 'common', 'lawyer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'professional_level_enum') THEN
    CREATE TYPE professional_level_enum AS ENUM ('trainee', 'attorney', 'barrister', 'advocate');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_status') THEN
    CREATE TYPE analysis_status AS ENUM ('processing', 'done', 'failed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK (email = LOWER(email)),
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'common',
  professional_level professional_level_enum NULL,
  organisation TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  token_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTE: Stores metadata and analysis OUTPUT only; never stores file bytes or extracted document text.
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status analysis_status NOT NULL DEFAULT 'processing',
  doc_name TEXT NOT NULL,
  doc_size INT NOT NULL,
  doc_mime TEXT NOT NULL,
  doc_sha256 TEXT NOT NULL,
  jurisdictions TEXT[] NOT NULL DEFAULT ARRAY['BD', 'US', 'EU']::TEXT[],
  result JSONB NULL,
  memo_markdown TEXT NULL,
  error TEXT NULL,
  rag_timings JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key_enc TEXT NULL,
  health_path TEXT NOT NULL DEFAULT '/health',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_status TEXT NULL,
  last_checked_at TIMESTAMPTZ NULL,
  config JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Seed integrations (idempotent)
INSERT INTO integrations (slug, name, base_url, api_key_enc, health_path, enabled, config)
VALUES
  ('rag', 'Juris AI RAG Service', 'http://localhost:8001', NULL, '/health', TRUE, '{}'::JSONB),
  ('courtlistener', 'CourtListener API', 'https://www.courtlistener.com/api/rest/v4/', NULL, '/health', FALSE, '{}'::JSONB),
  ('eurlex', 'EUR-Lex Legal Portal', 'https://eur-lex.europa.eu/', NULL, '/health', FALSE, '{}'::JSONB)
ON CONFLICT (slug) DO NOTHING;

-- Seed default settings (idempotent)
INSERT INTO settings (key, value)
VALUES
  ('quota.common.analyses_per_month', '3'::JSONB),
  ('quota.business.analyses_per_month', '30'::JSONB),
  ('quota.lawyer.analyses_per_month', '30'::JSONB),
  ('quota.common.chat_per_day', '30'::JSONB),
  ('quota.business.chat_per_day', '100'::JSONB),
  ('quota.lawyer.chat_per_day', '100'::JSONB),
  ('max_upload_mb', '4'::JSONB),
  ('mask_pii', 'true'::JSONB),
  ('default_jurisdictions', '["BD","US","EU"]'::JSONB)
ON CONFLICT (key) DO NOTHING;
