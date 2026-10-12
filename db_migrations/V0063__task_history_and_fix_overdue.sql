CREATE TABLE IF NOT EXISTS t_p5901577_safety_platform_deve.task_history (
    id BIGSERIAL PRIMARY KEY,
    task_id INTEGER,
    assignment_id INTEGER,
    event_type TEXT NOT NULL,
    old_value TEXT NOT NULL DEFAULT '',
    new_value TEXT NOT NULL DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    changed_by TEXT NOT NULL DEFAULT '',
    changed_by_name TEXT NOT NULL DEFAULT '',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_history_assignment ON t_p5901577_safety_platform_deve.task_history (assignment_id, changed_at DESC);

INSERT INTO t_p5901577_safety_platform_deve.task_history (task_id, assignment_id, event_type, new_value, changed_by, changed_by_name, changed_at)
SELECT ta.task_id, ta.id, 'created', to_char(ta.due_date, 'YYYY-MM-DD'), t.created_by, t.created_by_name, COALESCE(ta.created_at, t.created_at, now())
FROM t_p5901577_safety_platform_deve.task_assignments ta
JOIN t_p5901577_safety_platform_deve.tasks t ON t.id = ta.task_id;

UPDATE t_p5901577_safety_platform_deve.task_assignments
SET status = 'active', updated_at = NOW()
WHERE status = 'overdue' AND due_date >= CURRENT_DATE;