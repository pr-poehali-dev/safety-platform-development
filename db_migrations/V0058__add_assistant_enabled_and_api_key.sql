ALTER TABLE t_p5901577_safety_platform_deve.proxy_settings
    ADD COLUMN IF NOT EXISTS assistant_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(200) DEFAULT '';