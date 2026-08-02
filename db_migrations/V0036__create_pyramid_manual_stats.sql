CREATE TABLE t_p5901577_safety_platform_deve.pyramid_manual_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  danger_actions INTEGER NOT NULL DEFAULT 0,
  suspended_works INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO t_p5901577_safety_platform_deve.pyramid_manual_stats (id, danger_actions, suspended_works)
VALUES (1, 0, 0);