import { configuredPassword, matchesPassword, createSessionCookie, clearSessionCookie, json } from '../lib/admin-session.mjs';

export const config = {
  path: ['/api/admin/login', '/api/admin/logout'],
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: 'ip' },
};

export default async request => {
  const password = configuredPassword();
  if (!password) return json({ error: 'O acesso administrativo ainda não foi configurado.' }, 503);

  if (new URL(request.url).pathname === '/api/admin/logout') {
    if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
    return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }

  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Formato inválido.' }, 415);
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 1024) return json({ error: 'Dados inválidos.' }, 413);
  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 1024) return json({ error: 'Dados inválidos.' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: 'Dados inválidos.' }, 400); }
  if (typeof body?.password !== 'string' || body.password.length > 256 || !matchesPassword(body.password, password)) {
    return json({ error: 'Senha incorreta.' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': createSessionCookie(password) });
};
