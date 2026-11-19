import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createSsoAuth } from '../src/index.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

const SSO_USER = { email: 'sso@greenborn.com.ar', name: 'SSO User' };

function ssoError(status, data) {
  const err = new Error(`status ${status}`);
  err.response = { status, data };
  return err;
}

function buildApp({ ssoClient, store = {}, options = {}, findLocalUserByToken } = {}) {
  const knex = createFakeKnex(structuredClone(store));
  const sso = createSsoAuth({
    knex,
    ssoClient,
    ssoBaseUrl: 'https://auth.greenborn.com.ar',
    defaultRoleId: 3,
    logger: { error: () => {}, warn: () => {}, log: () => {} },
    ...(findLocalUserByToken ? { findLocalUserByToken } : {}),
    ...options,
  });
  const app = express();
  app.use(express.json());
  app.get('/protegida', sso.authMiddleware, (req, res) => res.json({ ok: true, user: req.user }));
  app.get('/opcional', sso.authMiddlewareOptional, (req, res) => res.json({ ok: true, user: req.user || null }));
  return app;
}

const DEFAULT_STORE = {
  user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', role_id: 3, profile_id: 1, status: 1, password_hash: 'h', suspended_at: null }],
  user_tokens: [{ id: 1, user_id: 1, token: 'local-token', is_active: true, expires_at: null, last_used_at: null }],
  profile: [{ id: 1, name: 'Lucho', last_name: '', fotoclub_id: null }],
};

// SSO que rechaza el token con el código indicado
function rejectingSso(status, data) {
  return {
    verifyToken: async () => { throw ssoError(status, data); },
    extendSession: async () => { throw ssoError(401, { error: 'INVALID_TOKEN' }); },
    logout: async () => ({ data: { success: true } }),
  };
}

const NO_LEAK = (body) => {
  const txt = JSON.stringify(body);
  assert.ok(!/status \d{3}|Error:|stack|secret|SELECT|knex/i.test(txt), `cuerpo con detalle interno: ${txt}`);
};

// (a) token ausente
test('(a) sin token → 401 en authMiddleware, anónimo en opcional', async () => {
  const app = buildApp({ ssoClient: rejectingSso(401, {}) });
  const res = await request(app).get('/protegida?unique_id=r1');
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, { success: false, message: 'Token de autenticación requerido' });
  const opt = await request(app).get('/opcional?unique_id=r1');
  assert.equal(opt.status, 200);
  assert.equal(opt.body.user, null);
});

// (b) token malformado (no reconocido por local ni por SSO)
test('(b) token malformado con unique_id, SSO responde valid=false → 401 Token inválido', async () => {
  const ssoClient = {
    verifyToken: async () => ({ data: { success: false, data: { valid: false } } }),
    extendSession: async () => null,
  };
  const app = buildApp({ ssoClient, store: DEFAULT_STORE });
  const res = await request(app).get('/protegida?unique_id=r1').set('Authorization', 'Bearer %%%malformado');
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, { success: false, message: 'Token inválido' });
  NO_LEAK(res.body);
  const opt = await request(app).get('/opcional?unique_id=r1').set('Authorization', 'Bearer %%%malformado');
  assert.equal(opt.status, 200);
  assert.equal(opt.body.user, null);
});

// (c) token vencido: SSO responde TOKEN_EXPIRED y no hay renovación
test('(c) token vencido sin renovación → 401 Sesión expirada con require_reauth', async () => {
  const app = buildApp({ ssoClient: rejectingSso(401, { error: 'TOKEN_EXPIRED' }), store: DEFAULT_STORE });
  const res = await request(app).get('/protegida?unique_id=r1').set('Authorization', 'Bearer vencido');
  assert.equal(res.status, 401);
  assert.deepEqual(res.body, { success: false, message: 'Sesión expirada', require_reauth: true });
  NO_LEAK(res.body);
  const opt = await request(app).get('/opcional?unique_id=r1').set('Authorization', 'Bearer vencido');
  assert.equal(opt.status, 200);
  assert.equal(opt.body.user, null);
});

// (d) firma inválida: SSO responde INVALID_TOKEN
test('(d) firma inválida → 401 sin detalle del error del SSO', async () => {
  const app = buildApp({ ssoClient: rejectingSso(401, { error: 'INVALID_TOKEN', detail: 'bad signature' }), store: DEFAULT_STORE });
  const res = await request(app).get('/protegida?unique_id=r1').set('Authorization', 'Bearer firma-mala');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  NO_LEAK(res.body);
  assert.ok(!JSON.stringify(res.body).includes('bad signature'));
});

// (e) usuario inexistente se aprovisiona; usuario desactivado → 403 (no 401)
test('(e) usuario SSO inexistente se crea y accede (200)', async () => {
  const ssoClient = {
    verifyToken: async () => ({ data: { success: true, data: { valid: true, user: SSO_USER } } }),
    extendSession: async () => null,
  };
  const app = buildApp({ ssoClient, store: { ...structuredClone(DEFAULT_STORE), user: [] } });
  const res = await request(app).get('/protegida?unique_id=r1').set('Authorization', 'Bearer valido');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, SSO_USER.email);
});

test('(e) usuario desactivado → 403 ACCOUNT_SUSPENDED en protegida, anónimo en opcional', async () => {
  const store = structuredClone(DEFAULT_STORE);
  store.user[0].suspended_at = '2026-11-01';
  const app = buildApp({
    store,
    ssoClient: rejectingSso(401, {}),
    options: { suspension: { field: 'suspended_at' } },
  });
  const res = await request(app).get('/protegida?unique_id=r1').set('Authorization', 'Bearer local-token');
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
  const opt = await request(app).get('/opcional?unique_id=r1').set('Authorization', 'Bearer local-token');
  assert.equal(opt.status, 200);
  assert.equal(opt.body.user, null);
});

// Sin detalles internos ante error inesperado del backend
test('error inesperado en la validación → 500 genérico sin mensaje interno', async () => {
  const app = buildApp({
    ssoClient: rejectingSso(401, {}),
    findLocalUserByToken: async () => { throw new Error('connection to db-prod-17 refused SELECT secret_col'); },
  });
  const res = await request(app).get('/protegida?unique_id=r1').set('Authorization', 'Bearer x');
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { success: false, message: 'Error de autenticación' });
  NO_LEAK(res.body);
});
