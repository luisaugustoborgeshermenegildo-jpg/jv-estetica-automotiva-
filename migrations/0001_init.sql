-- Banco D1 (SQLite) da JV na Cloudflare. Mesmo modelo do Netlify DB e do app.py.
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  motorcycle TEXT NOT NULL,
  service TEXT NOT NULL,
  engine TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  booking_time TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'received', 'washing', 'ready', 'delivered', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  access_hash TEXT
);

-- Um agendamento ativo por horário; cancelado libera o horário.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_unique
  ON bookings (booking_date, booking_time) WHERE status <> 'cancelled';
CREATE UNIQUE INDEX IF NOT EXISTS bookings_access_hash_unique
  ON bookings (access_hash) WHERE access_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS booking_events_booking_idx ON booking_events (booking_id, id);

CREATE TABLE IF NOT EXISTS admin_credentials (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
