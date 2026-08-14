import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createSsoAuth } from '../src/index.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

function validSsoClient() {
  return {
    verifyToken: async () => ({
      data: { success: true, data: { valid: true, user: { email: 'sso@greenborn.com.ar', name: 'SSO User' } } },
    }),
    extendSession: async (token) => ({
      data: { success: true, data: { bearer_token: `extended-${token}`, user: { email: 'sso@greenborn.com.ar', name: 'SSO User' } } },
    }),
    logout: async () => ({ data: { success: true, message: 'Sesión cerrada exitosamente' } }),
  };
}

function buildApp(overrides = {}) {
  const store = overrides.store || {};
  const knex = createFakeKnex(store);
  const sso = createSsoAuth({
    knex,
    ssoClient: overrides.ssoClient || validSsoClient(),
    ssoBaseUrl: 'https://auth.greenborn.com.ar',
    defaultRoleId: 3,
    ssoRoleMap: overrides.ssoRoleMap,
    logger: { error: () => {}, warn: () => {}, log: () => {} },
    ...overrides.options,
  });

  const app = express();
  app.use(express.json());
  app.use('/api/user', sso.router);
  app.get('/optional', sso.authMiddlewareOptional, (req, res) => {
    res.json({ ok: true, user: req.user || null });
  });
  return { app, sso, knex };
}

const DEFAULT_STORE = {
  user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', role_id: 3, profile_id: 1, status: 1, password_hash: 'h' }],
  user_tokens: [{ id: 1, user_id: 1, token: 'local-token', is_active: true, expires_at: null, last_used_at: null }],
  profile: [{ id: 1, name: 'Lucho', last_name: '', fotoclub_id: null }],
};

test('createSsoAuth requiere opción knex', () => {
  assert.throws(() => createSsoAuth({}), /knex/);
});

test('GET /me con token local', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app)
    .get('/api/user/me')
    .set('Authorization', 'Bearer local-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.id, 1);
  assert.equal(res.body.user.password_hash, undefined);
});

test('GET /me sin token → 401', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app).get('/api/user/me');
  assert.equal(res.status, 401);
});

test('GET /me con token SSO válido crea usuario', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app)
    .get('/api/user/me?unique_id=req_1')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'sso@greenborn.com.ar');
  assert.equal(res.body.user.role_id, 3);
  assert.equal(res.body.user.password_hash, undefined);
});

test('GET /sso-profile: usuario existe', async () => {
  const store = structuredClone(DEFAULT_STORE);
  store.user.push({ id: 2, username: 'sso@greenborn.com.ar', email: 'sso@greenborn.com.ar', role_id: 3, profile_id: 2, status: 1 });
  const { app } = buildApp({ store });
  const res = await request(app)
    .get('/api/user/sso-profile?unique_id=req_1')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.exists, true);
  assert.equal(res.body.user.email, 'sso@greenborn.com.ar');
});

test('GET /sso-profile: usuario no existe', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app)
    .get('/api/user/sso-profile?unique_id=req_1')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.exists, false);
  assert.equal(res.body.user, null);
});

test('GET /sso-profile sin unique_id → 400', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app)
    .get('/api/user/sso-profile')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 400);
});

test('POST /register SSO', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app)
    .post('/api/user/register')
    .set('Authorization', 'Bearer sso-token')
    .send({ email: 'nuevo@greenborn.com.ar', username: 'nuevo', sso: true, unique_id: 'req_1' });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, 'nuevo@greenborn.com.ar');
  assert.equal(res.body.user.password_hash, undefined);
});

test('resolveSsoRole aplica rol por dominio en sync', async () => {
  const ssoClient = {
    verifyToken: async () => ({
      data: { success: true, data: { valid: true, user: { email: 'juan@delegados.g.com', name: 'Juan' } } },
    }),
    extendSession: validSsoClient().extendSession,
  };
  const { app } = buildApp({
    store: structuredClone(DEFAULT_STORE),
    ssoClient,
    ssoRoleMap: { '*@delegados.g.com': 2 },
  });
  const res = await request(app)
    .get('/api/user/me?unique_id=req_1')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role_id, 2);
});

test('authMiddlewareOptional pasa sin token', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app).get('/optional');
  assert.equal(res.status, 200);
  assert.equal(res.body.user, null);
});

test('reauth: verify falla con 401 y extend devuelve X-New-Token', async () => {
  const ssoClient = {
    verifyToken: async () => {
      const err = new Error('TOKEN_EXPIRED');
      err.response = { status: 401, data: { error: 'TOKEN_EXPIRED' } };
      throw err;
    },
    extendSession: async (token) => ({
      data: { success: true, data: { bearer_token: `extended-${token}`, user: { email: 'sso@greenborn.com.ar', name: 'SSO User' } } },
    }),
  };
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE), ssoClient });
  const res = await request(app)
    .get('/api/user/me?unique_id=req_1')
    .set('Authorization', 'Bearer old-sso-token');
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-new-token'], 'extended-old-sso-token');
  assert.equal(res.body.user.email, 'sso@greenborn.com.ar');
});

test('POST /logout con token local desactiva user_tokens y no llama SSO', async () => {
  const store = structuredClone(DEFAULT_STORE);
  let logoutCalled = false;
  const ssoClient = {
    ...validSsoClient(),
    logout: async () => { logoutCalled = true; return { data: { success: true } }; },
  };
  const { app } = buildApp({ store, ssoClient });
  const res = await request(app)
    .post('/api/user/logout')
    .set('Authorization', 'Bearer local-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.local, true);
  assert.equal(res.body.data.sso, false);
  assert.equal(logoutCalled, false);
  assert.equal(store.user_tokens[0].is_active, false);
});

test('POST /logout con token SSO revoca en SSO y responde sso:true', async () => {
  const store = structuredClone(DEFAULT_STORE);
  let logoutCalled = false;
  const ssoClient = {
    ...validSsoClient(),
    logout: async (token, uniqueId) => {
      logoutCalled = true;
      assert.equal(token, 'sso-token');
      assert.equal(uniqueId, 'req_9');
      return { data: { success: true } };
    },
  };
  const { app } = buildApp({ store, ssoClient });
  const res = await request(app)
    .post('/api/user/logout?unique_id=req_9')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.sso, true);
  assert.equal(logoutCalled, true);
});

test('POST /logout SSO sin unique_id → 400', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app)
    .post('/api/user/logout')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 400);
});

test('POST /logout sin token → 401', async () => {
  const { app } = buildApp({ store: structuredClone(DEFAULT_STORE) });
  const res = await request(app).post('/api/user/logout');
  assert.equal(res.status, 401);
});
