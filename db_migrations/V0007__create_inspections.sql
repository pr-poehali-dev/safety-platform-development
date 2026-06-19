CREATE TABLE t_p5901577_safety_platform_deve.inspections (
  id SERIAL PRIMARY KEY,
  inspection_date DATE NOT NULL,
  contractor TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  object_name TEXT NOT NULL,
  remarks_count INTEGER NOT NULL DEFAULT 0,
  works_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  inspector_name TEXT NOT NULL,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
