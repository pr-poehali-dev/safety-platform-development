-- Приостановки: таблица актов о приостановке работ
CREATE TABLE IF NOT EXISTS t_p5901577_safety_platform_deve.suspensions (
  id text PRIMARY KEY,
  number text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  object text NOT NULL,
  place text NOT NULL DEFAULT '',
  contractor text NOT NULL,
  issued_by text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Приостановлено',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Нумерация актов о приостановке (аналогично предписаниям)
CREATE TABLE IF NOT EXISTS t_p5901577_safety_platform_deve.suspension_numbering (
  id serial PRIMARY KEY,
  next_number integer NOT NULL DEFAULT 1,
  last_year integer
);

-- Признак типа шаблона: предписание или акт о приостановке
ALTER TABLE t_p5901577_safety_platform_deve.templates
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'prescription';
