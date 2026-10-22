import { getDatabase } from '@netlify/database';
import { configuredPassword, hasAdminSession, json } from '../lib/admin-session.mjs';

export const config = { path: '/api/admin/bookings' };

export default async request => {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, 405);
  const password = configuredPassword();
  if (!password) return json({ error: 'O acesso administrativo ainda não foi configurado.' }, 503);
  if (!hasAdminSession(request, password)) return json({ error: 'Entre novamente para consultar os agendamentos.' }, 401);

  try {
    const db = getDatabase();
    const rows = await db.sql`SELECT id, name, phone, motorcycle, service, engine, booking_date, booking_time, notes, status, created_at
      FROM bookings
      ORDER BY CASE WHEN booking_date >= CURRENT_DATE THEN 0 ELSE 1 END, booking_date ASC, booking_time ASC, created_at DESC
      LIMIT 250`;
    const bookings = rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      motorcycle: row.motorcycle,
      service: row.service,
      engine: row.engine,
      date: String(row.booking_date).slice(0, 10),
      time: row.booking_time,
      notes: row.notes,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
    }));
    return json({ bookings });
  } catch (error) {
    console.error('Erro ao consultar painel administrativo:', error?.message ?? 'erro desconhecido');
    return json({ error: 'Não foi possível consultar a agenda agora.' }, 503);
  }
};
