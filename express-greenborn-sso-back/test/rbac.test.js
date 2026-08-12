import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createSsoAuth } from '../src/index.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

function validSsoClient() {
  return {
    verifyToken: async () => ({
      data: { success: true, data: { valid: true, user: { email: 'nuevo@greenborn.com.ar', name: 'Nuevo' } } },
    }),
    extendSession: async (token) => ({
      data: { success: true, data: { bearer_token: `extended-${token}`, user: { email: 'nuevo@greenborn.com.ar', name: 'Nuevo' } } },
    }),
  };
}

function rbacStore() {
  return {
    user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', status: 1, password_hash: 'h' }],
    user_tokens: [{ id: 1, user_id: 1, token: 'local-token', is_active: true, expires_at: null, last_used_at: null }],
    profile: [{ id: 1, name: 'Lucho', last_name: '', fotoclub_id: null }],
    roles: [
      { id: 1, nombre: 'ADMIN', descripcion: 'Acceso total' },
      { id: 2, nombre: 'USUARIO', descripcion: 'Acceso basico' },
    ],
    permisos: [
      { id: 1, nombre: 'proyectos.ver' },
      { id: 2, nombre: 'proyectos.crear' },
      { id: 3, nombre: 'roles.ver' },
    ],
    usuarios_roles: [{ usuario_id: 1, rol_id: 2 }],
    roles_permisos: [
      { rol_id: 2, permiso_id: 1 },
      { rol_id: 2, permiso_id: 2 },
    ],
  };
}

function buildApp(overrides = {}) {
  const store = overrides.store || rbacStore();
  const knex = createFakeKnex(store);
  const sso = createSsoAuth({
    knex,
    ssoClient: overrides.ssoClient || validSsoClient(),
    ssoBaseUrl: 'https://auth.greenborn.com.ar',
    defaultRoleId: 2,
    ssoRoleMap: overrides.ssoRoleMap || { '*@greenborn.com.ar': 1 },
    rbac: true,
    logger: { error: () => {}, warn: () => {}, log: () => {} },
    ...overrides.options,
  });

  const app = express();
  app.use(express.json());
  app.use('/api/user', sso.router);
  app.get('/only-projects', sso.authMiddleware, sso.requirePermission('proyectos.ver', 'proyectos.crear'), (req, res) => {
    res.json({ ok: true, user: req.user });
  });
  app.get('/only-admin', sso.authMiddleware, sso.requireRole('ADMIN'), (req, res) => {
    res.json({ ok: true });
  });
  return { app, sso, knex, store };
}

test('GET /me en modo RBAC devuelve roles[] y permisos[]', async () => {
  const { app } = buildApp();
  const res = await request(app)
    .get('/api/user/me')
    .set('Authorization', 'Bearer local-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role_id, undefined);
  assert.deepEqual(res.body.user.roles, ['USUARIO']);
  assert.deepEqual(res.body.user.permisos, ['proyectos.ver', 'proyectos.crear']);
});

test('requirePermission deja pasar cuando el usuario tiene todos los permisos', async () => {
  const { app } = buildApp();
  const res = await request(app)
    .get('/only-projects')
    .set('Authorization', 'Bearer local-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('requirePermission bloquea con 403 si falta un permiso', async () => {
  const store = rbacStore();
  store.roles_permisos = store.roles_permisos.filter((rp) => rp.permiso_id !== 2);
  const { app } = buildApp({ store });
  const res = await request(app)
    .get('/only-projects')
    .set('Authorization', 'Bearer local-token');
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('requireRole bloquea con 403 a un rol no autorizado', async () => {
  const { app } = buildApp();
  const res = await request(app)
    .get('/only-admin')
    .set('Authorization', 'Bearer local-token');
  assert.equal(res.status, 403);
});

test('requireRole deja pasar con 401 si no hay usuario', async () => {
  const { app } = buildApp();
  const res = await request(app).get('/only-admin');
  assert.equal(res.status, 401);
});

test('sync de usuario SSO nuevo crea fila en usuarios_roles con el rol del mapa', async () => {
  const { app, store } = buildApp();
  const res = await request(app)
    .get('/api/user/me?unique_id=req_1')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'nuevo@greenborn.com.ar');
  assert.deepEqual(res.body.user.roles, ['ADMIN']);

  const nuevo = store.user.find((u) => u.email === 'nuevo@greenborn.com.ar');
  assert.ok(nuevo, 'usuario creado');
  assert.equal(nuevo.role_id, undefined, 'no debe tener role_id único en modo RBAC');

  const links = store.usuarios_roles.filter((ur) => ur.usuario_id === nuevo.id);
  assert.deepEqual(links.map((l) => l.rol_id), [1], 'debe enlazarse al rol ADMIN');
});

test('sync de usuario SSO existente asegura el rol sin duplicar', async () => {
  const store = rbacStore();
  store.user.push({ id: 2, username: 'sso@greenborn.com.ar', email: 'sso@greenborn.com.ar', status: 1 });
  store.usuarios_roles.push({ usuario_id: 2, rol_id: 1 });
  const matchingClient = {
    verifyToken: async () => ({
      data: { success: true, data: { valid: true, user: { email: 'sso@greenborn.com.ar', name: 'SSO' } } },
    }),
    extendSession: validSsoClient().extendSession,
  };
  const { app, store: s } = buildApp({ store, ssoClient: matchingClient });

  const res = await request(app)
    .get('/api/user/sso-profile?unique_id=req_1')
    .set('Authorization', 'Bearer sso-token');
  assert.equal(res.status, 200);
  assert.equal(res.body.exists, true);
  assert.deepEqual(res.body.user.roles, ['ADMIN']);
  const links = s.usuarios_roles.filter((ur) => ur.usuario_id === 2 && ur.rol_id === 1);
  assert.equal(links.length, 1, 'no debe duplicarse el rol');
});
