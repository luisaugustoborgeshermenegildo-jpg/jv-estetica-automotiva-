// API da JV no Worker (D1). Mesmas rotas e regras das funções da Netlify.
import {
  adminMode, configuredPassword, readAdminCredential, matchesSetupToken, validAdminPassword,
  makePasswordRecord, createSessionCookie, clearSessionCookie,
} from '../netlify/lib/admin-session.mjs';
import { STATUSES, newAccessCode, hashAccessCode, isAccessCode } from '../netlify/lib/stages.mjs';
import { TIMES, SERVICES, ENGINES, MOTO_ENGINES, MOTO_ONLY_SERVICES, OPEN_DAYS, localToday } from './rules.mjs';
import { d1, isUnique, limited, readJson, requireAdmin, json } from './http.mjs';
import { inspectionRoutes, inspectionFor } from './inspection.mjs';

export async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;
  const db = d1(env.DB);
  try {
    if (path === '/health') return json({ status: 'ok' }, 200);
    if (path === '/api/availability') return method === 'GET' ? availability(db, url) : json({ error: 'Método não permitido.' }, 405);
    if (path === '/api/bookings') return method === 'POST' ? createBooking(db, request, env) : json({ error: 'Método não permitido.' }, 405);
    if (path === '/api/os') return method === 'POST' ? serviceOrder(db, request, env) : json({ error: 'Método não permitido.' }, 405);
    if (path === '/api/admin/bookings') return method === 'GET' ? adminBookings(db, request) : json({ error: 'Método não permitido.' }, 405);
    if (path === '/api/admin/bookings/status') return method === 'POST' ? adminStatus(db, request) : json({ error: 'Método não permitido.' }, 405);
    const inspection = await inspectionRoutes(db, request, env, url);
    if (inspection) return inspection;
    if (['/api/admin/status', '/api/admin/login', '/api/admin/logout', '/api/admin/setup'].includes(path)) return adminAuth(db, request, env, path);
    return json({ error: 'Não encontrado.' }, 404);
  } catch (error) {
    console.error('Erro na API:', path, error?.message ?? 'erro desconhecido');
    return json({ error: 'Serviço indisponível no momento. Tente novamente em instantes.' }, 503);
  }
}

