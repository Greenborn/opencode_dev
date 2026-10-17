import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSsoAuth } from '../src/index.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

function store() {
  return {
    usuarios: [
      { id: 1, username: 'admin', email: 'admin@x.com' },
      { id: 2, username: 'lucho', email: 'lucho@x.com' },
      { id: 3, username: 'borrame', email: 'borrame@x.com' },
    ],
    roles: [
      { id: 1, nombre: 'administrador' },
      { id: 2, nombre: 'usuario' },
    ],
    usuarios_roles: [
      { usuario_id: 1, rol_id: 1 },
      { usuario_id: 2, rol_id: 2 },
      { usuario_id: 3, rol_id: 2 },
    ],
    roles_permisos: [],
  };
}

function buildSso(storeData, overrides = {}) {
  const knex = createFakeKnex(storeData);
  const sso = createSsoAuth({
    knex,
    tables: { user: 'usuarios' },
    rbac: true,
    adminRoles: ['administrador'],
    logger: { error: () => {}, warn: () => {}, log: () => {} },
    ...overrides,
  });
  return { sso, store: storeData };
}

test('deleteUser sin actorId lanza error y no borra nada', async () => {
  const data = store();
  const { sso } = buildSso(data);
  await assert.rejects(() => sso.deleteUser(3, {}), (err) => err.code === 'MISSING_ACTOR_ID');
  assert.ok(data.usuarios.find((u) => u.id === 3));
});

test('deleteUser con actor no-admin lanza error y no borra nada', async () => {
  const data = store();
  const { sso } = buildSso(data);
  await assert.rejects(() => sso.deleteUser(3, { actorId: 2 }), (err) => err.code === 'FORBIDDEN_NOT_ADMIN');
  assert.ok(data.usuarios.find((u) => u.id === 3));
  assert.ok(data.usuarios_roles.some((r) => r.usuario_id === 3));
});

test('deleteUser con actor admin borra usuario y sus relaciones de rol', async () => {
  const data = store();
  const { sso } = buildSso(data);
  const result = await sso.deleteUser(3, { actorId: 1 });
  assert.equal(result.success, true);
  assert.equal(data.usuarios.find((u) => u.id === 3), undefined);
  assert.equal(data.usuarios_roles.some((r) => r.usuario_id === 3), false);
});

test('deleteUser bloquea autoeliminación salvo allowSelfDelete', async () => {
  const data = store();
  const { sso } = buildSso(data);
  await assert.rejects(() => sso.deleteUser(1, { actorId: 1 }), (err) => err.code === 'SELF_DELETE_NOT_ALLOWED');
  const ok = await sso.deleteUser(1, { actorId: 1, allowSelfDelete: true });
  assert.equal(ok.success, true);
});

test('deleteUser falla cerrado sin adminRoles ni isUserAdmin configurados', async () => {
  const data = store();
  const { sso } = buildSso(data, { adminRoles: undefined });
  await assert.rejects(() => sso.deleteUser(3, { actorId: 1 }), (err) => err.code === 'ADMIN_CHECK_NOT_CONFIGURED');
});

test('deleteUser con usuario inexistente lanza USER_NOT_FOUND', async () => {
  const data = store();
  const { sso } = buildSso(data);
  await assert.rejects(() => sso.deleteUser(999, { actorId: 1 }), (err) => err.code === 'USER_NOT_FOUND');
});

test('updateUser actualiza campos simples y reemplaza roles', async () => {
  const data = store();
  const { sso } = buildSso(data);
  const updated = await sso.updateUser(2, { username: 'lucho2', roles: [1] }, { actorId: 1 });
  assert.equal(updated.username, 'lucho2');
  const links = data.usuarios_roles.filter((r) => r.usuario_id === 2);
  assert.deepEqual(links.map((l) => l.rol_id), [1]);
});

test('updateUser con actor no-admin lanza error', async () => {
  const data = store();
  const { sso } = buildSso(data);
  await assert.rejects(() => sso.updateUser(2, { username: 'x' }, { actorId: 2 }), (err) => err.code === 'FORBIDDEN_NOT_ADMIN');
});
