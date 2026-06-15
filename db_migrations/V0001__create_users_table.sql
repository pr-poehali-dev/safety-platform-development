CREATE TABLE t_p5901577_safety_platform_deve.users (
  id TEXT PRIMARY KEY,
  login TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'specialist', 'contractor')),
  contractor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p5901577_safety_platform_deve.users (id, login, password, name, role) VALUES
  ('1', 'admin', 'admin123', 'Иванова О.В.', 'admin'),
  ('2', 'specialist', 'spec123', 'Алексеев С.Н.', 'specialist'),
  ('3', 'contractor', 'contr123', 'Козлов А.В.', 'contractor');

UPDATE t_p5901577_safety_platform_deve.users SET contractor = 'ООО «СтройПодряд»' WHERE id = '3';
