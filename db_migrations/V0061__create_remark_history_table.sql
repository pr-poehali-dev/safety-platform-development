CREATE TABLE IF NOT EXISTS t_p5901577_safety_platform_deve.remark_history (
    id BIGSERIAL PRIMARY KEY,
    remark_id TEXT NOT NULL,
    prescription_id TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT NOT NULL DEFAULT '',
    new_value TEXT NOT NULL DEFAULT '',
    changed_by TEXT NOT NULL DEFAULT '',
    changed_by_name TEXT NOT NULL DEFAULT '',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remark_history_remark_id ON t_p5901577_safety_platform_deve.remark_history (remark_id);
CREATE INDEX IF NOT EXISTS idx_remark_history_prescription_id ON t_p5901577_safety_platform_deve.remark_history (prescription_id);
