// Financeiro do JV Sistema: entradas, despesas, taxas por forma de pagamento e meta do mês.
import { readJson, requireAdmin, json, BOOKING_ID } from './http.mjs';
import { localToday } from './rules.mjs';
import { getSettings } from './settings.mjs';

export const METHODS = ['pix', 'dinheiro', 'debito', 'credito', 'outro'];
export const CATEGORIES = ['produtos', 'aluguel', 'contas', 'equipe', 'manutencao', 'marketing', 'impostos', 'outros'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function lastDay(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

async function summary(db, month) {
  const settings = await getSettings(db);
  const from = `${month}-01`;
  const to = `${month}-${String(lastDay(month)).padStart(2, '0')}`;
  const rows = await db.sql`SELECT t.id, t.kind, t.amount_cents, t.fee_cents, t.method, t.category, t.description, t.booking_id, t.occurred_on, b.name AS customer
    FROM transactions t LEFT JOIN bookings b ON b.id = t.booking_id
    WHERE t.occurred_on BETWEEN ${from} AND ${to} ORDER BY t.occurred_on DESC, t.id DESC`;
  const entries = rows.map(r => ({
    id: r.id, kind: r.kind, amountCents: r.amount_cents, feeCents: r.fee_cents, method: r.method, category: r.category,
    description: r.description, bookingId: r.booking_id, customer: r.customer, date: r.occurred_on,
  }));
  const ins = entries.filter(e => e.kind === 'in');
  const outs = entries.filter(e => e.kind === 'out');
  const sum = (list, key = 'amountCents') => list.reduce((s, e) => s + e[key], 0);
  const revenue = sum(ins);
  const fees = sum(ins, 'feeCents');
  const expenses = sum(outs);
  const byMethod = METHODS.map(method => {
    const list = ins.filter(e => e.method === method);
    return { method, grossCents: sum(list), feeCents: sum(list, 'feeCents'), count: list.length };
  }).filter(m => m.count);
  const byCategory = CATEGORIES.map(category => ({ category, totalCents: sum(outs.filter(e => e.category === category)) })).filter(c => c.totalCents);
  // Semanas do mês: 1-7, 8-14, 15-21, 22-28, 29-fim.
  const weeks = [];
  for (let start = 1; start <= lastDay(month); start += 7) {
    const end = Math.min(start + 6, lastDay(month));
    const inRange = e => Number(e.date.slice(8, 10)) >= start && Number(e.date.slice(8, 10)) <= end;
    weeks.push({ label: `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`, inCents: sum(ins.filter(inRange)), outCents: sum(outs.filter(inRange)) });
  }
  // Atendimentos entregues que ainda não têm recebimento lançado (para vincular a entrada).
  const unpaid = await db.sql`SELECT b.id, b.name, b.service, b.motorcycle, b.booking_date FROM bookings b
    WHERE b.status IN ('ready', 'delivered') AND b.booking_date >= date(${localToday()}, '-30 days')
    AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.booking_id = b.id AND t.kind = 'in')
    ORDER BY b.booking_date DESC LIMIT 30`;
  return {
    month,
    entries,
    totals: {
      revenueCents: revenue,
      feeCents: fees,
      netCents: revenue - fees,
      expenseCents: expenses,
      resultCents: revenue - fees - expenses,
      services: ins.filter(e => e.bookingId).length,
      ticketCents: ins.length ? Math.round(revenue / ins.length) : 0,
    },
    byMethod,
    byCategory,
    weeks,
    goalCents: settings.finance.goalCents,
    fees: settings.finance.fees,
    unpaid: unpaid.map(b => ({ id: b.id, name: b.name, service: b.service, vehicle: b.motorcycle, date: b.booking_date })),
  };
}

export async function financeRoutes(db, request, url) {
  const path = url.pathname;
  if (!path.startsWith('/api/admin/finance')) return null;

  if (path === '/api/admin/finance' && request.method === 'GET') {
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    const month = url.searchParams.get('month') ?? localToday().slice(0, 7);
    if (!MONTH.test(month)) return json({ error: 'Mês inválido.' }, 400);
    return json(await summary(db, month), 200);
  }

  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const { body, error } = await readJson(request, 2000);
  if (error) return error;
  const denied = await requireAdmin(db, request);
  if (denied) return denied;

  if (path === '/api/admin/finance/entry') {
    const kind = body.kind === 'in' ? 'in' : body.kind === 'out' ? 'out' : '';
    const amount = Number.isInteger(body.amountCents) && body.amountCents > 0 && body.amountCents <= 100_000_00 ? body.amountCents : 0;
    const date = typeof body.date === 'string' && DATE.test(body.date) ? body.date : '';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 200) : '';
    if (!kind || !amount || !date) return json({ error: 'Informe tipo, valor e data.' }, 400);
    if (date > localToday()) return json({ error: 'A data não pode ser no futuro.' }, 400);
    let method = null;
    let category = null;
    let bookingId = null;
    let fee = 0;
    if (kind === 'in') {
      method = METHODS.includes(body.method) ? body.method : '';
      if (!method) return json({ error: 'Escolha a forma de pagamento.' }, 400);
      const settings = await getSettings(db);
      fee = Math.round((amount * (settings.finance.fees[method] ?? 0)) / 100);
      if (body.bookingId) {
        if (typeof body.bookingId !== 'string' || !BOOKING_ID.test(body.bookingId)) return json({ error: 'Atendimento inválido.' }, 400);
        if (!(await db.sql`SELECT 1 FROM bookings WHERE id = ${body.bookingId}`).length) return json({ error: 'Atendimento não encontrado.' }, 404);
        bookingId = body.bookingId;
      }
    } else {
      category = CATEGORIES.includes(body.category) ? body.category : '';
      if (!category) return json({ error: 'Escolha a categoria da despesa.' }, 400);
    }
    await db.sql`INSERT INTO transactions (kind, amount_cents, fee_cents, method, category, description, booking_id, occurred_on)
      VALUES (${kind}, ${amount}, ${fee}, ${method}, ${category}, ${description}, ${bookingId}, ${date})`;
    return json(await summary(db, date.slice(0, 7)), 201);
  }

  if (path === '/api/admin/finance/delete') {
    const id = Number.isInteger(body.id) && body.id > 0 ? body.id : 0;
    if (!id) return json({ error: 'Lançamento inválido.' }, 400);
    const rows = await db.sql`DELETE FROM transactions WHERE id = ${id} RETURNING occurred_on`;
    if (!rows.length) return json({ error: 'Lançamento não encontrado.' }, 404);
    return json(await summary(db, rows[0].occurred_on.slice(0, 7)), 200);
  }

  return json({ error: 'Não encontrado.' }, 404);
}
