// Vistoria de chegada, fotos (R2) e confirmação do cliente.
// Painel (/api/admin/...) exige login. Cliente (/api/os/...) usa o código secreto do agendamento.
import { hashAccessCode, isAccessCode } from '../netlify/lib/stages.mjs';
import { readJson, requireAdmin, limited, json, BOOKING_ID } from './http.mjs';

export const ANGLES = ['frente', 'traseira', 'lateral-esquerda', 'lateral-direita', 'painel', 'tanque', 'extra'];
export const ITEMS = ['Riscos', 'Manchas', 'Amassados', 'Peças soltas ou quebradas', 'Outros'];
const KINDS = new Set(['arrival', 'delivery']);
const MAX_PHOTO = 2 * 1024 * 1024; // as fotos chegam comprimidas do navegador (~300 KB)
const MAX_PHOTOS_PER_BOOKING = 30;
const PHOTO_ID = /^[a-f0-9]{32}$/;

// Confere o tipo real pelo começo do arquivo (não confia no nome nem no tipo enviado).
function imageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  const text = String.fromCharCode(...bytes.slice(0, 12));
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

// Vistoria e lista de fotos de um agendamento (sem dados pessoais).
export async function inspectionFor(db, bookingId) {
  const rows = await db.sql`SELECT items, notes, confirmed_at FROM inspections WHERE booking_id = ${bookingId}`;
  const photos = await db.sql`SELECT id, kind, angle, created_at FROM photos WHERE booking_id = ${bookingId} ORDER BY created_at, id`;
  return {
    inspection: rows.length
      ? { items: JSON.parse(rows[0].items), notes: rows[0].notes, confirmedAt: rows[0].confirmed_at }
      : null,
    photos: photos.map(p => ({ id: p.id, kind: p.kind, angle: p.angle, at: p.created_at })),
  };
}

async function bookingByCode(db, code) {
  if (!isAccessCode(code)) return null;
  const rows = await db.sql`SELECT id FROM bookings WHERE access_hash = ${hashAccessCode(code)}`;
  return rows[0]?.id ?? null;
}

async function isConfirmed(db, bookingId) {
  const rows = await db.sql`SELECT confirmed_at FROM inspections WHERE booking_id = ${bookingId}`;
  return Boolean(rows[0]?.confirmed_at);
}

