ALTER TABLE t_p5901577_safety_platform_deve.proxy_settings
    ADD COLUMN IF NOT EXISTS paid_proxy_port VARCHAR(10) DEFAULT '',
    ADD COLUMN IF NOT EXISTS paid_proxy_protocol VARCHAR(10) DEFAULT 'http';