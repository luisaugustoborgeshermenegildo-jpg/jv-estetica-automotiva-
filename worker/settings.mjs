// Configurações do agendamento online, automações (mensagens com 1 toque)
// e cancelamento pelo cliente.
import { hashAccessCode, isAccessCode } from '../netlify/lib/stages.mjs';
import { readJson, requireAdmin, limited, json } from './http.mjs';
import { SERVICES, localToday } from './rules.mjs';

const KINDS = ['confirm', 'reminder', 'ready', 'survey', 'return'];
// Expediente por dia da semana (0 = domingo). Horários cheios (HH:00); a agenda é de 1 em 1 hora.
const DAY = { on: true, open: '08:00', close: '18:00', lunch: false, lunchStart: '12:00', lunchEnd: '13:00' };
export const DEFAULT_SCHEDULE = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [String(d), { ...DAY, on: d !== 1 }]));
const HOUR = /^([01]\d|2[0-3]):00$/;

// Horários de atendimento de uma data, conforme o expediente.
export function slotsFor(settings, date) {
  const day = settings.schedule[String(new Date(`${date}T12:00:00Z`).getUTCDay())];
  if (!day?.on) return [];
  const h = t => Number(t.slice(0, 2));
  const slots = [];
  for (let hour = h(day.open); hour < h(day.close); hour++) {
    if (day.lunch && hour >= h(day.lunchStart) && hour < h(day.lunchEnd)) continue;
    slots.push(`${String(hour).padStart(2, '0')}:00`);
  }
  return slots;
}

export const DEFAULTS = {
  minNoticeHours: 1,
  capacity: 1,
  onlineCancel: true,
  disabledServices: [],
  // Meta de receita do mês e taxa (%) de cada forma de pagamento.
  finance: { goalCents: 0, fees: { pix: 0, dinheiro: 0, debito: 1.99, credito: 4.99, outro: 0 } },
  automations: {
    confirm: { on: true, text: 'Olá, {nome}! Seu agendamento na JV Estética está confirmado: {servico} em {data} às {hora}. Protocolo #{protocolo}.' },
    reminder: { on: true, text: 'Olá, {nome}! Lembrete: hoje às {hora} tem {servico} da sua {veiculo} na JV Estética. Te esperamos!' },
    ready: { on: true, text: 'Olá, {nome}! Sua {veiculo} está pronta para retirada na JV Estética. Protocolo #{protocolo}.' },
    survey: { on: false, text: 'Olá, {nome}! Como ficou sua {veiculo}? De 0 a 10, que nota você dá para o serviço da JV Estética?' },
    return: { on: false, days: 60, text: 'Oi, {nome}! Já faz um tempinho desde o último cuidado com a sua {veiculo}. Que tal agendar o próximo? É só responder esta mensagem.' },
  },
};

export async function getSettings(db) {
  const rows = await db.sql`SELECT value FROM settings WHERE key = 'main'`;
  let saved = {};
  try { saved = rows.length ? JSON.parse(rows[0].value) : {}; } catch { saved = {}; }
  const automations = {};
  for (const kind of KINDS) automations[kind] = { ...DEFAULTS.automations[kind], ...(saved.automations?.[kind] ?? {}) };
  const schedule = {};
  for (const d of Object.keys(DEFAULT_SCHEDULE)) schedule[d] = { ...DEFAULT_SCHEDULE[d], ...(saved.schedule?.[d] ?? {}) };
  const finance = { ...DEFAULTS.finance, ...(saved.finance ?? {}), fees: { ...DEFAULTS.finance.fees, ...(saved.finance?.fees ?? {}) } };
  return { ...DEFAULTS, ...saved, automations, schedule, finance };
}

// Agora em Uberaba: data (AAAA-MM-DD) e minutos desde meia-noite.
export function nowLocal() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date()).map(p => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute) };
}
// O horário já passou do limite de antecedência?
export function tooSoon(date, time, minNoticeHours) {
  const now = nowLocal();
  if (date !== now.date) return date < now.date;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m < now.minutes + minNoticeHours * 60;
}

