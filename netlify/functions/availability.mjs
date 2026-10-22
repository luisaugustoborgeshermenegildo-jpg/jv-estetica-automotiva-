import { getDatabase } from '@netlify/database';

const TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const OPEN_DAYS = new Set([2, 3, 4, 5, 6, 0]); // terça a domingo
const TZ = 'America/Sao_Paulo';
export const config = { path: '/api/availability' };

function localToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export default async (request) => {
  if (request.method !== 'GET') return Response.json({ error: 'Método não permitido.' }, { status: 405, headers: { Allow: 'GET' } });
  const selected = new URL(request.url).searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selected)) return Response.json({ error: 'Informe uma data válida.' }, { status: 400 });
  const parsed = new Date(`${selected}T12:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== selected) return Response.json({ error: 'Informe uma data válida.' }, { status: 400 });
  if (selected < localToday() || !OPEN_DAYS.has(parsed.getUTCDay())) return Response.json({ slots: [] });

  const db = getDatabase();
  const rows = await db.sql`SELECT booking_time FROM bookings WHERE booking_date = ${selected}::date AND status <> 'cancelled'`;
  const busy = new Set(rows.map(row => row.booking_time));
  return Response.json({ slots: TIMES.map(time => ({ time, available: !busy.has(time) })) }, { headers: { 'Cache-Control': 'no-store' } });
};
