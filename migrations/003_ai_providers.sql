-- 003_ai_providers.sql: Seed supported AI providers and model routing settings
INSERT INTO integrations (slug, name, base_url, api_key_enc, health_path, enabled, config)
VALUES
  ('anthropic', 'Anthropic Claude (Primary / Auxiliary)', 'https://api.anthropic.com', NULL, '/v1/models', TRUE, '{"models":["claude-sonnet-5-5","claude-haiku-5-5","claude-3-5-sonnet-20241022","claude-3-5-haiku-20241022"]}'::JSONB),
  ('openai', 'OpenAI GPT (Primary / Auxiliary)', 'https://api.openai.com', NULL, '/v1/models', TRUE, '{"models":["gpt-4o","gpt-4o-mini","o3-mini","gpt-4-turbo"]}'::JSONB),
  ('deepseek', 'DeepSeek AI (Primary / Auxiliary)', 'https://api.deepseek.com', NULL, '/models', TRUE, '{"models":["deepseek-chat","deepseek-reasoner"]}'::JSONB),
  ('custom-llm', 'Custom / Self-Hosted OpenAI-Compatible', 'http://localhost:11434/v1', NULL, '/models', FALSE, '{"models":["llama3.3","mistral-large","qwen2.5"]}'::JSONB)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO settings (key, value)
VALUES
  ('ai.provider_main', '"anthropic"'::JSONB),
  ('ai.model_main', '"claude-sonnet-5-5"'::JSONB),
  ('ai.provider_rag', '"openai"'::JSONB),
  ('ai.model_rag', '"gpt-4o-mini"'::JSONB)
ON CONFLICT (key) DO NOTHING;
