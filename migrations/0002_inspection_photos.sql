-- Vistoria de chegada (checklist de avarias + confirmação do cliente) e fotos.
-- As fotos ficam no R2 (jv-fotos); aqui só a referência.
CREATE TABLE IF NOT EXISTS inspections (
  booking_id TEXT PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  items TEXT NOT NULL DEFAULT '[]', -- JSON: [{ "item": "Riscos", "damage": true, "note": "..." }]
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('arrival', 'delivery')),
  angle TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS photos_booking_idx ON photos (booking_id, kind, created_at);
