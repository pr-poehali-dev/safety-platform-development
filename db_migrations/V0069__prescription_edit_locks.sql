CREATE TABLE IF NOT EXISTS t_p5901577_safety_platform_deve.prescription_locks (
  prescription_id TEXT PRIMARY KEY,
  user_login TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT '',
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now()
);