async function availability(db, url) {
  const selected = url.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selected)) return json({ error: 'Informe uma data válida.' }, 400);
  const parsed = new Date(`${selected}T12:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== selected) return json({ error: 'Informe uma data válida.' }, 400);
  if (selected < localToday() || !OPEN_DAYS.has(parsed.getUTCDay())) return json({ slots: [] }, 200);
  const rows = await db.sql`SELECT booking_time FROM bookings WHERE booking_date = ${selected} AND status <> 'cancelled'`;
  const busy = new Set(rows.map(row => row.booking_time));
  return json({ slots: [...TIMES].map(time => ({ time, available: !busy.has(time) })) }, 200);
}

async function createBooking(db, request, env) {
  if (await limited(env.LIMIT_BOOKING, request)) return json({ error: 'Muitas tentativas. Aguarde um minuto.' }, 429);
  const { body, error } = await readJson(request, 8000);
  if (error) return error;
  if (String(body.website ?? '').trim()) return json({ error: 'Não foi possível enviar o pedido.' }, 400);
  if (body.consent !== 'yes') return json({ error: 'Confirme a autorização de uso dos dados para este agendamento.' }, 400);

  const keys = ['name', 'phone', 'motorcycle', 'service', 'engine', 'date', 'time', 'notes'];
  const f = Object.fromEntries(keys.map(key => [key, typeof body[key] === 'string' ? body[key].trim() : '']));
  if (keys.slice(0, 7).some(key => !f[key])) return json({ error: 'Preencha todos os campos obrigatórios.' }, 400);
  if (!SERVICES.has(f.service) || !ENGINES.has(f.engine) || !TIMES.has(f.time)) return json({ error: 'Serviço, cilindrada/porte ou horário inválido.' }, 400);
  if (MOTO_ONLY_SERVICES.has(f.service) && !MOTO_ENGINES.has(f.engine)) return json({ error: 'Esse serviço adicional é só para motos.' }, 400);
  if (f.name.length > 80 || f.phone.length > 20 || f.motorcycle.length > 80 || f.notes.length > 500) return json({ error: 'Revise os campos: um deles excede o tamanho permitido.' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return json({ error: 'Informe uma data válida.' }, 400);
  const chosen = new Date(`${f.date}T12:00:00Z`);
  if (Number.isNaN(chosen.valueOf()) || chosen.toISOString().slice(0, 10) !== f.date || f.date < localToday() || !OPEN_DAYS.has(chosen.getUTCDay())) return json({ error: 'A data escolhida não está disponível. Selecione outro dia.' }, 400);
  const digits = (f.phone.match(/\d/g) ?? []).length;
  if (!/^\+?[\d\s().-]+$/.test(f.phone) || digits < 10 || digits > 13) return json({ error: 'Informe um número de WhatsApp válido.' }, 400);

  const id = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  const access = newAccessCode();
  try {
    await db.sql`INSERT INTO bookings (id, name, phone, motorcycle, service, engine, booking_date, booking_time, notes, access_hash)
      VALUES (${id}, ${f.name}, ${f.phone}, ${f.motorcycle}, ${f.service}, ${f.engine}, ${f.date}, ${f.time}, ${f.notes}, ${hashAccessCode(access)})`;
  } catch (err) {
    if (isUnique(err)) return json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, 409);
    throw err;
  }
  await db.sql`INSERT INTO booking_events (booking_id, status) VALUES (${id}, 'pending')`;
  return json({ booking: { id, status: 'pending', access } }, 201);
}

async function serviceOrder(db, request, env) {
  if (await limited(env.LIMIT_OS, request)) return json({ error: 'Muitas consultas. Aguarde um minuto.' }, 429);
  const { body, error } = await readJson(request, 500);
  if (error) return error;
  if (!isAccessCode(body.code)) return json({ error: 'Agendamento não encontrado.' }, 404);
  const rows = await db.sql`SELECT id, service, booking_date, booking_time, status FROM bookings WHERE access_hash = ${hashAccessCode(body.code)}`;
  if (!rows.length) return json({ error: 'Agendamento não encontrado.' }, 404);
  const row = rows[0];
  const events = await db.sql`SELECT status, created_at FROM booking_events WHERE booking_id = ${row.id} ORDER BY id`;
  return json({
    order: {
      id: row.id,
      service: row.service,
      date: row.booking_date,
      time: row.booking_time,
      status: row.status,
      events: events.map(e => ({ status: e.status, at: e.created_at })),
      ...(await inspectionFor(db, row.id)),
    },
  }, 200);
}

async function adminBookings(db, request) {
  const denied = await requireAdmin(db, request);
  if (denied) return denied;
  const rows = await db.sql`SELECT id, name, phone, motorcycle, service, engine, booking_date, booking_time, notes, status, created_at
    FROM bookings
    ORDER BY CASE WHEN booking_date >= ${localToday()} THEN 0 ELSE 1 END, booking_date ASC, booking_time ASC, created_at DESC
    LIMIT 250`;
  return json({
    bookings: rows.map(row => ({
      id: row.id, name: row.name, phone: row.phone, motorcycle: row.motorcycle, service: row.service,
      engine: row.engine, date: row.booking_date, time: row.booking_time, notes: row.notes,
      status: row.status, createdAt: row.created_at,
    })),
  }, 200);
}

async function adminStatus(db, request) {
  const { body, error } = await readJson(request, 500);
  if (error) return error;
  const id = typeof body.id === 'string' ? body.id : '';
  const status = typeof body.status === 'string' ? body.status : '';
  if (!/^[A-F0-9]{8}$/.test(id) || !STATUSES.has(status)) return json({ error: 'Agendamento ou etapa inválida.' }, 400);
  const denied = await requireAdmin(db, request);
  if (denied) return denied;
  try {
    const changed = await db.sql`UPDATE bookings SET status = ${status} WHERE id = ${id} AND status <> ${status} RETURNING id`;
    if (changed.length) {
      await db.sql`INSERT INTO booking_events (booking_id, status) VALUES (${id}, ${status})`;
    } else if (!(await db.sql`SELECT 1 FROM bookings WHERE id = ${id}`).length) {
      return json({ error: 'Agendamento não encontrado.' }, 404);
    }
  } catch (err) {
    if (isUnique(err)) return json({ error: 'Esse horário já foi ocupado por outro agendamento.' }, 409);
    throw err;
  }
  return json({ booking: { id, status } }, 200);
}

async function adminAuth(db, request, env, path) {
  if (path === '/api/admin/logout') {
    if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
    return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }
  if (path === '/api/admin/status') {
    if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, 405);
    return json({ mode: await adminMode(db) }, 200);
  }
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (await limited(env.LIMIT_ADMIN, request)) return json({ error: 'Muitas tentativas. Aguarde um minuto.' }, 429);
  const { body, error } = await readJson(request, 2048);
  if (error) return error;

  if (path === '/api/admin/setup') {
    if (configuredPassword()) return json({ error: 'O painel já foi configurado. Entre com a senha administrativa.' }, 409);
    if (!matchesSetupToken(body.code)) return json({ error: 'Código de ativação incorreto.' }, 401);
    if (!validAdminPassword(body.password)) return json({ error: 'Crie uma senha com pelo menos 12 e no máximo 128 caracteres.' }, 400);
    if (await readAdminCredential(db)) return json({ error: 'O painel já foi configurado. Entre com a senha administrativa.' }, 409);
    const credential = await makePasswordRecord(body.password);
    try {
      await db.sql`INSERT INTO admin_credentials (id, salt, password_hash) VALUES (1, ${credential.salt}, ${credential.hash})`;
    } catch (err) {
      if (isUnique(err) || /constraint/i.test(err?.message ?? '')) return json({ error: 'O painel acabou de ser configurado. Entre com a senha que você criou.' }, 409);
      throw err;
    }
    return json({ ok: true }, 201, { 'Set-Cookie': createSessionCookie(credential.hash) });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length > 128) return json({ error: 'Senha incorreta.' }, 401);
  const credential = await readAdminCredential(db);
  if (!credential) return json({ error: 'O painel ainda não foi configurado.' }, 503);
  if (!(await credential.verify(password))) return json({ error: 'Senha incorreta.' }, 401);
  return json({ ok: true }, 200, { 'Set-Cookie': createSessionCookie(credential.sessionKey) });
}
