import { getDatabase } from '@netlify/database';
import {
  adminMode, configuredPassword, readAdminCredential, matchesSetupToken, validAdminPassword,
  makePasswordRecord, createSessionCookie, clearSessionCookie, json,
} from '../lib/admin-session.mjs';

export const config = {
  path: ['/api/admin/status', '/api/admin/login', '/api/admin/logout', '/api/admin/setup'],
  rateLimit: { windowLimit: 8, windowSize: 60, aggregateBy: 'ip' },
};

async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null;
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 2048) return null;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2048) return null;
    const body = JSON.parse(raw);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { return null; }
}

export default async request => {
  const path = new URL(request.url).pathname;
  if (path === '/api/admin/logout') {
    if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
    return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }

  let db;
  try {
    db = getDatabase();
  } catch {
    return json({ error: 'O banco online ainda não está disponível.' }, 503);
  }

  if (path === '/api/admin/status') {
    if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, 405);
    try { return json({ mode: await adminMode(db) }); }
    catch (error) {
      console.error('Erro ao verificar configuração administrativa:', error?.message ?? 'erro desconhecido');
      return json({ error: 'O banco online ainda não está preparado para o painel.' }, 503);
    }
  }

  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const body = await readBody(request);
  if (!body) return json({ error: 'Dados inválidos.' }, 400);

  if (path === '/api/admin/setup') {
    if (configuredPassword()) return json({ error: 'O painel já foi configurado. Entre com a senha administrativa.' }, 409);
    if (!matchesSetupToken(body.code)) return json({ error: 'Código de ativação incorreto.' }, 401);
    if (!validAdminPassword(body.password)) return json({ error: 'Crie uma senha com pelo menos 12 e no máximo 128 caracteres.' }, 400);
    try {
      if (await readAdminCredential(db)) return json({ error: 'O painel já foi configurado. Entre com a senha administrativa.' }, 409);
      const credential = await makePasswordRecord(body.password);
      await db.sql`INSERT INTO admin_credentials (id, salt, password_hash) VALUES (1, ${credential.salt}, ${credential.hash})`;
      return json({ ok: true }, 201, { 'Set-Cookie': createSessionCookie(credential.hash) });
    } catch (error) {
      if (error?.code === '23505') return json({ error: 'O painel acabou de ser configurado. Entre com a senha que você criou.' }, 409);
      console.error('Erro ao configurar acesso administrativo:', error?.message ?? 'erro desconhecido');
      return json({ error: 'Não foi possível concluir a configuração. Tente novamente.' }, 503);
    }
  }

  if (path !== '/api/admin/login') return json({ error: 'Não encontrado.' }, 404);
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length > 128) return json({ error: 'Senha incorreta.' }, 401);
  try {
    const credential = await readAdminCredential(db);
    if (!credential) return json({ error: 'O painel ainda não foi configurado.' }, 503);
    if (!await credential.verify(password)) return json({ error: 'Senha incorreta.' }, 401);
    return json({ ok: true }, 200, { 'Set-Cookie': createSessionCookie(credential.sessionKey) });
  } catch (error) {
    console.error('Erro ao validar acesso administrativo:', error?.message ?? 'erro desconhecido');
    return json({ error: 'Não foi possível validar o acesso agora.' }, 503);
  }
};
