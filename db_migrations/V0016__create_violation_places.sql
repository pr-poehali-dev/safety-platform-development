CREATE TABLE t_p5901577_safety_platform_deve.violation_places (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);