function validSettings(body, current) {
  const next = structuredClone(current);
  if (body.minNoticeHours !== undefined) {
    if (![0, 1, 2, 4, 12, 24].includes(body.minNoticeHours)) return null;
    next.minNoticeHours = body.minNoticeHours;
  }
  if (body.capacity !== undefined) {
    if (![1, 2, 3].includes(body.capacity)) return null;
    next.capacity = body.capacity;
  }
  if (body.onlineCancel !== undefined) next.onlineCancel = body.onlineCancel === true;
  if (body.finance !== undefined) {
    if (!body.finance || typeof body.finance !== 'object') return null;
    if (body.finance.goalCents !== undefined) {
      if (!Number.isInteger(body.finance.goalCents) || body.finance.goalCents < 0 || body.finance.goalCents > 100_000_000) return null;
      next.finance.goalCents = body.finance.goalCents;
    }
    if (body.finance.fees !== undefined) {
      if (!body.finance.fees || typeof body.finance.fees !== 'object') return null;
      for (const [method, pct] of Object.entries(body.finance.fees)) {
        if (!(method in next.finance.fees) || typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 30) return null;
        next.finance.fees[method] = Math.round(pct * 100) / 100;
      }
    }
  }
  if (body.schedule !== undefined) {
    if (!body.schedule || typeof body.schedule !== 'object') return null;
    for (const [d, day] of Object.entries(body.schedule)) {
      if (!(d in DEFAULT_SCHEDULE) || !day || typeof day !== 'object') return null;
      const merged = { ...next.schedule[d] };
      for (const key of ['open', 'close', 'lunchStart', 'lunchEnd']) {
        if (day[key] === undefined) continue;
        if (!HOUR.test(day[key])) return null;
        merged[key] = day[key];
      }
      if (day.on !== undefined) merged.on = day.on === true;
      if (day.lunch !== undefined) merged.lunch = day.lunch === true;
      if (merged.open >= merged.close) return null;
      if (merged.lunch && (merged.lunchStart >= merged.lunchEnd || merged.lunchStart < merged.open || merged.lunchEnd > merged.close)) return null;
      next.schedule[d] = merged;
    }
  }
  if (body.disabledServices !== undefined) {
    if (!Array.isArray(body.disabledServices) || body.disabledServices.some(s => !SERVICES.has(s))) return null;
    next.disabledServices = [...new Set(body.disabledServices)];
  }
  if (body.automations !== undefined) {
    if (!body.automations || typeof body.automations !== 'object') return null;
    for (const [kind, value] of Object.entries(body.automations)) {
      if (!KINDS.includes(kind) || !value || typeof value !== 'object') return null;
      if (value.on !== undefined) next.automations[kind].on = value.on === true;
      if (value.text !== undefined) {
        if (typeof value.text !== 'string' || !value.text.trim() || value.text.length > 600) return null;
        next.automations[kind].text = value.text.trim();
      }
      if (kind === 'return' && value.days !== undefined) {
        if (![30, 45, 60, 90].includes(value.days)) return null;
        next.automations.return.days = value.days;
      }
    }
  }
  return next;
}

