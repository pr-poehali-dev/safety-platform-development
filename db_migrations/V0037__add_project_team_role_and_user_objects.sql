ALTER TABLE t_p5901577_safety_platform_deve.users DROP CONSTRAINT users_role_check;
ALTER TABLE t_p5901577_safety_platform_deve.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'specialist', 'manager', 'contractor', 'project_team'));

CREATE TABLE t_p5901577_safety_platform_deve.user_objects (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES t_p5901577_safety_platform_deve.users(id),
    object_id INTEGER NOT NULL REFERENCES t_p5901577_safety_platform_deve.objects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, object_id)
);
