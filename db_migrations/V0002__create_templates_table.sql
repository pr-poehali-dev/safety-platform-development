CREATE TABLE IF NOT EXISTS t_p5901577_safety_platform_deve.templates (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  -- Настройки заголовка
  title text NOT NULL DEFAULT 'АКТ-ПРЕДПИСАНИЕ № {{number}}',
  subtitle text NOT NULL DEFAULT 'о нарушении требований охраны труда, пожарной, промышленной безопасности и экологии',
  -- Настройки организации (статические тексты в шаблоне)
  company_name text NOT NULL DEFAULT 'СБД',
  -- Колонки таблицы нарушений (JSON массив)
  table_columns jsonb NOT NULL DEFAULT '[
    {"key":"num","label":"№ п/п","width":28,"enabled":true},
    {"key":"place","label":"Место нарушения","width":70,"enabled":true},
    {"key":"description","label":"Описание нарушения / Фото нарушения (при наличии)","width":null,"enabled":true},
    {"key":"normRef","label":"Нарушен пункт НПА/ЛНА","width":160,"enabled":true},
    {"key":"deadline","label":"Срок устранения","width":90,"enabled":true}
  ]'::jsonb,
  -- Текстовые блоки (можно включать/выключать и редактировать)
  block_object_label text NOT NULL DEFAULT 'Проверяемый объект:',
  block_contractor_label text NOT NULL DEFAULT 'Работы проводит подрядная организация:',
  block_inspector_label text NOT NULL DEFAULT 'Проверка проведена',
  block_representative_label text NOT NULL DEFAULT 'в присутствии представителя подрядной организации',
  block_violations_title text NOT NULL DEFAULT 'В ходе проверки выявлены следующие нарушения:',
  block_copies_text text NOT NULL DEFAULT 'Акт составлен в 2-х экземплярах. 1 экз. Акта остается у Заказчика ООО «{{company_name}}», 2-й экземпляр Акта передается представителю {{contractor}}. Копия Акта направляется в адрес подрядной организации {{contractor}} по электронной почте.',
  block_report_text text NOT NULL DEFAULT 'Отчет об устранении нарушений по данному Акту, направить в ООО «{{company_name}}» по электронной почте {{reply_email}} не позднее {{report_deadline}}.',
  -- Настройки шрифтов и отступов
  font_size integer NOT NULL DEFAULT 11,
  font_family text NOT NULL DEFAULT 'Times New Roman',
  margin_top integer NOT NULL DEFAULT 15,
  margin_right integer NOT NULL DEFAULT 15,
  margin_bottom integer NOT NULL DEFAULT 15,
  margin_left integer NOT NULL DEFAULT 20,
  -- Блоки подписей
  sig_issuer_label text NOT NULL DEFAULT 'Выдал:',
  sig_receiver_label text NOT NULL DEFAULT 'С Актом ознакомлен, согласен и принял к исполнению:',
  -- Мета
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Вставляем базовый шаблон
INSERT INTO t_p5901577_safety_platform_deve.templates (id, name, is_default)
VALUES ('default', 'Стандартный акт-предписание', true)
ON CONFLICT (id) DO NOTHING;
