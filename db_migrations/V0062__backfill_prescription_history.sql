INSERT INTO t_p5901577_safety_platform_deve.remark_history (remark_id, prescription_id, field, old_value, new_value, changed_by, changed_by_name, changed_at)
SELECT '', p.id, 'created', '', p.number, p.created_by,
       COALESCE((SELECT u.name FROM t_p5901577_safety_platform_deve.users u WHERE u.login = p.created_by LIMIT 1), p.created_by),
       p.created_at
FROM t_p5901577_safety_platform_deve.prescriptions p
WHERE NOT EXISTS (SELECT 1 FROM t_p5901577_safety_platform_deve.remark_history h WHERE h.prescription_id = p.id AND h.field = 'created');

INSERT INTO t_p5901577_safety_platform_deve.remark_history (remark_id, prescription_id, field, old_value, new_value, changed_by, changed_by_name, changed_at)
SELECT '', p.id, 'comment',
       COALESCE(jsonb_array_length(c.elem->'attachments'), 0)::text,
       left(COALESCE(c.elem->>'text', ''), 500),
       COALESCE(c.elem->>'authorLogin', ''),
       COALESCE(c.elem->>'author', ''),
       CASE WHEN (c.elem->>'id') ~ '^[0-9]{13}$' THEN to_timestamp((c.elem->>'id')::bigint / 1000.0) ELSE p.created_at END
FROM t_p5901577_safety_platform_deve.prescriptions p
CROSS JOIN LATERAL jsonb_array_elements(p.comments) AS c(elem)
WHERE jsonb_typeof(p.comments) = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM t_p5901577_safety_platform_deve.remark_history h
    WHERE h.prescription_id = p.id AND h.field = 'comment'
      AND h.new_value = left(COALESCE(c.elem->>'text', ''), 500)
      AND h.changed_by_name = COALESCE(c.elem->>'author', '')
  );