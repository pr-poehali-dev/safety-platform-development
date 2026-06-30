CREATE INDEX idx_task_assignments_status_due ON task_assignments(status, due_date);
CREATE INDEX idx_task_assignments_assignee_due ON task_assignments(assignee_login, due_date);
