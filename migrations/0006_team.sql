-- Equipe e comissões: funcionários, quem executou cada atendimento e pagamento da comissão.
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

ALTER TABLE bookings ADD COLUMN staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN commission_paid_at TEXT;
