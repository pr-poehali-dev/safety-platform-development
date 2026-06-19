CREATE TABLE t_p5901577_safety_platform_deve.violation_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p5901577_safety_platform_deve.violation_categories (name, sort_order) VALUES
  ('Работы на высоте', 1),
  ('Грузоподъёмные операции', 2),
  ('Алкогольное, наркотическое опьянение', 3),
  ('Земляные работы', 4),
  ('Замкнутые пространства', 5),
  ('Огневые работы', 6),
  ('Электробезопасность', 7),
  ('Пожарная безопасность', 8),
  ('Территория/пути передвижения', 9),
  ('БДД', 10),
  ('Документация (НД, ППР, и т.п.)', 11),
  ('СИЗ', 12),
  ('Газобалонное оборудование', 13),
  ('Прочее', 14);
