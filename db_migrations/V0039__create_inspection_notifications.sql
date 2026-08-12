CREATE TABLE t_p5901577_safety_platform_deve.inspection_notifications (
    id SERIAL PRIMARY KEY,
    user_login VARCHAR(100) NOT NULL,
    inspection_id INTEGER NOT NULL REFERENCES t_p5901577_safety_platform_deve.inspections(id),
    event_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inspection_notifications_user ON t_p5901577_safety_platform_deve.inspection_notifications(user_login);
CREATE INDEX idx_inspection_notifications_unread ON t_p5901577_safety_platform_deve.inspection_notifications(user_login, is_read);