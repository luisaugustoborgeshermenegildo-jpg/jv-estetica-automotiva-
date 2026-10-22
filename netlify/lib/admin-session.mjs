import { randomBytes, scrypt as scryptCallback, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const COOKIE = 'jv_admin';
const SESSION_SECONDS = 12 * 60 * 60;
const PASSWORD_BYTES = 64;

export function configuredPassword() {
  const password = process.env.ADMIN_PASSWORD ?? '';
  return password.length >= 16 ? password : null;
}

function safeEqual(left, right) {
  const a = createHash('sha256').update(left).digest();
  const b = createHash('sha256').update(right).digest();
  return timingSafeEqual(a, b);
}

export async function readAdminCredential(db) {
  const environmentPassword = configuredPassword();
  if (environmentPassword) {
    return {
      kind: 'environment',
      sessionKey: createHash('sha256').update(`jv-admin:${environmentPassword}`).digest('hex'),
      verify: candidate => safeEqual(candidate, environmentPassword),
    };
  }
  const rows = await db.sql`SELECT salt, password_hash FROM admin_credentials WHERE id = 1`;
  if (!rows.length) return null;
  const { salt, password_hash: passwordHash } = rows[0];
  return {
    kind: 'database',
    sessionKey: passwordHash,
    verify: async candidate => {
      const actual = await scrypt(candidate, Buffer.from(salt, 'hex'), PASSWORD_BYTES);
      return timingSafeEqual(actual, Buffer.from(passwordHash, 'hex'));
    },
  };
}

export async function adminMode(db) {
  if (configuredPassword()) return 'login';
  if (await readAdminCredential(db)) return 'login';
  const setupToken = process.env.ADMIN_SETUP_TOKEN ?? '';
  return setupToken.length >= 32 ? 'setup' : 'disabled';
}

export function validAdminPassword(password) {
  return typeof password === 'string' && password.length >= 16 && password.length <= 128;
}

export function matchesSetupToken(candidate) {
  const configured = process.env.ADMIN_SETUP_TOKEN ?? '';
  if (configured.length < 32 || typeof candidate !== 'string' || candidate.length > 256) return false;
  return safeEqual(candidate, configured);
}

export async function makePasswordRecord(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, PASSWORD_BYTES);
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}

function signature(expires, sessionKey) {
  return createHmac('sha256', sessionKey).update(`${COOKIE}.${expires}`).digest('hex');
}

export function createSessionCookie(sessionKey) {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const value = `${expires}.${signature(expires, sessionKey)}`;
  return `${COOKIE}=${value}; Max-Age=${SESSION_SECONDS}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Max-Age=0; Path=/api/admin; HttpOnly; Secure; SameSite=Strict`;
}

export function hasAdminSession(request, sessionKey) {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const [expires, received] = match.slice(COOKIE.length + 1).split('.');
  if (!/^\d{10}$/.test(expires ?? '') || !/^[0-9a-f]{64}$/.test(received ?? '') || Number(expires) <= Date.now() / 1000) return false;
  const expected = signature(expires, sessionKey);
  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
}

export function json(body, status, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
