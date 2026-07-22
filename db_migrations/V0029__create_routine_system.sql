CREATE TABLE t_p5901577_safety_platform_deve.routine_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_p5901577_safety_platform_deve.routine_entries (
  id SERIAL PRIMARY KEY,
  user_login VARCHAR(100) NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  category_id INTEGER REFERENCES t_p5901577_safety_platform_deve.routine_categories(id),
  category_name TEXT NOT NULL,
  entry_date DATE NOT NULL,
  hours NUMERIC(4,1) NOT NULL DEFAULT 1,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routine_entries_user_date ON t_p5901577_safety_platform_deve.routine_entries(user_login, entry_date);