import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createSsoAuth, filterInputData, isBase64String, parseIp } from '../src/index.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

function validSsoClient() {
  return {
    verifyToken: async () => ({
      data: { success: true, data: { valid: true, user: { email: 'sso@greenborn.com.ar', name: 'SSO User' } } },
    }),
    extendSession: async () => ({ data: { success: true } }),
    logout: async () => ({ data: { success: true } }),
  };
}

function buildApp(options = {}) {
  const store = options.store || {};
  const knex = createFakeKnex(store);
  const sso = createSsoAuth({
    knex,
    ssoClient: validSsoClient(),
    ssoBaseUrl: 'https://auth.greenborn.com.ar',
    defaultRoleId: 3,
    logger: { error: () => {}, warn: () => {}, log: () => {} },
    activityLog: options.activityLog ?? true,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/user', sso.router);
  app.get('/optional', sso.authMiddlewareOptional, (req, res) => res.json({ ok: true, user: req.user || null }));
  return { app, knex };
}

const DEFAULT_STORE = {
  user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', role_id: 3, profile_id: 1, status: 1, password_hash: 'h' }],
  user_tokens: [{ id: 1, user_id: 1, token: 'local-token', is_active: true, expires_at: null, last_used_at: null }],
  profile: [{ id: 1, name: 'Lucho', last_name: '', fotoclub_id: null }],
};

async function rows(knex, table) {
  return (await knex(table)) || [];
}

test('isBase64String detecta strings base64', () => {
  assert.equal(isBase64String('QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNk'), true);
  assert.equal(isBase64String('hola mundo normal'), false);
  assert.equal(isBase64String('abc'), false);
});

test('filterInputData excluye campos base64 y strings >4096, conserva datos válidos', () => {
  const input = {
    nombre: 'Juan',
    imagen: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNk', // base64
    textoLargo: 'x'.repeat(5000),
    normal: 'texto corto',
    anidado: { ok: 1, foto: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNk' },
  };
  const out = filterInputData(input);
  assert.equal(out.nombre, 'Juan');
  assert.equal(out.normal, 'texto corto');
  assert.equal(out.imagen, undefined);
  assert.equal(out.textoLargo, undefined);
  assert.equal(out.anidado.ok, 1);
  assert.equal(out.anidado.foto, undefined);
});

test('parseIp separa ipv4 e ipv6', () => {
  assert.deepEqual(parseIp('192.168.1.10'), { ipv4: '192.168.1.10', ipv6: null });
  assert.deepEqual(parseIp('2001:db8::1'), { ipv4: null, ipv6: '2001:db8::1' });
  assert.deepEqual(parseIp('::ffff:10.0.0.5'), { ipv4: '10.0.0.5', ipv6: null });
  assert.deepEqual(parseIp(''), { ipv4: null, ipv6: null });
});

test('authMiddleware registra actividad para endpoint autenticado', async () => {
  const store = structuredClone(DEFAULT_STORE);
  const { app, knex } = buildApp({ store });
  const res = await request(app)
    .get('/api/user/me')
    .set('Authorization', 'Bearer local-token');
  assert.equal(res.status, 200);
  const logRows = await rows(knex, 'gb_sso_log_actividad');
  assert.equal(logRows.length, 1);
  assert.equal(logRows[0].id_usuario, 1);
  assert.equal(logRows[0].metodo, 'GET');
  assert.ok(logRows[0].endpoint.includes('/api/user/me'));
  assert.ok(logRows[0].fecha_hora);
});

test('authMiddleware guarda datos de entrada sin base64 ni strings largos', async () => {
  const store = structuredClone(DEFAULT_STORE);
  const { app, knex } = buildApp({ store });
  await request(app)
    .post('/api/user/logout')
    .set('Authorization', 'Bearer local-token')
    .send({ justificacion: 'x'.repeat(5000), adjunto: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNk' });
  const logRows = await rows(knex, 'gb_sso_log_actividad');
  assert.equal(logRows.length, 1);
  const datos = logRows[0].datos_entrada;
  assert.equal(datos.justificacion, undefined);
  assert.equal(datos.adjunto, undefined);
});

test('authMiddlewareOptional registra solo si hay usuario autenticado', async () => {
  const store = structuredClone(DEFAULT_STORE);
  const { app, knex } = buildApp({ store });

  await request(app).get('/optional');
  let logRows = await rows(knex, 'gb_sso_log_actividad');
  assert.equal(logRows.length, 0);

  await request(app).get('/optional').set('Authorization', 'Bearer local-token');
  logRows = await rows(knex, 'gb_sso_log_actividad');
  assert.equal(logRows.length, 1);
  assert.equal(logRows[0].id_usuario, 1);
});

test('con activityLog desactivado no registra', async () => {
  const store = structuredClone(DEFAULT_STORE);
  const { app, knex } = buildApp({ store, activityLog: false });
  await request(app).get('/api/user/me').set('Authorization', 'Bearer local-token');
  const logRows = await rows(knex, 'gb_sso_log_actividad');
  assert.equal(logRows.length, 0);
});
