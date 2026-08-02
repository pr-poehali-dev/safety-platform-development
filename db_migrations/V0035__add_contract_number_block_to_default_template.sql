UPDATE t_p5901577_safety_platform_deve.templates
SET content = REPLACE(
  content,
  '<p><strong>Работы проводит подрядная организация:</strong> {{contractor}}</p>',
  '<p><strong>Работы проводит подрядная организация:</strong> {{contractor}}{{contractNumberBlock}}</p>'
)
WHERE id = '1781690045018';