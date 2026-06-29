CREATE TABLE t_p5901577_safety_platform_deve.incidents (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  incident_date DATE NOT NULL,
  location TEXT,
  contractor TEXT,
  microtrauma INT NOT NULL DEFAULT 0,
  light_injury INT NOT NULL DEFAULT 0,
  severe_injury INT NOT NULL DEFAULT 0,
  fatal INT NOT NULL DEFAULT 0,
  no_consequences INT NOT NULL DEFAULT 0,
  created_by INT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);