import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'jv_admin';
const SESSION_SECONDS = 12 * 60 * 60;

export function configuredPassword() {
  const password = process.env.ADMIN_PASSWORD ?? '';
  return password.length >= 16 ? password : null;
}

export function matchesPassword(candidate, password) {
  const received = createHash('sha256').update(candidate).digest();
  const expected = createHash('sha256').update(password).digest();
  return timingSafeEqual(received, expected);
}

function signature(expires, password) {
  return createHmac('sha256', password).update(`${COOKIE}.${expires}`).digest('hex');
}

export function createSessionCookie(password) {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const value = `${expires}.${signature(expires, password)}`;
  return `${COOKIE}=${value}; Max-Age=${SESSION_SECONDS}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Max-Age=0; Path=/api/admin; HttpOnly; Secure; SameSite=Strict`;
}

export function hasAdminSession(request, password) {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const [expires, received] = match.slice(COOKIE.length + 1).split('.');
  if (!/^\d{10}$/.test(expires ?? '') || !/^[0-9a-f]{64}$/.test(received ?? '') || Number(expires) <= Date.now() / 1000) return false;
  const expected = signature(expires, password);
  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
}

export function json(body, status, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
