ALTER TABLE t_p5901577_safety_platform_deve.suspension_numbering
  ADD COLUMN IF NOT EXISTS prefix text NOT NULL DEFAULT 'АПР-2026-',
  ADD COLUMN IF NOT EXISTS start_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_reset_yearly boolean NOT NULL DEFAULT false;

INSERT INTO t_p5901577_safety_platform_deve.suspension_numbering (prefix, start_number, next_number, last_year)
SELECT 'АПР-2026-', 1, 1, 2026
WHERE NOT EXISTS (SELECT 1 FROM t_p5901577_safety_platform_deve.suspension_numbering);
