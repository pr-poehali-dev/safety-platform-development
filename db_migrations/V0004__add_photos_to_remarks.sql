ALTER TABLE t_p5901577_safety_platform_deve.remarks
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;