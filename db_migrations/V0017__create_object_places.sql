CREATE TABLE t_p5901577_safety_platform_deve.object_places (
    id SERIAL PRIMARY KEY,
    object_id INTEGER NOT NULL REFERENCES t_p5901577_safety_platform_deve.objects(id),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);