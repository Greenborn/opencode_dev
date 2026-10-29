import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createSsoAuth } from '../src/index.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

function store() {
  return {
    user: [
      { id: 1, username: 'lucho', email: 'lucho@x.com', password_hash: 'hash-de-123', status: 1 },
      { id: 2, username: 'admin', email: 'admin@x.com', password_hash: 'hash-admin', status: 1 },
    ],
    user_tokens: [],
    profile: [],
  };
}

function buildApp(overrides = {}) {
  const s = store();
  const knex = createFakeKnex(s);
  const sso = createSsoAuth({
    knex,
    localLogin: {
      endpoint: '/login',
      verifyPassword: (password, hash) => `${hash}-ok` === `${hash}-${password}`,
      handler: async (username, password) => {
        const user = s.user.find((u) => u.username === username);
        if (!user || password !== 'correcta') return null;
        return user;
      },
    },
    logger: { error: () => {}, warn: () => {}, log: () => {} },
    ...overrides,
  });

  const app = express();
  app.use(express.json());
  app.use('/api/user', sso.router);
  return { app, sso, store: s };
}

test('login local correcto emite token y guarda en user_tokens', async () => {
  const { app, store: s } = buildApp();
  const res = await request(app)
    .post('/api/user/login')
    .send({ username: 'lucho', password: 'correcta' });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.username, 'lucho');
  assert.equal(res.body.data.user.password_hash, undefined);
  assert.equal(s.user_tokens.length, 1);
  assert.equal(s.user_tokens[0].token, res.body.data.token);
});

test('login local con credenciales inválidas → 401', async () => {
  const { app } = buildApp();
  const res = await request(app)
    .post('/api/user/login')
    .send({ username: 'lucho', password: 'mala' });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('login local sin usuario/contraseña → 400', async () => {
  const { app } = buildApp();
  const res = await request(app).post('/api/user/login').send({ username: 'lucho' });
  assert.equal(res.status, 400);
});

test('sin localLogin la ruta /login no existe', async () => {
  const knex = createFakeKnex(store());
  const sso = createSsoAuth({
    knex,
    logger: { error: () => {}, warn: () => {}, log: () => {} },
  });
  const app = express();
  app.use(express.json());
  app.use('/api/user', sso.router);
  const res = await request(app).post('/api/user/login').send({ username: 'a', password: 'b' });
  assert.equal(res.status, 404);
});

test('cuenta suspendida: login válido → 403 ACCOUNT_SUSPENDED con datos extra; inválido sigue 401', async () => {
  const { app, store: s } = buildApp({
    suspension: { field: 'suspended_at', onSuspended: async () => ({ telefono_contacto: '+541100000000' }) },
  });
  s.user[0].suspended_at = new Date();
  const ok = await request(app).post('/api/user/login').send({ username: 'lucho', password: 'correcta' });
  assert.equal(ok.status, 403);
  assert.equal(ok.body.code, 'ACCOUNT_SUSPENDED');
  assert.equal(ok.body.telefono_contacto, '+541100000000');
  assert.equal(s.user_tokens.length, 0);
  const mala = await request(app).post('/api/user/login').send({ username: 'lucho', password: 'mala' });
  assert.equal(mala.status, 401);
  assert.equal(mala.body.code, undefined);
});

test('cuenta suspendida: token previo rechazado por authMiddleware', async () => {
  const { app, sso, store: s } = buildApp({ suspension: true });
  const login = await request(app).post('/api/user/login').send({ username: 'lucho', password: 'correcta' });
  const token = login.body.data.token;
  const protegida = express();
  protegida.get('/x', sso.authMiddleware, (req, res) => res.json({ ok: true }));
  assert.equal((await request(protegida).get('/x').set('Authorization', `Bearer ${token}`)).status, 200);
  s.user[0].suspended_at = new Date();
  const res = await request(protegida).get('/x').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
});
