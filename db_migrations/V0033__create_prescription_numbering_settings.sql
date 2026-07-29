CREATE TABLE t_p5901577_safety_platform_deve.prescription_numbering (
    id SERIAL PRIMARY KEY,
    prefix TEXT NOT NULL DEFAULT '',
    start_number INTEGER NOT NULL DEFAULT 1,
    next_number INTEGER NOT NULL DEFAULT 1,
    auto_reset_yearly BOOLEAN NOT NULL DEFAULT FALSE,
    last_year INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p5901577_safety_platform_deve.prescription_numbering (prefix, start_number, next_number, auto_reset_yearly)
VALUES ('', 1, 1, FALSE);