async function photoResponse(env, db, photoId, bookingId) {
  if (!PHOTO_ID.test(photoId ?? '')) return json({ error: 'Foto não encontrada.' }, 404);
  const rows = bookingId
    ? await db.sql`SELECT object_key, content_type FROM photos WHERE id = ${photoId} AND booking_id = ${bookingId}`
    : await db.sql`SELECT object_key, content_type FROM photos WHERE id = ${photoId}`;
  if (!rows.length) return json({ error: 'Foto não encontrada.' }, 404);
  if (!env.PHOTOS) return json({ error: 'Foto não encontrada.' }, 404);
  const object = await env.PHOTOS.get(rows[0].object_key);
  if (!object) return json({ error: 'Foto não encontrada.' }, 404);
  return new Response(object.body, {
    headers: {
      'Content-Type': rows[0].content_type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}

export async function inspectionRoutes(db, request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // ---------- Painel ----------
  if (path === '/api/admin/inspection' && method === 'GET') {
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    const id = url.searchParams.get('id') ?? '';
    if (!BOOKING_ID.test(id)) return json({ error: 'Agendamento inválido.' }, 400);
    return json(await inspectionFor(db, id), 200);
  }

  if (path === '/api/admin/inspection' && method === 'POST') {
    const { body, error } = await readJson(request, 6000);
    if (error) return error;
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    const id = typeof body.id === 'string' ? body.id : '';
    if (!BOOKING_ID.test(id)) return json({ error: 'Agendamento inválido.' }, 400);
    if (!Array.isArray(body.items) || body.items.length > ITEMS.length) return json({ error: 'Checklist inválido.' }, 400);
    const items = [];
    for (const raw of body.items) {
      if (!raw || !ITEMS.includes(raw.item)) return json({ error: 'Checklist inválido.' }, 400);
      const note = typeof raw.note === 'string' ? raw.note.trim() : '';
      if (note.length > 200) return json({ error: 'Cada observação pode ter até 200 caracteres.' }, 400);
      items.push({ item: raw.item, damage: raw.damage === true, note });
    }
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (notes.length > 1000) return json({ error: 'A observação geral pode ter até 1000 caracteres.' }, 400);
    const booking = await db.sql`SELECT status FROM bookings WHERE id = ${id}`;
    if (!booking.length) return json({ error: 'Agendamento não encontrado.' }, 404);
    if (booking[0].status === 'cancelled') return json({ error: 'Agendamento cancelado.' }, 409);
    if (await isConfirmed(db, id)) return json({ error: 'O cliente já confirmou a vistoria; ela não pode mais ser alterada.' }, 409);
    await db.sql`INSERT INTO inspections (booking_id, items, notes) VALUES (${id}, ${JSON.stringify(items)}, ${notes})
      ON CONFLICT (booking_id) DO UPDATE SET items = excluded.items, notes = excluded.notes,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE inspections.confirmed_at IS NULL`;
    return json(await inspectionFor(db, id), 200);
  }

  if (path === '/api/admin/photos' && method === 'POST') {
    // Enquanto o R2 não estiver ativado na conta, as fotos ficam indisponíveis.
    if (!env.PHOTOS) return json({ error: 'Envio de fotos ainda não ativado no servidor.' }, 503);
    if (Number(request.headers.get('content-length') ?? 0) > MAX_PHOTO + 4096) return json({ error: 'Foto muito grande (máximo 2 MB).' }, 413);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')) return json({ error: 'Formato de pedido inválido.' }, 415);
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    let form;
    try { form = await request.formData(); } catch { return json({ error: 'Não foi possível ler a foto.' }, 400); }
    const id = String(form.get('id') ?? '');
    const kind = String(form.get('kind') ?? '');
    const angle = String(form.get('angle') ?? '');
    const file = form.get('file');
    if (!BOOKING_ID.test(id) || !KINDS.has(kind) || !ANGLES.includes(angle)) return json({ error: 'Dados da foto inválidos.' }, 400);
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Envie uma foto.' }, 400);
    if (file.size > MAX_PHOTO) return json({ error: 'Foto muito grande (máximo 2 MB).' }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = imageType(bytes);
    if (!type) return json({ error: 'Envie uma imagem JPG, PNG ou WebP.' }, 415);
    const booking = await db.sql`SELECT status FROM bookings WHERE id = ${id}`;
    if (!booking.length) return json({ error: 'Agendamento não encontrado.' }, 404);
    if (booking[0].status === 'cancelled') return json({ error: 'Agendamento cancelado.' }, 409);
    if (kind === 'arrival' && (await isConfirmed(db, id))) return json({ error: 'O cliente já confirmou a vistoria; não dá para trocar as fotos de chegada.' }, 409);
    const count = await db.sql`SELECT COUNT(*) AS n FROM photos WHERE booking_id = ${id}`;
    if (count[0].n >= MAX_PHOTOS_PER_BOOKING) return json({ error: `Limite de ${MAX_PHOTOS_PER_BOOKING} fotos por agendamento.` }, 409);
    const photoId = crypto.randomUUID().replaceAll('-', '');
    const ext = type.split('/')[1];
    const key = `${id}/${kind}/${photoId}.${ext}`;
    await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: type } });
    try {
      await db.sql`INSERT INTO photos (id, booking_id, kind, angle, object_key, content_type) VALUES (${photoId}, ${id}, ${kind}, ${angle}, ${key}, ${type})`;
    } catch (err) {
      await env.PHOTOS.delete(key);
      throw err;
    }
    return json({ photo: { id: photoId, kind, angle } }, 201);
  }

  if (path === '/api/admin/photos/delete' && method === 'POST') {
    const { body, error } = await readJson(request, 500);
    if (error) return error;
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    const photoId = typeof body.photoId === 'string' ? body.photoId : '';
    if (!PHOTO_ID.test(photoId)) return json({ error: 'Foto não encontrada.' }, 404);
    const rows = await db.sql`SELECT booking_id, kind, object_key FROM photos WHERE id = ${photoId}`;
    if (!rows.length) return json({ error: 'Foto não encontrada.' }, 404);
    if (rows[0].kind === 'arrival' && (await isConfirmed(db, rows[0].booking_id))) return json({ error: 'O cliente já confirmou a vistoria; as fotos de chegada ficam guardadas.' }, 409);
    await db.sql`DELETE FROM photos WHERE id = ${photoId}`;
    await env.PHOTOS?.delete(rows[0].object_key);
    return json({ ok: true }, 200);
  }

  if (path.startsWith('/api/admin/photo/') && method === 'GET') {
    const denied = await requireAdmin(db, request);
    if (denied) return denied;
    return photoResponse(env, db, path.slice('/api/admin/photo/'.length), null);
  }

  // ---------- Cliente ----------
  if (path === '/api/os/photo' && method === 'POST') {
    if (await limited(env.LIMIT_OS, request)) return json({ error: 'Muitas consultas. Aguarde um minuto.' }, 429);
    const { body, error } = await readJson(request, 500);
    if (error) return error;
    const bookingId = await bookingByCode(db, body.code);
    if (!bookingId) return json({ error: 'Agendamento não encontrado.' }, 404);
    return photoResponse(env, db, body.photoId, bookingId);
  }

  if (path === '/api/os/confirm' && method === 'POST') {
    if (await limited(env.LIMIT_OS, request)) return json({ error: 'Muitas consultas. Aguarde um minuto.' }, 429);
    const { body, error } = await readJson(request, 500);
    if (error) return error;
    const bookingId = await bookingByCode(db, body.code);
    if (!bookingId) return json({ error: 'Agendamento não encontrado.' }, 404);
    const rows = await db.sql`SELECT confirmed_at FROM inspections WHERE booking_id = ${bookingId}`;
    if (!rows.length) return json({ error: 'A vistoria ainda não foi feita.' }, 409);
    if (!rows[0].confirmed_at) {
      await db.sql`UPDATE inspections SET confirmed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE booking_id = ${bookingId} AND confirmed_at IS NULL`;
    }
    return json(await inspectionFor(db, bookingId), 200);
  }

  return null;
}
