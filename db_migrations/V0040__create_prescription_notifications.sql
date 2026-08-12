CREATE TABLE t_p5901577_safety_platform_deve.prescription_notifications (
    id SERIAL PRIMARY KEY,
    user_login VARCHAR(100) NOT NULL,
    prescription_id TEXT NOT NULL REFERENCES t_p5901577_safety_platform_deve.prescriptions(id),
    event_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_prescription_notifications_user ON t_p5901577_safety_platform_deve.prescription_notifications(user_login);
CREATE INDEX idx_prescription_notifications_unread ON t_p5901577_safety_platform_deve.prescription_notifications(user_login, is_read);