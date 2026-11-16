// Utilidades da API no Worker: banco D1, leitura de JSON e limite de tentativas.
export { json } from '../netlify/lib/admin-session.mjs';
import { json } from '../netlify/lib/admin-session.mjs';
import { readAdminCredential, hasAdminSession } from '../netlify/lib/admin-session.mjs';

// db.sql`...` igual ao da Netlify, por cima do D1 (valores sempre como parâmetros).
export function d1(DB) {
  return {
    sql: async (strings, ...values) => {
      const result = await DB.prepare(strings.join('?')).bind(...values.map(v => (v === undefined ? null : v))).all();
      return result.results;
    },
  };
}

export const isUnique = error => /UNIQUE constraint failed/i.test(error?.message ?? '');
const ip = request => request.headers.get('cf-connecting-ip') ?? 'local';

export async function limited(limiter, request) {
  if (!limiter) return false;
  const { success } = await limiter.limit({ key: ip(request) });
  return !success;
}

export async function readJson(request, max) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return { error: json({ error: 'Formato de pedido inválido.' }, 415) };
  if (Number(request.headers.get('content-length') ?? 0) > max) return { error: json({ error: 'Dados inválidos.' }, 413) };
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > max) return { error: json({ error: 'Dados inválidos.' }, 413) };
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: json({ error: 'Dados inválidos.' }, 400) };
    return { body };
  } catch {
    return { error: json({ error: 'Não foi possível ler os dados enviados.' }, 400) };
  }
}

export async function requireAdmin(db, request) {
  const credential = await readAdminCredential(db);
  if (!credential) return json({ error: 'O painel ainda não foi configurado.' }, 503);
  if (!hasAdminSession(request, credential.sessionKey)) return json({ error: 'Entre novamente para continuar.' }, 401);
  return null;
}

export const BOOKING_ID = /^[A-F0-9]{8}$/;
