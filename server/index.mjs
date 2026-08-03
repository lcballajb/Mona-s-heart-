import http from 'node:http';
import { MemoryStore } from './store.mjs';
import { MonaService } from './service.mjs';

const store = new MemoryStore();
const service = new MonaService(store);
const rateBuckets = new Map();
const production = process.env.NODE_ENV === 'production';
if (production && (!process.env.DATABASE_URL || !process.env.SESSION_PEPPER)) throw new Error('Production secrets and PostgreSQL configuration are required');

function cookies(request) {
  return Object.fromEntries((request.headers.cookie ?? '').split(';').filter(Boolean).map((part) => part.trim().split('=').map(decodeURIComponent)));
}
async function body(request) {
  const chunks = []; let bytes = 0;
  for await (const chunk of request) { bytes += chunk.length; if (bytes > 32_768) throw Object.assign(new Error('Payload too large'), { statusCode: 413 }); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
function reply(response, status, payload, headers = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; frame-ancestors 'none'", ...headers });
  response.end(JSON.stringify(payload));
}
const server = http.createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    const rateKey = `${request.socket.remoteAddress}:${path}`;
    const now = Date.now(); const bucket = rateBuckets.get(rateKey) ?? { count: 0, resetsAt: now + 60_000 };
    if (bucket.resetsAt <= now) { bucket.count = 0; bucket.resetsAt = now + 60_000; }
    bucket.count += 1; rateBuckets.set(rateKey, bucket);
    if (bucket.count > (path === '/v1/auth/sign-in' ? 10 : 120)) return reply(response, 429, { error: 'Too many requests' }, { 'retry-after': String(Math.ceil((bucket.resetsAt - now) / 1000)) });
    if (production && request.headers['x-forwarded-proto'] !== 'https') return reply(response, 426, { error: 'HTTPS required' });
    if (request.method === 'POST' && path === '/v1/auth/register') { await service.register(await body(request)); return reply(response, 202, { status: 'verification_pending' }); }
    if (request.method === 'POST' && path === '/v1/auth/verify') return reply(response, 204, service.verifyEmail((await body(request)).token));
    if (request.method === 'POST' && path === '/v1/auth/sign-in') {
      const result = await service.signIn(await body(request));
      return reply(response, 200, { csrfToken: result.csrfToken, expiresAt: result.expiresAt }, { 'set-cookie': `mh_session=${encodeURIComponent(result.token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${production ? '; Secure' : ''}` });
    }
    const sessionToken = cookies(request).mh_session; const actor = service.actor(sessionToken);
    if (!actor) return reply(response, 401, { error: 'Authentication required' });
    const session = store.session(sessionToken);
    if (!['GET', 'HEAD'].includes(request.method) && request.headers['x-csrf-token'] !== session.csrfToken) return reply(response, 403, { error: 'CSRF validation failed' });
    if (request.method === 'POST' && path === '/v1/auth/sign-out') { service.signOut(sessionToken); return reply(response, 204, {}, { 'set-cookie': 'mh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }); }
    if (request.method === 'GET' && path === '/v1/account/export') return reply(response, 200, service.exportData(actor));
    if (request.method === 'DELETE' && path === '/v1/account') { service.deleteAccount(actor); return reply(response, 202, { status: 'deletion_pending' }); }
    return reply(response, 404, { error: 'Not found' });
  } catch (error) { reply(response, error.statusCode ?? 500, { error: error.statusCode ? error.message : 'Internal server error' }); }
});

const port = Number(process.env.API_PORT ?? 3001);
server.listen(port, process.env.API_HOST ?? '127.0.0.1', () => process.stdout.write(`Mona's Heart API listening on ${port}\n`));
