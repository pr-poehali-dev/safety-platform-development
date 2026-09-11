INSERT INTO t_p5901577_safety_platform_deve.templates
  (id, name, type, title, subtitle, company_name, table_columns, is_default, content, font_size, font_family, margin_top, margin_right, margin_bottom, margin_left, paper_size, orientation)
SELECT
  'suspension-default',
  'Акт о приостановке',
  'suspension',
  'АКТ О ПРИОСТАНОВКЕ РАБОТ № {{number}}',
  'в связи с нарушением требований охраны труда, пожарной, промышленной безопасности и экологии',
  'СБД',
  '[]'::jsonb,
  true,
  '<p style="text-align:center"><strong>АКТ О ПРИОСТАНОВКЕ РАБОТ № {{number}}</strong></p>
<p style="text-align:center">в связи с нарушением требований охраны труда, пожарной, промышленной безопасности и экологии</p>
<p style="text-align:right">от {{date}}</p>
<p><strong>Проверяемый объект:</strong> {{object}}</p>
<p><strong>Место нарушения:</strong> {{place}}</p>
<p><strong>Работы проводит подрядная организация:</strong> {{contractor}}</p>
<p><strong>Работы приостановил:</strong> {{issuedBy}}</p>
<p>До момента устранения нарушений, указанных в настоящем Акте, выполнение работ, производимых на объекте строительства, приостановлено в связи с:</p>
<p>{{reason}}</p>
<p><strong>Выдал:</strong> {{issuedBy}}</p>',
  11, 'Times New Roman', 15, 15, 15, 20, 'A4', 'portrait'
WHERE NOT EXISTS (SELECT 1 FROM t_p5901577_safety_platform_deve.templates WHERE id = 'suspension-default');

UPDATE t_p5901577_safety_platform_deve.templates SET type = 'prescription' WHERE id <> 'suspension-default';
