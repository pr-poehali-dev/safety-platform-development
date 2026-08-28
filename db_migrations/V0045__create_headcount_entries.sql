CREATE TABLE headcount_entries (
  id SERIAL PRIMARY KEY,
  entry_date DATE NOT NULL UNIQUE,
  po_count INTEGER,
  sbd_count INTEGER,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_headcount_entries_date ON headcount_entries(entry_date);
