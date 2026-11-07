import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificaciones, createPushSubscriptionsMigration } from '../src/index.js';

function fakeKnex() {
  const fn = () => ({
    where: () => ({ first: async () => null, del: async () => {}, update: async () => {} }),
    insert: async () => {},
    select: async () => [],
  });
  fn.schema = {
    hasTable: async () => false,
    createTable: async () => {},
    dropTableIfExists: async () => {},
  };
  return fn;
}

test('estaConfigurado() es false sin claves VAPID', () => {
  const n = createNotificaciones({ knex: fakeKnex(), vapid: {} });
  assert.equal(n.estaConfigurado(), false);
  assert.equal(n.vapidPublicKey(), null);
});

test('vapidPublicKey() devuelve la clave configurada', () => {
  // Claves VAPID válidas (formato real) solo para que web-push no las rechace al validarlas.
  const publicKey = 'BGIfdxSVz-tef2v3pii57y_J5dsvmWnnWEInxoJLxQTvZ7XxkG5PBTLFDBfuSj07rn8PAlHIOjzk4tVF_BdXvgA';
  const privateKey = 'QwGjx3LRRLJX05NgbmmIlpZ5TgdCK6euRk5vFsN6dsc';
  const n = createNotificaciones({
    knex: fakeKnex(),
    vapid: { publicKey, privateKey },
  });
  assert.equal(n.estaConfigurado(), true);
  assert.equal(n.vapidPublicKey(), publicKey);
});

test('el router se monta sin lanzar excepción (sin authMiddleware)', () => {
  const n = createNotificaciones({ knex: fakeKnex(), vapid: {} });
  assert.ok(n.router);
  assert.equal(typeof n.router.handle, 'function');
});

test('createPushSubscriptionsMigration devuelve up/down', async () => {
  const { up, down } = createPushSubscriptionsMigration();
  assert.equal(typeof up, 'function');
  assert.equal(typeof down, 'function');
  await up(fakeKnex());
  await down(fakeKnex());
});

test('enviarPushAUsuario sin VAPID devuelve 0/0 sin pegarle a knex', async () => {
  const n = createNotificaciones({ knex: fakeKnex(), vapid: {} });
  const res = await n.enviarPushAUsuario(1, { titulo: 't', mensaje: 'm' });
  assert.deepEqual(res, { enviados: 0, fallidos: 0 });
});
