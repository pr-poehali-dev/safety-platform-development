UPDATE t_p5901577_safety_platform_deve.violation_categories
SET name = 'Неисправное (оборудование, приспособления, инструмент,)'
WHERE name = 'Неисправное (оборудование, приспособления, инструмент)';

UPDATE t_p5901577_safety_platform_deve.inspections
SET violation_type = 'Неисправное (оборудование, приспособления, инструмент,)'
WHERE violation_type = 'Неисправное (оборудование, приспособления, инструмент, СГП)';

UPDATE t_p5901577_safety_platform_deve.remarks
SET category = 'Неисправное (оборудование, приспособления, инструмент,)'
WHERE category = 'Неисправное (оборудование, приспособления, инструмент, СГП)';