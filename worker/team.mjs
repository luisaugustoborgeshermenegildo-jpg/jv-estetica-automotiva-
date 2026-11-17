// Equipe e comissões do JV Sistema.
// Comissão = valor recebido pelo atendimento (lançado no Financeiro) ou, se não houver,
// o preço do catálogo × a porcentagem do serviço. Atendimentos do proprietário não geram comissão.
import { readJson, requireAdmin, json, BOOKING_ID } from './http.mjs';
import { localToday } from './rules.mjs';
import { getSettings } from './settings.mjs';
import { priceCents } from './pricing.mjs';

const MAX_STAFF = 10;

async function overview(db) {
  const settings = await getSettings(db);
  const staff = await db.sql`SELECT id, name, phone, active FROM staff ORDER BY active DESC, name`;
  // Atendimentos entregues com profissional definido (comissão) e do mês (produção).
  const done = await db.sql`SELECT b.id, b.name, b.service, b.engine, b.booking_date, b.staff_id, b.commission_paid_at,
      (SELECT COALESCE(SUM(t.amount_cents), 0) FROM transactions t WHERE t.booking_id = b.id AND t.kind = 'in') AS paid_cents
    FROM bookings b WHERE b.status = 'delivered' ORDER BY b.booking_date DESC LIMIT 500`;
  const month = localToday().slice(0, 7);
  const enrich = b => {
    const base = b.paid_cents || priceCents(settings.catalog, b.service, b.engine);
    const pct = settings.catalog[b.service]?.commission ?? 0;
    return {
      id: b.id, customer: b.name, service: b.service, date: b.booking_date, staffId: b.staff_id,
      baseCents: base, pct, commissionCents: b.staff_id ? Math.round((base * pct) / 100) : 0, paidAt: b.commission_paid_at,
    };
  };
  const jobs = done.map(enrich);
  const people = staff.map(s => {
    const mine = jobs.filter(j => j.staffId === s.id);
    const pending = mine.filter(j => !j.paidAt);
    return {
      id: s.id, name: s.name, phone: s.phone, active: Boolean(s.active),
      servicesMonth: mine.filter(j => j.date.startsWith(month)).length,
      generatedMonthCents: mine.filter(j => j.date.startsWith(month)).reduce((t, j) => t + j.baseCents, 0),
      pendingCents: pending.reduce((t, j) => t + j.commissionCents, 0),
      pendingJobs: pending,
    };
  });
  const ownerJobs = jobs.filter(j => !j.staffId && j.date.startsWith(month));
  const monthJobs = jobs.filter(j => j.date.startsWith(month));
  const withCommission = monthJobs.filter(j => j.staffId);
  return {
    staff: people,
    owner: { servicesMonth: ownerJobs.length, generatedMonthCents: ownerJobs.reduce((t, j) => t + j.baseCents, 0) },
    kpis: {
      activeStaff: people.filter(p => p.active).length,
      pendingCents: people.reduce((t, p) => t + p.pendingCents, 0),
      servicesMonth: monthJobs.length,
      avgCommissionCents: withCommission.length ? Math.round(withCommission.reduce((t, j) => t + j.commissionCents, 0) / withCommission.length) : 0,
    },
    rules: Object.entries(settings.catalog).map(([service, item]) => ({ service, pct: item.commission })),
    maxStaff: MAX_STAFF,
  };
}

const cleanName = v => (typeof v === 'string' ? v.trim().slice(0, 60) : '');
const cleanPhone = v => (typeof v === 'string' ? v.trim().slice(0, 20) : '');

export async function teamRoutes(db, request, url) {
  const path = url.pathname;
  if (!path.startsWith('/api/admin/team')) return null;

  if (path === '/api/admin/team' && request.method === 'GET') {
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    return json(await overview(db), 200);
  }

  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const { body, error } = await readJson(request, 1000);
  if (error) return error;
  const denied = await requireAdmin(db, request);
  if (denied) return denied;

  if (path === '/api/admin/team/staff') {
    const name = cleanName(body.name);
    const phone = cleanPhone(body.phone);
    if (!name) return json({ error: 'Informe o nome do funcionário.' }, 400);
    if (phone && !/^\+?[\d\s().-]{10,20}$/.test(phone)) return json({ error: 'WhatsApp inválido.' }, 400);
    const count = await db.sql`SELECT COUNT(*) AS n FROM staff WHERE active = 1`;
    if (count[0].n >= MAX_STAFF) return json({ error: `Limite de ${MAX_STAFF} funcionários ativos.` }, 409);
    await db.sql`INSERT INTO staff (name, phone) VALUES (${name}, ${phone})`;
    return json(await overview(db), 201);
  }

  if (path === '/api/admin/team/staff/update') {
    const id = Number.isInteger(body.id) ? body.id : 0;
    if (!id) return json({ error: 'Funcionário inválido.' }, 400);
    const rows = await db.sql`SELECT name, phone, active FROM staff WHERE id = ${id}`;
    if (!rows.length) return json({ error: 'Funcionário não encontrado.' }, 404);
    const name = body.name !== undefined ? cleanName(body.name) : rows[0].name;
    const phone = body.phone !== undefined ? cleanPhone(body.phone) : rows[0].phone;
    const active = body.active !== undefined ? (body.active ? 1 : 0) : rows[0].active;
    if (!name) return json({ error: 'Informe o nome do funcionário.' }, 400);
    await db.sql`UPDATE staff SET name = ${name}, phone = ${phone}, active = ${active} WHERE id = ${id}`;
    return json(await overview(db), 200);
  }

  if (path === '/api/admin/team/assign') {
    const bookingId = typeof body.bookingId === 'string' && BOOKING_ID.test(body.bookingId) ? body.bookingId : '';
    const staffId = body.staffId === null ? null : Number.isInteger(body.staffId) ? body.staffId : undefined;
    if (!bookingId || staffId === undefined) return json({ error: 'Dados inválidos.' }, 400);
    if (staffId !== null && !(await db.sql`SELECT 1 FROM staff WHERE id = ${staffId} AND active = 1`).length) return json({ error: 'Funcionário não encontrado.' }, 404);
    const changed = await db.sql`UPDATE bookings SET staff_id = ${staffId} WHERE id = ${bookingId} AND commission_paid_at IS NULL RETURNING id`;
    if (!changed.length) return json({ error: 'Atendimento não encontrado ou comissão já paga.' }, 409);
    return json({ ok: true }, 200);
  }

  if (path === '/api/admin/team/pay') {
    const staffId = Number.isInteger(body.staffId) ? body.staffId : 0;
    const team = await overview(db);
    const person = team.staff.find(s => s.id === staffId);
    if (!person) return json({ error: 'Funcionário não encontrado.' }, 404);
    if (!person.pendingCents) return json({ error: 'Não há comissão pendente.' }, 409);
    const ids = person.pendingJobs.map(j => j.id);
    // Marca os atendimentos como pagos e lança a despesa no Financeiro (categoria Equipe).
    await db.sql`UPDATE bookings SET commission_paid_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE staff_id = ${staffId} AND commission_paid_at IS NULL AND id IN (SELECT value FROM json_each(${JSON.stringify(ids)}))`;
    await db.sql`INSERT INTO transactions (kind, amount_cents, category, description, occurred_on)
      VALUES ('out', ${person.pendingCents}, 'equipe', ${`Comissão de ${person.name} (${ids.length} ${ids.length === 1 ? 'serviço' : 'serviços'})`}, ${localToday()})`;
    return json(await overview(db), 200);
  }

  return json({ error: 'Não encontrado.' }, 404);
}
