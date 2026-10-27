INSERT INTO t_p5901577_safety_platform_deve.remarks (id, prescription_id, place, category, description, norm_ref, deadline, status, sort_order, photos)
VALUES (
 '17930711087612x2gba7', '1793011202981', 'Гостиница 5.2 / Секция Б', 'Работы на высоте',
 'К работам на высоте допущены работники,  не обученные  требованиям охраны труда и правилам по охране труда при работах на высоте, не имеющие соответствующих  удостоверений  (бригада КНДР)',
 'Нарушено: Статья 219 ТК РФ (регулирует обязанность проходить обучение по охране труда и проверку  знаний требований охраны труда для работников (включая руководителей организаций); Приказа Минтруда РФ от 16.11.2020 №782н «Об утверждении правил по охране труда при работе на высоте» "п.16, п.17',
 '27.10.2026', 'Черновик', 2, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

UPDATE t_p5901577_safety_platform_deve.prescriptions SET report_deadline = '27.10.2026' WHERE id = '1793011202981';

INSERT INTO t_p5901577_safety_platform_deve.remark_history (remark_id, prescription_id, field, old_value, new_value, changed_by, changed_by_name)
VALUES ('', '1793011202981', 'restored', '', 'Восстановлены 2 пункта и тексты первого пункта, потерянные при сохранении устаревшей формы', 'system', 'Система');