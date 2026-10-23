import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import request from 'supertest';
import { io as createClient } from 'socket.io-client';
import { createSsoAuth } from '../src/index.js';
import { createRateLimiter, normalizeRateLimitConfig, getClientIp } from '../src/rateLimit.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

const noopLogger = { error: () => {}, warn: () => {}, log: () => {} };

function loginStore() {
  return {
    user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', password_hash: 'h', status: 1 }],
    user_tokens: [],
    profile: [],
  };
}

function buildLoginApp(rateLimit) {
  const store = loginStore();
  const knex = createFakeKnex(store);
  const sso = createSsoAuth({
    knex,
    rateLimit,
    localLogin: {
      endpoint: '/login',
      handler: async (username, password) => {
        const user = store.user.find((u) => u.username === username);
        if (!user || password !== 'correcta') return null;
        return user;
      },
    },
    logger: noopLogger,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/user', sso.router);
  return { app, sso, store };
}

const DEFAULT_STORE = {
  user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', role_id: 3, profile_id: 1, status: 1 }],
  user_tokens: [{ id: 1, user_id: 1, token: 'local-token', is_active: true, expires_at: null, last_used_at: null }],
  profile: [{ id: 1, name: 'Lucho', last_name: '', fotoclub_id: null }],
};

function rejectingSsoClient() {
  return {
    verifyToken: async () => {
      const err = new Error('INVALID_TOKEN');
      err.response = { status: 401, data: { error: 'INVALID_TOKEN' } };
      throw err;
    },
    extendSession: async () => {
      const err = new Error('INVALID_TOKEN');
      err.response = { status: 401, data: { error: 'INVALID_TOKEN' } };
      throw err;
    },
    logout: async () => ({ data: { success: true } }),
  };
}

function rbacStore() {
  return {
    user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', status: 1 }],
    user_tokens: [{ id: 1, user_id: 1, token: 'local-token', is_active: true, expires_at: null, last_used_at: null }],
    profile: [{ id: 1, name: 'Lucho', last_name: '', fotoclub_id: null }],
    roles: [{ id: 2, nombre: 'USUARIO' }],
    permisos: [{ id: 3, nombre: 'roles.ver' }],
    usuarios_roles: [{ usuario_id: 1, rol_id: 2 }],
    roles_permisos: [],
  };
}

function buildTokenApp(rateLimit, overrides = {}) {
  const knex = createFakeKnex(structuredClone(overrides.store || DEFAULT_STORE));
  const sso = createSsoAuth({
    knex,
    rateLimit,
    ssoClient: rejectingSsoClient(),
    ssoBaseUrl: 'https://auth.greenborn.com.ar',
    defaultRoleId: 3,
    logger: noopLogger,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/user', sso.router);
  app.get('/protected', sso.authMiddleware, (req, res) => res.json({ ok: true, user: req.user }));
  return { app, sso, knex };
}

function login(app, password, headers = {}) {
  return request(app).post('/api/user/login').set(headers).send({ username: 'lucho', password });
}

test('normalizeRateLimitConfig aplica defaults y desactiva con false', () => {
  const defaults = normalizeRateLimitConfig(true);
  assert.equal(defaults.enabled, true);
  assert.equal(defaults.maxAttempts, 3);
  assert.equal(defaults.windowMs, 5 * 60 * 1000);
  assert.equal(defaults.blockMs, 5 * 60 * 1000);

  const custom = normalizeRateLimitConfig({ maxAttempts: 5, windowMs: 1000, blockMs: 2000, trustProxy: true });
  assert.equal(custom.maxAttempts, 5);
  assert.equal(custom.blockMs, 2000);
  assert.equal(custom.trustProxy, 1);

  assert.equal(normalizeRateLimitConfig(false).enabled, false);
});

test('getClientIp normaliza IPv4 mapeada y respeta trustProxy', () => {
  const req = { ip: '::ffff:1.2.3.4', headers: {}, socket: { remoteAddress: '::1' } };
  assert.equal(getClientIp(req), '1.2.3.4');
  const proxied = { ip: '10.0.0.1', headers: { 'x-forwarded-for': '9.9.9.9, 8.8.8.8' } };
  assert.equal(getClientIp(proxied, 1), '8.8.8.8');
});

test('login: 3 fallos → 401, 4to intento → 429', async () => {
  const { app } = buildLoginApp(true);
  for (let i = 0; i < 3; i += 1) {
    const res = await login(app, 'mala');
    assert.equal(res.status, 401);
  }
  const blocked = await login(app, 'mala');
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, 'RATE_LIMITED');
  assert.ok(Number(blocked.headers['retry-after']) >= 1);

  const validButBlocked = await login(app, 'correcta');
  assert.equal(validButBlocked.status, 429);
});

test('login: el éxito resetea los fallos previos', async () => {
  const { app } = buildLoginApp(true);
  await login(app, 'mala');
  await login(app, 'mala');
  assert.equal((await login(app, 'correcta')).status, 200);
  await login(app, 'mala');
  assert.equal((await login(app, 'mala')).status, 401);
});

test('login: el bloqueo se libera al vencer blockMs', async () => {
  const { app } = buildLoginApp({ maxAttempts: 2, windowMs: 150, blockMs: 150 });
  await login(app, 'mala');
  await login(app, 'mala');
  assert.equal((await login(app, 'mala')).status, 429);
  await new Promise((resolve) => setTimeout(resolve, 220));
  assert.equal((await login(app, 'correcta')).status, 200);
});

test('login: IPs distintas no comparten el límite', async () => {
  const { app } = buildLoginApp({ trustProxy: true });
  for (let i = 0; i < 3; i += 1) {
    await login(app, 'mala', { 'X-Forwarded-For': '1.1.1.1' });
  }
  assert.equal((await login(app, 'mala', { 'X-Forwarded-For': '1.1.1.1' })).status, 429);
  assert.equal((await login(app, 'mala', { 'X-Forwarded-For': '2.2.2.2' })).status, 401);
});

test('login: rateLimit false desactiva el límite', async () => {
  const { app } = buildLoginApp(false);
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await login(app, 'mala')).status, 401);
  }
});

