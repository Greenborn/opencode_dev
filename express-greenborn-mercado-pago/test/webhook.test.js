import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebhookController } from '../src/webhook/webhookController.js';
import { createMercadoPago } from '../src/index.js';

function mockRes() {
  const res = { body: null, statusCode: 200, headers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

function makeDb({ affectedRows = 1, recordRawQueries = false } = {}) {
  const queries = [];
  const results = {
    affectedRows,
  };
  return {
    raw: async (sql, params) => {
      if (recordRawQueries) queries.push({ sql, params });
      return [results];
    },
    _queries: queries,
    _results: results,
  };
}

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, log() {} };

test('webhook: payload válido nuevo → inserta y dispara onNewWebhook', async () => {
  const db = makeDb({ affectedRows: 1, recordRawQueries: true });
  let hooked = null;
  const handler = createWebhookController({
    db, config: {}, logger: silentLogger,
    onNewWebhook: (payload, info) => { hooked = info; },
  });
  const req = { body: { id: '123', type: 'payment', data: { id: '123', status: 'approved' } } };
  const res = mockRes();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mensaje, 'Webhook recibido correctamente');

  const used = db._queries[0];
  assert.match(used.sql, /ON DUPLICATE KEY UPDATE/);
  const params = used.params;
  assert.deepEqual(params[1], '123'); // payment_id
  assert.equal(params[2], 'approved'); // payment_status

  // onNewWebhook se dispara en el siguiente tick (Promise)
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(hooked, { payment_id: '123', payment_status: 'approved' });
});

test('webhook: evento duplicado (affectedRows=0) → 200 sin onNewWebhook', async () => {
  const db = makeDb({ affectedRows: 0 });
  let called = false;
  const handler = createWebhookController({
    db, config: {}, logger: silentLogger,
    onNewWebhook: () => { called = true; },
  });
  const res = mockRes();
  await handler({ body: { id: '9', data: { id: '9', status: 'pending' } } }, res);

  assert.equal(res.statusCode, 200);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(called, false);
});

test('webhook: payload sin id → 400', async () => {
  const db = makeDb();
  const handler = createWebhookController({ db, config: {}, logger: silentLogger });
  const res = mockRes();
  await handler({ body: { tipo: 'nolleva_id' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Datos inválidos');
});

test('createMercadoPago: requiere knex', () => {
  assert.throws(() => createMercadoPago({}), /knex/);
});

test('createMercadoPago: requiere accessToken para el client', () => {
  const db = { raw: async () => {} };
  const mp = createMercadoPago({ knex: db, accessToken: 'TEST-123', userId: 1, logger: silentLogger });
  assert.ok(mp.client);
  assert.ok(mp.webhookRouter);
  assert.equal(mp.rootPath, '/api/webhook');
  assert.equal(mp.client.accessTokenValue, 'TEST-123');
});