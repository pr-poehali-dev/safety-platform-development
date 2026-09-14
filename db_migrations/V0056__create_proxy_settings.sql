CREATE TABLE IF NOT EXISTS t_p5901577_safety_platform_deve.proxy_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    mode VARCHAR(20) NOT NULL DEFAULT 'proxmint',
    paid_proxy_url VARCHAR(500) DEFAULT '',
    paid_proxy_login VARCHAR(200) DEFAULT '',
    paid_proxy_password VARCHAR(200) DEFAULT '',
    updated_by VARCHAR(200),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO t_p5901577_safety_platform_deve.proxy_settings (id, mode)
VALUES (1, 'proxmint')
ON CONFLICT (id) DO NOTHING;