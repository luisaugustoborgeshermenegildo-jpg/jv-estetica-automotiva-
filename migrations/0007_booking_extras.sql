-- Adicionais escolhidos junto com a lavagem no app (ex.: "Revitalização de plásticos, Clareamento do motor").
ALTER TABLE bookings ADD COLUMN extras TEXT NOT NULL DEFAULT '';