test('rutas protegidas: 3 tokens inválidos → 429 también para token válido', async () => {
  const { app } = buildTokenApp(true);
  for (let i = 0; i < 3; i += 1) {
    const res = await request(app)
      .get('/protected?unique_id=req_1')
      .set('Authorization', `Bearer invalido-${i}`);
    assert.equal(res.status, 401);
  }
  const blocked = await request(app)
    .get('/protected?unique_id=req_1')
    .set('Authorization', 'Bearer invalido-x');
  assert.equal(blocked.status, 429);

  const validButBlocked = await request(app)
    .get('/protected')
    .set('Authorization', 'Bearer local-token');
  assert.equal(validButBlocked.status, 429);
});

test('rutas protegidas: el token válido resetea los fallos', async () => {
  const { app } = buildTokenApp(true);
  await request(app).get('/protected?unique_id=r').set('Authorization', 'Bearer x1');
  await request(app).get('/protected?unique_id=r').set('Authorization', 'Bearer x2');
  assert.equal((await request(app).get('/protected').set('Authorization', 'Bearer local-token')).status, 200);
  await request(app).get('/protected?unique_id=r').set('Authorization', 'Bearer x3');
  assert.equal((await request(app).get('/protected?unique_id=r').set('Authorization', 'Bearer x4')).status, 401);
});

test('sin token no se cuentan intentos', async () => {
  const { app } = buildTokenApp(true);
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await request(app).get('/protected')).status, 401);
  }
  assert.equal((await request(app).get('/protected').set('Authorization', 'Bearer local-token')).status, 200);
});

test('400 por unique_id faltante no cuenta como fallo de token', async () => {
  const { app } = buildTokenApp(true);
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await request(app).get('/protected').set('Authorization', 'Bearer x')).status, 400);
  }
  assert.equal((await request(app).get('/protected').set('Authorization', 'Bearer local-token')).status, 200);
});

