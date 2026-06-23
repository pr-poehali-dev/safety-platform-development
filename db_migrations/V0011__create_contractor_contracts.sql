CREATE TABLE t_p5901577_safety_platform_deve.contractor_contracts (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL,
  contract_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
