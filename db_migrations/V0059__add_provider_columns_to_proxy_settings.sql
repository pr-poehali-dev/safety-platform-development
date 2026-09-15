ALTER TABLE t_p5901577_safety_platform_deve.proxy_settings
  ADD COLUMN IF NOT EXISTS provider varchar(30) NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS api_key varchar(300) DEFAULT '',
  ADD COLUMN IF NOT EXISTS api_base_url varchar(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS model varchar(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS extra_config jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE t_p5901577_safety_platform_deve.proxy_settings
  SET api_key = gemini_api_key, provider = 'gemini'
  WHERE id = 1 AND (api_key IS NULL OR api_key = '');