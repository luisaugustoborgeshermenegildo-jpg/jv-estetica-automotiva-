// Crescimento (painel): orçamentos, pátio, estoque e indicadores de vendas.
// Tudo exige login de admin. Valores em centavos (inteiros) para não errar conta.
import { readJson, requireAdmin, json, BOOKING_ID } from './http.mjs';
import { localToday } from './rules.mjs';

const QUOTE_ID = /^[A-F0-9]{8}$/;
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cents = v => (Number.isInteger(v) && v >= 0 && v <= 100_000_00 ? v : null);
const qty = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1_000_000 ? Math.round(v * 1000) / 1000 : null);

async function overview(db) {
  const month = `${localToday().slice(0, 7)}%`;
  const quotes = await db.sql`SELECT id, customer, phone, vehicle, model, service, amount_cents, valid_until, notes, status, created_at, decided_at
    FROM quotes ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC LIMIT 100`;
  const products = await db.sql`SELECT id, name, unit, quantity, minimum, unit_cost_cents FROM products ORDER BY name`;
  const moves = await db.sql`SELECT m.id, m.kind, m.quantity, m.unit_cost_cents, m.booking_id, m.reason, m.created_at, p.name, p.unit
    FROM stock_moves m JOIN products p ON p.id = m.product_id ORDER BY m.id DESC LIMIT 100`;
  const yard = await db.sql`SELECT id, name, motorcycle, service, status, spot, booking_date, booking_time
    FROM bookings WHERE status IN ('received', 'washing', 'ready') ORDER BY booking_date, booking_time`;
  const decided = await db.sql`SELECT
      SUM(status = 'open') AS open,
      SUM(status = 'approved') AS approved,
      SUM(status = 'declined') AS declined,
      SUM(CASE WHEN status = 'approved' AND decided_at LIKE ${month} THEN amount_cents ELSE 0 END) AS approved_month
    FROM quotes`;
  const material = await db.sql`SELECT COALESCE(SUM(quantity * unit_cost_cents), 0) AS cost
    FROM stock_moves WHERE kind = 'out' AND created_at LIKE ${month}`;
  const d = decided[0] ?? {};
  const closed = (d.approved ?? 0) + (d.declined ?? 0);
  return {
    quotes: quotes.map(q => ({
      id: q.id, customer: q.customer, phone: q.phone, vehicle: q.vehicle, model: q.model, service: q.service,
      amountCents: q.amount_cents, validUntil: q.valid_until, notes: q.notes, status: q.status,
      createdAt: q.created_at, decidedAt: q.decided_at,
    })),
    products: products.map(p => ({ id: p.id, name: p.name, unit: p.unit, quantity: p.quantity, minimum: p.minimum, unitCostCents: p.unit_cost_cents })),
    moves: moves.map(m => ({
      id: m.id, kind: m.kind, quantity: m.quantity, unitCostCents: m.unit_cost_cents, bookingId: m.booking_id,
      reason: m.reason, at: m.created_at, product: m.name, unit: m.unit,
    })),
    yard: yard.map(b => ({ id: b.id, name: b.name, vehicle: b.motorcycle, service: b.service, status: b.status, spot: b.spot, date: b.booking_date, time: b.booking_time })),
    sales: {
      openQuotes: d.open ?? 0,
      closingRate: closed ? Math.round(((d.approved ?? 0) / closed) * 100) : null,
      approvedMonthCents: d.approved_month ?? 0,
      lowStock: products.filter(p => p.quantity <= p.minimum && p.minimum > 0).length,
      materialMonthCents: Math.round(material[0]?.cost ?? 0),
    },
  };
}

