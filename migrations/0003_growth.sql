-- Crescimento: orçamentos, pátio (vaga do veículo), estoque e consumo por OS.
ALTER TABLE bookings ADD COLUMN spot TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  customer TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  vehicle TEXT NOT NULL CHECK (vehicle IN ('moto', 'carro')),
  model TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  valid_until TEXT,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'declined')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes (status, created_at);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  unit TEXT NOT NULL DEFAULT 'un',
  quantity REAL NOT NULL DEFAULT 0,
  minimum REAL NOT NULL DEFAULT 0,
  unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS stock_moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('in', 'out')),
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS stock_moves_created_idx ON stock_moves (created_at);
