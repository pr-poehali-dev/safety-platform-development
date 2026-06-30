
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  created_by_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_assignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  assignee_login VARCHAR(100) NOT NULL,
  assignee_name VARCHAR(200) NOT NULL,
  assignee_role VARCHAR(50) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  extension_requested_date DATE,
  extension_comment TEXT,
  extension_resolved_at TIMESTAMP,
  extension_resolution VARCHAR(20),
  extension_reject_comment TEXT,
  report_text TEXT,
  report_submitted_at TIMESTAMP,
  rejection_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_comments (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES task_assignments(id),
  author_login VARCHAR(100) NOT NULL,
  author_name VARCHAR(200) NOT NULL,
  author_role VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_notifications (
  id SERIAL PRIMARY KEY,
  user_login VARCHAR(100) NOT NULL,
  assignment_id INTEGER REFERENCES task_assignments(id),
  event_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_assignee ON task_assignments(assignee_login);
CREATE INDEX idx_task_comments_assignment ON task_comments(assignment_id);
CREATE INDEX idx_task_notifications_user ON task_notifications(user_login);
CREATE INDEX idx_task_notifications_unread ON task_notifications(user_login, is_read);
