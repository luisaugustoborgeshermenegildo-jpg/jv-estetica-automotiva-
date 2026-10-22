import { randomUUID } from 'node:crypto';
import { getDatabase } from '@netlify/database';

const TIMES = new Set(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']);
const SERVICES = new Set(['Lavagem completa', 'Lavagem detalhada', 'Lavagem premium']);
const ENGINES = new Set(['150cc – 400cc', '400cc – 900cc', 'Mais de 900cc']);
const OPEN_DAYS = new Set([2, 3, 4, 5, 6, 0]);
const TZ = 'America/Sao_Paulo';
export const config = {
  path: '/api/bookings',
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: 'ip' },
};
const json = (body, status) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function localToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 8000) return json({ error: 'Dados inválidos.' }, 413);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Formato de pedido inválido.' }, 415);

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 8000) return json({ error: 'Dados inválidos.' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: 'Não foi possível ler os dados enviados.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Dados inválidos.' }, 400);
  if (String(body.website ?? '').trim()) return json({ error: 'Não foi possível enviar o pedido.' }, 400);
  if (body.consent !== 'yes') return json({ error: 'Confirme a autorização de uso dos dados para este agendamento.' }, 400);

  const keys = ['name', 'phone', 'motorcycle', 'service', 'engine', 'date', 'time', 'notes'];
  const fields = Object.fromEntries(keys.map(key => [key, typeof body[key] === 'string' ? body[key].trim() : '']));
  if (keys.slice(0, 7).some(key => !fields[key])) return json({ error: 'Preencha todos os campos obrigatórios.' }, 400);
  if (!SERVICES.has(fields.service) || !ENGINES.has(fields.engine) || !TIMES.has(fields.time)) return json({ error: 'Serviço, cilindrada ou horário inválido.' }, 400);
  if (fields.name.length > 80 || fields.phone.length > 20 || fields.motorcycle.length > 80 || fields.notes.length > 500) return json({ error: 'Revise os campos: um deles excede o tamanho permitido.' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) return json({ error: 'Informe uma data válida.' }, 400);
  const chosen = new Date(`${fields.date}T12:00:00Z`);
  if (Number.isNaN(chosen.valueOf()) || chosen.toISOString().slice(0, 10) !== fields.date || fields.date < localToday() || !OPEN_DAYS.has(chosen.getUTCDay())) return json({ error: 'A data escolhida não está disponível. Selecione outro dia.' }, 400);
  if (!/^\+?[\d\s().-]+$/.test(fields.phone) || (fields.phone.match(/\d/g) ?? []).length < 10 || (fields.phone.match(/\d/g) ?? []).length > 13) return json({ error: 'Informe um número de WhatsApp válido.' }, 400);

  const id = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  try {
    const db = getDatabase();
    await db.sql`INSERT INTO bookings (id, name, phone, motorcycle, service, engine, booking_date, booking_time, notes)
      VALUES (${id}, ${fields.name}, ${fields.phone}, ${fields.motorcycle}, ${fields.service}, ${fields.engine}, ${fields.date}::date, ${fields.time}, ${fields.notes})`;
  } catch (error) {
    if (error?.code === '23505') return json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, 409);
    console.error('Erro ao gravar agendamento:', error?.message ?? 'erro desconhecido');
    return json({ error: 'A agenda está indisponível neste momento. Tente novamente em instantes.' }, 503);
  }
  return json({ booking: { id, status: 'pending' } }, 201);
};
