import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPaymentInfo, extractStatuses, safeParse } from '../src/utils.js';

test('extractPaymentInfo: payload con data.id/data.status', () => {
  const info = extractPaymentInfo({ id: 'abc', data: { id: 12345, status: 'approved' } });
  assert.equal(info.payment_id, '12345');
  assert.equal(info.payment_status, 'approved');
});

test('extractPaymentInfo: payload plano id/status', () => {
  const info = extractPaymentInfo({ id: '777', status: 'rejected' });
  assert.equal(info.payment_id, '777');
  assert.equal(info.payment_status, 'rejected');
});

test('extractPaymentInfo: merchant order con order_status', () => {
  const info = extractPaymentInfo({ id: 88, order_status: 'paid' });
  assert.equal(info.payment_id, '88');
  assert.equal(info.payment_status, 'paid');
});

test('extractPaymentInfo: payments[] fallback (sin id/status de nivel superior)', () => {
  const info = extractPaymentInfo({ payments: [{ id: 42, status: 'approved' }] });
  assert.equal(info.payment_id, '42');
  assert.equal(info.payment_status, 'approved');
});

test('extractPaymentInfo: con id de nivel superior, status sale de payments[]', () => {
  const info = extractPaymentInfo({ id: 1, payments: [{ id: 42, status: 'approved' }] });
  assert.equal(info.payment_id, '1'); // el id presente tiene prioridad
  assert.equal(info.payment_status, 'approved');
});

test('extractPaymentInfo: entrada inválida devuelve vacíos', () => {
  for (const bad of [null, undefined, 'x', 5]) {
    const info = extractPaymentInfo(bad);
    assert.equal(info.payment_id, '');
    assert.equal(info.payment_status, '');
  }
});

test('extractStatuses: junta status, order_status y payments', () => {
  const statuses = extractStatuses({
    status: 'pending',
    order_status: 'paid',
    payments: [{ status: 'approved' }, { status: 'approved' }, {}],
  });
  assert.deepEqual(statuses.sort(), ['approved', 'paid', 'pending']);
});

test('safeParse: JSON string y valores nulos', () => {
  assert.deepEqual(safeParse('{"a":1}'), { a: 1 });
  assert.deepEqual(safeParse(null), {});
  assert.deepEqual(safeParse('no-json'), {});
  assert.deepEqual(safeParse({ b: 2 }), { b: 2 });
});