function daysAgo(n) {
  const d = new Date(`${localToday()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// Quem precisa receber mensagem agora (cada item some depois de marcado como enviado).
async function automationQueue(db, settings) {
  const today = localToday();
  const sent = new Set((await db.sql`SELECT kind || ':' || ref AS k FROM message_log WHERE sent_at >= ${daysAgo(120)}`).map(r => r.k));
  const pick = (kind, rows) => rows.filter(r => !sent.has(`${kind}:${r.id}`)).map(r => ({
    kind, ref: r.id, id: r.id, name: r.name, phone: r.phone, vehicle: r.motorcycle, service: r.service, date: r.booking_date, time: r.booking_time,
  }));
  const queue = {
    confirm: pick('confirm', await db.sql`SELECT id, name, phone, motorcycle, service, booking_date, booking_time FROM bookings
      WHERE status IN ('pending', 'confirmed') AND booking_date >= ${today} AND created_at >= ${daysAgo(3)} ORDER BY created_at`),
    reminder: pick('reminder', await db.sql`SELECT id, name, phone, motorcycle, service, booking_date, booking_time FROM bookings
      WHERE status IN ('pending', 'confirmed') AND booking_date = ${today} ORDER BY booking_time`),
    ready: pick('ready', await db.sql`SELECT id, name, phone, motorcycle, service, booking_date, booking_time FROM bookings
      WHERE status = 'ready' ORDER BY booking_date, booking_time`),
    survey: pick('survey', await db.sql`SELECT b.id, b.name, b.phone, b.motorcycle, b.service, b.booking_date, b.booking_time FROM bookings b
      WHERE b.status = 'delivered' AND EXISTS (SELECT 1 FROM booking_events e WHERE e.booking_id = b.id AND e.status = 'delivered' AND e.created_at >= ${daysAgo(3)})`),
    return: [],
  };
  // Retorno: último atendimento há N dias ou mais e nenhum agendamento futuro (por telefone).
  const days = settings.automations.return.days;
  const clients = await db.sql`SELECT phone, name, motorcycle, service, MAX(booking_date) AS last_date
    FROM bookings WHERE status <> 'cancelled' GROUP BY phone`;
  const recentReturn = new Set((await db.sql`SELECT ref FROM message_log WHERE kind = 'return' AND sent_at >= ${daysAgo(days)}`).map(r => r.ref));
  for (const c of clients) {
    const digits = String(c.phone).replace(/\D/g, '');
    if (c.last_date > daysAgo(days) || recentReturn.has(digits)) continue;
    queue.return.push({ kind: 'return', ref: digits, id: null, name: c.name, phone: c.phone, vehicle: c.motorcycle, service: c.service, date: c.last_date, time: '' });
  }
  const totals = await db.sql`SELECT kind, COUNT(*) AS n FROM message_log WHERE sent_at >= ${daysAgo(30)} GROUP BY kind`;
  return { queue, sent30: Object.fromEntries(totals.map(t => [t.kind, t.n])) };
}

export async function settingsRoutes(db, request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // Público: o site usa para esconder serviços desligados e mostrar o cancelamento.
  if (path === '/api/booking-config' && method === 'GET') {
    const s = await getSettings(db);
    const openDays = Object.entries(s.schedule).filter(([, day]) => day.on).map(([d]) => Number(d));
    return json({ disabledServices: s.disabledServices, onlineCancel: s.onlineCancel, minNoticeHours: s.minNoticeHours, openDays }, 200);
  }

  if (path === '/api/admin/settings') {
    if (method === 'GET') {
      const denied = await requireAdmin(db, request);
      if (denied) return denied;
      return json({ settings: await getSettings(db) }, 200);
    }
    if (method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
    const { body, error } = await readJson(request, 8000);
    if (error) return error;
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    const next = validSettings(body, await getSettings(db));
    if (!next) return json({ error: 'Configuração inválida.' }, 400);
    await db.sql`INSERT INTO settings (key, value) VALUES ('main', ${JSON.stringify(next)})
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;
    return json({ settings: next }, 200);
  }

  if (path === '/api/admin/automations' && method === 'GET') {
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    const settings = await getSettings(db);
    return json({ settings: settings.automations, ...(await automationQueue(db, settings)) }, 200);
  }

  if (path === '/api/admin/automations/sent' && method === 'POST') {
    const { body, error } = await readJson(request, 500);
    if (error) return error;
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    const kind = KINDS.includes(body.kind) ? body.kind : '';
    const ref = typeof body.ref === 'string' && /^[A-F0-9]{8}$|^\d{10,13}$/.test(body.ref) ? body.ref : '';
    if (!kind || !ref) return json({ error: 'Mensagem inválida.' }, 400);
    await db.sql`INSERT INTO message_log (kind, ref) VALUES (${kind}, ${ref})`;
    return json({ ok: true }, 201);
  }

  // Cliente cancela pelo app (se o João deixou ligado), até o limite de antecedência.
  if (path === '/api/os/cancel' && method === 'POST') {
    if (await limited(env.LIMIT_OS, request)) return json({ error: 'Muitas tentativas. Aguarde um minuto.' }, 429);
    const { body, error } = await readJson(request, 500);
    if (error) return error;
    if (!isAccessCode(body.code)) return json({ error: 'Agendamento não encontrado.' }, 404);
    const settings = await getSettings(db);
    if (!settings.onlineCancel) return json({ error: 'Para cancelar, fale com a JV pelo WhatsApp.' }, 403);
    const rows = await db.sql`SELECT id, status, booking_date, booking_time FROM bookings WHERE access_hash = ${hashAccessCode(body.code)}`;
    if (!rows.length) return json({ error: 'Agendamento não encontrado.' }, 404);
    const b = rows[0];
    if (!['pending', 'confirmed'].includes(b.status)) return json({ error: 'Esse agendamento não pode mais ser cancelado pelo app.' }, 409);
    if (tooSoon(b.booking_date, b.booking_time, settings.minNoticeHours)) return json({ error: 'Está muito perto do horário. Fale com a JV pelo WhatsApp.' }, 409);
    await db.sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${b.id}`;
    await db.sql`INSERT INTO booking_events (booking_id, status) VALUES (${b.id}, 'cancelled')`;
    return json({ booking: { id: b.id, status: 'cancelled' } }, 200);
  }

  return null;
}
