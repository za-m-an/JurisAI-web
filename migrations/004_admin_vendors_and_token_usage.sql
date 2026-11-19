-- 004_admin_vendors_and_token_usage.sql: Multi-vendor LLM support (AWS, OpenRouter) and per-user token tracking
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS input_tokens INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens INT DEFAULT 0;

-- Backfill estimated tokens for past analyses rows
UPDATE analyses
SET input_tokens = COALESCE(input_tokens, GREATEST(250, CEIL(doc_size / 4))),
    output_tokens = COALESCE(output_tokens, GREATEST(800, CEIL(COALESCE(LENGTH(memo_markdown), 3500) / 4))),
    total_tokens = COALESCE(total_tokens, GREATEST(1050, CEIL(doc_size / 4) + CEIL(COALESCE(LENGTH(memo_markdown), 3500) / 4)))
WHERE total_tokens = 0 OR total_tokens IS NULL;

-- Seed OpenRouter and AWS integrations (idempotent)
INSERT INTO integrations (slug, name, base_url, api_key_enc, health_path, enabled, config)
VALUES
  ('openrouter', 'OpenRouter Unified API (Multi-Vendor)', 'https://openrouter.ai/api/v1', NULL, '/models', FALSE, '{"models":["anthropic/claude-3.5-sonnet","openai/gpt-4o","deepseek/deepseek-chat","meta-llama/llama-3.3-70b-instruct"]}'::JSONB),
  ('aws', 'AWS Bedrock / SageMaker', 'https://bedrock-runtime.us-east-1.amazonaws.com', NULL, '/models', FALSE, '{"models":["anthropic.claude-3-5-sonnet-20241022-v2:0","amazon.titan-embed-text-v2:0"]}'::JSONB)
ON CONFLICT (slug) DO NOTHING;

-- Seed token optimization settings
INSERT INTO settings (key, value)
VALUES
  ('ai.token_optimization_enabled', 'true'::JSONB),
  ('ai.max_doc_chars', '150000'::JSONB)
ON CONFLICT (key) DO NOTHING;