export async function growthRoutes(db, request, url) {
  const path = url.pathname;
  if (!path.startsWith('/api/admin/growth') && !['/api/admin/quotes', '/api/admin/quotes/status', '/api/admin/products', '/api/admin/stock', '/api/admin/yard'].includes(path)) return null;

  if (path === '/api/admin/growth') {
    if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, 405);
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    return json(await overview(db), 200);
  }

  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const { body, error } = await readJson(request, 4000);
  if (error) return error;
  const denied = await requireAdmin(db, request);
  if (denied) return denied;

  if (path === '/api/admin/quotes') {
    const customer = text(body.customer, 80);
    const phone = text(body.phone, 20);
    const vehicle = body.vehicle === 'carro' ? 'carro' : body.vehicle === 'moto' ? 'moto' : '';
    const model = text(body.model, 80);
    const service = text(body.service, 120);
    const amount = cents(body.amountCents);
    const notes = text(body.notes, 500);
    const validUntil = typeof body.validUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.validUntil) ? body.validUntil : null;
    if (!customer || !vehicle || !service || amount === null) return json({ error: 'Preencha cliente, veículo, serviço e valor.' }, 400);
    if (phone && !/^\+?[\d\s().-]{10,20}$/.test(phone)) return json({ error: 'WhatsApp inválido.' }, 400);
    const id = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
    await db.sql`INSERT INTO quotes (id, customer, phone, vehicle, model, service, amount_cents, valid_until, notes)
      VALUES (${id}, ${customer}, ${phone}, ${vehicle}, ${model}, ${service}, ${amount}, ${validUntil}, ${notes})`;
    return json(await overview(db), 201);
  }

  if (path === '/api/admin/quotes/status') {
    const id = typeof body.id === 'string' ? body.id : '';
    const status = ['open', 'approved', 'declined'].includes(body.status) ? body.status : '';
    if (!QUOTE_ID.test(id) || !status) return json({ error: 'Orçamento ou situação inválida.' }, 400);
    const changed = await db.sql`UPDATE quotes SET status = ${status},
      decided_at = CASE WHEN ${status} = 'open' THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%SZ', 'now') END
      WHERE id = ${id} RETURNING id`;
    if (!changed.length) return json({ error: 'Orçamento não encontrado.' }, 404);
    return json(await overview(db), 200);
  }

  if (path === '/api/admin/products') {
    const name = text(body.name, 80);
    const unit = text(body.unit, 10) || 'un';
    const quantity = qty(body.quantity);
    const minimum = qty(body.minimum);
    const unitCost = cents(body.unitCostCents);
    if (!name || quantity === null || minimum === null || unitCost === null) return json({ error: 'Preencha produto, quantidade, mínimo e custo.' }, 400);
    try {
      await db.sql`INSERT INTO products (name, unit, quantity, minimum, unit_cost_cents) VALUES (${name}, ${unit}, ${quantity}, ${minimum}, ${unitCost})`;
    } catch (err) {
      if (/UNIQUE/i.test(err?.message ?? '')) return json({ error: 'Já existe um produto com esse nome.' }, 409);
      throw err;
    }
    return json(await overview(db), 201);
  }

  if (path === '/api/admin/stock') {
    const productId = Number.isInteger(body.productId) ? body.productId : 0;
    const kind = body.kind === 'in' ? 'in' : body.kind === 'out' ? 'out' : '';
    const quantity = qty(body.quantity);
    const reason = text(body.reason, 200);
    const bookingId = typeof body.bookingId === 'string' && body.bookingId ? body.bookingId : null;
    if (!productId || !kind || !quantity) return json({ error: 'Escolha o produto, o tipo e a quantidade.' }, 400);
    if (bookingId && !BOOKING_ID.test(bookingId)) return json({ error: 'OS inválida.' }, 400);
    const rows = await db.sql`SELECT quantity, unit_cost_cents FROM products WHERE id = ${productId}`;
    if (!rows.length) return json({ error: 'Produto não encontrado.' }, 404);
    if (kind === 'out' && rows[0].quantity < quantity) return json({ error: `Estoque insuficiente: há ${rows[0].quantity}.` }, 409);
    if (bookingId && !(await db.sql`SELECT 1 FROM bookings WHERE id = ${bookingId}`).length) return json({ error: 'OS não encontrada.' }, 404);
    const delta = kind === 'in' ? quantity : -quantity;
    // Atualiza só se ainda houver saldo (evita estoque negativo com dois cliques ao mesmo tempo).
    const updated = await db.sql`UPDATE products SET quantity = quantity + ${delta}
      WHERE id = ${productId} AND quantity + ${delta} >= 0 RETURNING id`;
    if (!updated.length) return json({ error: 'Estoque insuficiente.' }, 409);
    await db.sql`INSERT INTO stock_moves (product_id, kind, quantity, unit_cost_cents, booking_id, reason)
      VALUES (${productId}, ${kind}, ${quantity}, ${rows[0].unit_cost_cents}, ${bookingId}, ${reason})`;
    return json(await overview(db), 201);
  }

  if (path === '/api/admin/yard') {
    const id = typeof body.id === 'string' ? body.id : '';
    const spot = text(body.spot, 20);
    if (!BOOKING_ID.test(id)) return json({ error: 'Agendamento inválido.' }, 400);
    const changed = await db.sql`UPDATE bookings SET spot = ${spot} WHERE id = ${id} AND status IN ('received', 'washing', 'ready') RETURNING id`;
    if (!changed.length) return json({ error: 'Esse veículo não está no pátio.' }, 404);
    return json(await overview(db), 200);
  }

  return json({ error: 'Não encontrado.' }, 404);
}

