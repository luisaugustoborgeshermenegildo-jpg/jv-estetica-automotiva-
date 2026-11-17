-- Financeiro: entradas (recebimentos) e despesas. Valores em centavos.
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('in', 'out')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  method TEXT,   -- entrada: pix, dinheiro, debito, credito, outro
  category TEXT, -- despesa: produtos, aluguel, contas, equipe, manutencao, marketing, impostos, outros
  description TEXT NOT NULL DEFAULT '',
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  occurred_on TEXT NOT NULL, -- AAAA-MM-DD
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS transactions_month_idx ON transactions (occurred_on, kind);
