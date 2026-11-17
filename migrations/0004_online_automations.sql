-- Agendamento online configurável e automações (mensagens com 1 toque).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS message_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('confirm', 'reminder', 'ready', 'survey', 'return')),
  ref TEXT NOT NULL, -- protocolo do agendamento (ou telefone, no lembrete de retorno)
  sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS message_log_ref_idx ON message_log (kind, ref);

-- Atendimentos simultâneos passam a ser controlados pela API (capacidade configurável),
-- então o índice "um por horário" sai.
DROP INDEX IF EXISTS bookings_active_slot_unique;
CREATE INDEX IF NOT EXISTS bookings_slot_idx ON bookings (booking_date, booking_time, status);
