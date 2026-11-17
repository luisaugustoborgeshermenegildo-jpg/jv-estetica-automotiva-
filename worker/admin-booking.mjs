// "Novo agendamento" pelo JV Sistema: cliente que ligou ou chegou no balcão.
// Mesmas regras do site, menos a antecedência mínima (o João decide).
import { readJson, requireAdmin, json } from './http.mjs';
import { checkFields } from './booking-rules.mjs';
import { getSettings, slotsFor } from './settings.mjs';

export async function adminCreateBooking(db, request) {
  const { body, error } = await readJson(request, 4000);
  if (error) return error;
  const denied = await requireAdmin(db, request);
  if (denied) return denied;
  const { f, error: invalid } = checkFields(body);
  if (invalid) return json({ error: invalid }, 400);
  const settings = await getSettings(db);
  if (!slotsFor(settings, f.date).includes(f.time)) return json({ error: 'Esse horário está fora do expediente.' }, 400);
  const id = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  const inserted = await db.sql`INSERT INTO bookings (id, name, phone, motorcycle, plate, service, extras, engine, booking_date, booking_time, notes)
    SELECT ${id}, ${f.name}, ${f.phone}, ${f.motorcycle}, ${f.plate}, ${f.service}, ${f.extras}, ${f.engine}, ${f.date}, ${f.time}, ${f.notes}
    WHERE (SELECT COUNT(*) FROM bookings WHERE booking_date = ${f.date} AND booking_time = ${f.time} AND status <> 'cancelled') < ${settings.capacity}
    RETURNING id`;
  if (!inserted.length) return json({ error: 'Esse horário já está cheio. Escolha outro.' }, 409);
  await db.sql`INSERT INTO booking_events (booking_id, status) VALUES (${id}, 'pending')`;
  return json({ booking: { id, status: 'pending' } }, 201);
}
