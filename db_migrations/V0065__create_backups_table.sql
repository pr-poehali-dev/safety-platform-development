CREATE TABLE IF NOT EXISTS t_p5901577_safety_platform_deve.backups (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    created_by_name TEXT,
    sections TEXT[] NOT NULL,
    counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    s3_key TEXT NOT NULL
);