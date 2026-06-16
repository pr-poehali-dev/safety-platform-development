ALTER TABLE t_p5901577_safety_platform_deve.templates
  ADD COLUMN IF NOT EXISTS paper_size text NOT NULL DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS orientation text NOT NULL DEFAULT 'portrait';
