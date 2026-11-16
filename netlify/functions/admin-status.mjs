import { getDatabase } from '@netlify/database';
import { readAdminCredential, hasAdminSession, json } from '../lib/admin-session.mjs';
import { STATUSES } from '../lib/stages.mjs';

// Painel: muda a etapa de um agendamento e registra no histórico.
export const config = { path: '/api/admin/bookings/status' };

export default async request => {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Formato de pedido inválido.' }, 415);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 500) return json({ error: 'Dados inválidos.' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: 'Dados inválidos.' }, 400); }
  const id = typeof body?.id === 'string' ? body.id : '';
  const status = typeof body?.status === 'string' ? body.status : '';
  if (!/^[A-F0-9]{8}$/.test(id) || !STATUSES.has(status)) return json({ error: 'Agendamento ou etapa inválida.' }, 400);
  try {
    const db = getDatabase();
    const credential = await readAdminCredential(db);
    if (!credential) return json({ error: 'O painel ainda não foi configurado.' }, 503);
    if (!hasAdminSession(request, credential.sessionKey)) return json({ error: 'Entre novamente para alterar a etapa.' }, 401);
    const changed = await db.sql`UPDATE bookings SET status = ${status} WHERE id = ${id} AND status <> ${status} RETURNING id`;
    if (changed.length) {
      await db.sql`INSERT INTO booking_events (booking_id, status) VALUES (${id}, ${status})`;
    } else {
      const exists = await db.sql`SELECT 1 FROM bookings WHERE id = ${id}`;
      if (!exists.length) return json({ error: 'Agendamento não encontrado.' }, 404);
    }
    return json({ booking: { id, status } });
  } catch (error) {
    if (error?.code === '23505') return json({ error: 'Esse horário já foi ocupado por outro agendamento.' }, 409);
    console.error('Erro ao mudar etapa:', error?.message ?? 'erro desconhecido');
    return json({ error: 'Não foi possível salvar a etapa agora.' }, 503);
  }
};
