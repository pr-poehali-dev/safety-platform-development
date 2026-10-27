INSERT INTO t_p5901577_safety_platform_deve.remarks (id, prescription_id, place, category, description, norm_ref, deadline, status, sort_order, photos, work_suspended, suspension_act_drawn, suspension_act_number)
SELECT '17930760287421rgu0zb', '1793011202981', '', '', 'Не организованы безопасные проходы по территории строительной площадки, между рабочими местами. В целом наблюдается захламление площадки в виде строительных отходов, старой спецодежды, бытового мусора и т.д.', 'Нарушен: п. 41. Приказа Минтруда РФ от 11 декабря 2020 г. №883н «Об утверждении правил по охране труда при строительстве, реконструкции и ремонте». «п. 41. Территория строительной площадки, включая проезды, проходы на производственных территориях, проходы к рабочим местам должны содержаться в чистоте, очищаться от мусора и снега, не загромождаться складируемыми материалами и строительными конструкциями.', '28.10.2026', 'Черновик', 3, '[]', false, false, ''
WHERE NOT EXISTS (SELECT 1 FROM t_p5901577_safety_platform_deve.remarks WHERE id='17930760287421rgu0zb');

INSERT INTO t_p5901577_safety_platform_deve.remarks (id, prescription_id, place, category, description, norm_ref, deadline, status, sort_order, photos, work_suspended, suspension_act_drawn, suspension_act_number)
SELECT '179307671562325obygf', '1793011202981', '', 'Электробезопасность', 'Электрические кабели временного электроснабжения строительной площадки проложены по земле, в зоне перемещения работников и частично  находятся в воде (в лужах).', '', '', 'Черновик', 4, '[]', false, false, ''
WHERE NOT EXISTS (SELECT 1 FROM t_p5901577_safety_platform_deve.remarks WHERE id='179307671562325obygf');

UPDATE t_p5901577_safety_platform_deve.prescriptions SET report_deadline='29.10.2026' WHERE id='1793011202981';

INSERT INTO t_p5901577_safety_platform_deve.remark_history (remark_id, prescription_id, field, old_value, new_value, changed_by, changed_by_name)
VALUES ('', '1793011202981', 'restored', '', 'Восстановлены 2 пункта (проходы на площадке, электрические кабели) и срок отчёта 29.10.2026, удалённые устаревшей формой в 05:05', 'system', 'Система');