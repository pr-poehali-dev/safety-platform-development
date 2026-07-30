UPDATE t_p5901577_safety_platform_deve.templates
SET content = REPLACE(
  content,
  ' в присутствии представителя подрядной организации <strong>{{representative}}</strong>',
  '{{presence}}'
)
WHERE id = '1781690045018';