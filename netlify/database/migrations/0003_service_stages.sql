-- Etapas da ordem de serviço (agendado → recebido → em lavagem → pronto → entregue),
-- histórico de cada mudança e código de acesso do cliente (guardado só como hash).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'received', 'washing', 'ready', 'delivered', 'cancelled'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS access_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_access_hash_unique
  ON bookings (access_hash) WHERE access_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS booking_events (
  id BIGSERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS booking_events_booking_idx ON booking_events (booking_id, created_at);
