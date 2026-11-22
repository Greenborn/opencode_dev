import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import knexLib from 'knex';
import { createPreferencesService } from '../src/preferences.js';
import * as migracion from '../migrations/20260822000000_create_gb_sso_preferencias.js';

let knex;

before(async () => {
  knex = knexLib({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
  await migracion.up(knex);
});

after(async () => {
  await knex.destroy();
});

test('guardar y leer valores JSON por usuario', async () => {
  const svc = createPreferencesService({ knex });
  await svc.guardar('u1', 'tabla.productos', { columnas: [{ field: 'a', width: 120 }] });
  const v = await svc.leer('u1', 'tabla.productos');
  assert.deepEqual(v, { columnas: [{ field: 'a', width: 120 }] });
});

test('guardar sobrescribe el valor existente sin duplicar', async () => {
  const svc = createPreferencesService({ knex });
  await svc.guardar('u2', 'k', 1);
  await svc.guardar('u2', 'k', 2);
  assert.equal(await svc.leer('u2', 'k'), 2);
  const todas = await svc.obtenerTodas('u2');
  assert.deepEqual(todas, { k: 2 });
});

test('las preferencias están aisladas por usuario', async () => {
  const svc = createPreferencesService({ knex });
  await svc.guardar('u3', 'k', 'a');
  await svc.guardar('u4', 'k', 'b');
  assert.equal(await svc.leer('u3', 'k'), 'a');
  assert.equal(await svc.leer('u4', 'k'), 'b');
});

test('leer una clave inexistente devuelve undefined', async () => {
  const svc = createPreferencesService({ knex });
  assert.equal(await svc.leer('u5', 'no-existe'), undefined);
});

test('eliminar borra y devuelve si existía', async () => {
  const svc = createPreferencesService({ knex });
  await svc.guardar('u6', 'k', true);
  assert.equal(await svc.eliminar('u6', 'k'), true);
  assert.equal(await svc.eliminar('u6', 'k'), false);
  assert.equal(await svc.leer('u6', 'k'), undefined);
});

test('valida userId, clave y valor', async () => {
  const svc = createPreferencesService({ knex });
  await assert.rejects(svc.leer('', 'k'), /userId/);
  await assert.rejects(svc.leer('u', ''), /clave/);
  await assert.rejects(svc.leer('u', 'x'.repeat(192)), /191/);
  await assert.rejects(svc.guardar('u', 'k', undefined), /valor/);
});

test('exige knex', () => {
  assert.throws(() => createPreferencesService({}), /knex/);
});
