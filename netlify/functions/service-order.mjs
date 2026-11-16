import { getDatabase } from '@netlify/database';
import { hashAccessCode, isAccessCode } from '../lib/stages.mjs';

// Cliente consulta a etapa do próprio agendamento com o código recebido ao agendar.
// O código vai no corpo (POST), não na URL, para não ficar em logs. Sem nome nem telefone na resposta.
export const config = {
  path: '/api/os',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: 'ip' },
};
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export default async request => {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Formato de pedido inválido.' }, 415);
  let code;
  try {
    const raw = await request.text();
    if (raw.length > 500) return json({ error: 'Dados inválidos.' }, 413);
    code = JSON.parse(raw)?.code;
  } catch { return json({ error: 'Dados inválidos.' }, 400); }
  if (!isAccessCode(code)) return json({ error: 'Agendamento não encontrado.' }, 404);
  try {
    const db = getDatabase();
    const rows = await db.sql`SELECT id, service, booking_date, booking_time, status FROM bookings WHERE access_hash = ${hashAccessCode(code)}`;
    if (!rows.length) return json({ error: 'Agendamento não encontrado.' }, 404);
    const row = rows[0];
    const events = await db.sql`SELECT status, created_at FROM booking_events WHERE booking_id = ${row.id} ORDER BY created_at ASC, id ASC`;
    return json({
      order: {
        id: row.id,
        service: row.service,
        date: String(row.booking_date).slice(0, 10),
        time: row.booking_time,
        status: row.status,
        events: events.map(e => ({ status: e.status, at: new Date(e.created_at).toISOString() })),
      },
    });
  } catch (error) {
    console.error('Erro ao consultar OS:', error?.message ?? 'erro desconhecido');
    return json({ error: 'Não foi possível consultar agora.' }, 503);
  }
};
