CREATE TABLE dashboard_visibility_settings (
  id SERIAL PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('role', 'user')),
  scope_key TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_key)
);

CREATE INDEX idx_dashboard_visibility_scope ON dashboard_visibility_settings(scope_type, scope_key);