test('403 por permisos no cuenta como fallo de token', async () => {
  const knex = createFakeKnex(rbacStore());
  const sso = createSsoAuth({
    knex,
    rateLimit: true,
    ssoClient: rejectingSsoClient(),
    rbac: true,
    defaultRoleId: 2,
    logger: noopLogger,
  });
  const app = express();
  app.use(express.json());
  app.get('/solo-roles', sso.authMiddleware, sso.requirePermission('roles.ver'), (req, res) => res.json({ ok: true }));
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await request(app).get('/solo-roles').set('Authorization', 'Bearer local-token')).status, 403);
  }
  assert.equal((await request(app).get('/solo-roles').set('Authorization', 'Bearer local-token')).status, 403);
});

test('/sso-profile queda limitado por token', async () => {
  const { app } = buildTokenApp(true);
  for (let i = 0; i < 3; i += 1) {
    const res = await request(app)
      .get('/api/user/sso-profile?unique_id=r')
      .set('Authorization', `Bearer malo-${i}`);
    assert.equal(res.status, 401);
  }
  const blocked = await request(app)
    .get('/api/user/sso-profile?unique_id=r')
    .set('Authorization', 'Bearer malo');
  assert.equal(blocked.status, 429);
});

test('middlewares expuestos funcionan en rutas custom', async () => {
  const limiter = createRateLimiter({ maxAttempts: 2 });
  const app = express();
  app.use(express.json());
  app.post('/mi-login', limiter.loginMiddleware, (req, res) => res.status(401).json({ ok: false }));
  app.get('/mi-token', limiter.tokenMiddleware, (req, res) => res.status(401).json({ ok: false }));

  await request(app).post('/mi-login').send({});
  await request(app).post('/mi-login').send({});
  assert.equal((await request(app).post('/mi-login').send({})).status, 429);

  await request(app).get('/mi-token').set('Authorization', 'Bearer a');
  await request(app).get('/mi-token').set('Authorization', 'Bearer b');
  assert.equal((await request(app).get('/mi-token').set('Authorization', 'Bearer c')).status, 429);
});

test('rateLimiter expone check/recordFailure/reset/clear', () => {
  const limiter = createRateLimiter({ maxAttempts: 2 });
  const req = { ip: '3.3.3.3', headers: {} };
  assert.equal(limiter.check('login', req).blocked, false);
  limiter.recordFailure('login', req);
  limiter.recordFailure('login', req);
  assert.equal(limiter.check('login', req).blocked, true);
  limiter.reset('login', req);
  assert.equal(limiter.check('login', req).blocked, false);
  limiter.recordFailure('login', req);
  limiter.clear();
  assert.equal(limiter.size, 0);
});

test('socket: 3 handshakes inválidos bloquean la IP', async () => {
  const knex = createFakeKnex(structuredClone(DEFAULT_STORE));
  const sso = createSsoAuth({
    knex,
    rateLimit: true,
    ssoClient: rejectingSsoClient(),
    ssoBaseUrl: 'https://auth.greenborn.com.ar',
    logger: noopLogger,
  });
  const httpServer = http.createServer();
  sso.attachSocket(httpServer, { path: '/socket.io', corsOrigin: '*' });

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const url = `http://localhost:${httpServer.address().port}`;

  const connect = (auth) =>
    new Promise((resolve, reject) => {
      const client = createClient(url, { auth, reconnection: false, transports: ['websocket'] });
      client.on('connect', () => resolve(client));
      client.on('connect_error', (err) => reject(err));
    });

  try {
    for (let i = 0; i < 3; i += 1) {
      await assert.rejects(() => connect({ token: `malo-${i}`, unique_id: 'r' }));
    }
    await assert.rejects(
      () => connect({ token: 'local-token', unique_id: 'r' }),
      /demasiados intentos/,
    );
  } finally {
    httpServer.close();
  }
});
