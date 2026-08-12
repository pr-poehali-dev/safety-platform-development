CREATE TABLE t_p5901577_safety_platform_deve.inspection_comments (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES t_p5901577_safety_platform_deve.inspections(id),
    author_login VARCHAR(255),
    author_name VARCHAR(255),
    author_role VARCHAR(100),
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspection_comments_inspection_id ON t_p5901577_safety_platform_deve.inspection_comments(inspection_id);