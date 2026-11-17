-- Placa da moto (opcional), informada no app ou no "Novo agendamento" do sistema.
ALTER TABLE bookings ADD COLUMN plate TEXT NOT NULL DEFAULT '';
