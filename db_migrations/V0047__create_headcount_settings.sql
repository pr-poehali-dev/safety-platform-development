CREATE TABLE IF NOT EXISTS headcount_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  po_label TEXT NOT NULL DEFAULT 'ПО',
  po_rate INTEGER NOT NULL DEFAULT 10 CHECK (po_rate BETWEEN 1 AND 12),
  sbd_rate INTEGER NOT NULL DEFAULT 8 CHECK (sbd_rate BETWEEN 1 AND 12),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO headcount_settings (id, po_label, po_rate, sbd_rate)
VALUES (1, 'ПО', 10, 8)
ON CONFLICT (id) DO NOTHING;