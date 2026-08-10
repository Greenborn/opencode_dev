import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUniqueId,
  parseSsoRoleMap,
  resolveSsoRole,
  filterSensitive,
  getBearerToken,
} from '../src/utils.js';

test('normalizeUniqueId', () => {
  assert.equal(normalizeUniqueId('  abc  '), 'abc');
  assert.equal(normalizeUniqueId('   '), null);
  assert.equal(normalizeUniqueId(''), null);
  assert.equal(normalizeUniqueId(123), null);
  assert.equal(normalizeUniqueId(null), null);
  assert.equal(normalizeUniqueId('a'.repeat(300)).length, 255);
});

test('parseSsoRoleMap', () => {
  assert.deepEqual(parseSsoRoleMap('{"a@x.com":1}'), { 'a@x.com': 1 });
  assert.equal(parseSsoRoleMap('no-json'), null);
  assert.deepEqual(parseSsoRoleMap({ '*@y.com': 2 }), { '*@y.com': 2 });
});

test('resolveSsoRole: exact match, domain match, default, invalid', () => {
  const map = { 'admin@g.com': 1, '*@delegados.g.com': 2 };
  assert.equal(resolveSsoRole('admin@g.com', map, 3), 1);
  assert.equal(resolveSsoRole('juan@delegados.g.com', map, 3), 2);
  assert.equal(resolveSsoRole('user@gmail.com', map, 3), 3);
  assert.equal(resolveSsoRole('user@gmail.com', null, 3), 3);
  assert.equal(resolveSsoRole('user@gmail.com', 'invalid', 3), 3);
  assert.equal(resolveSsoRole('user@gmail.com', {}, 5), 5);
});

test('filterSensitive removes sensitive fields', () => {
  const user = { id: 1, email: 'a@b.c', password_hash: 'x', access_token: 'y', profile_id: 3 };
  const out = filterSensitive(user, ['password_hash', 'access_token']);
  assert.equal(out.password_hash, undefined);
  assert.equal(out.access_token, undefined);
  assert.equal(out.email, 'a@b.c');
  assert.deepEqual(filterSensitive(null), null);
});

test('getBearerToken', () => {
  assert.equal(getBearerToken({ headers: { authorization: 'Bearer abc' } }), 'abc');
  assert.equal(getBearerToken({ headers: { authorization: 'Bearer   ' } }), null);
  assert.equal(getBearerToken({ headers: { authorization: 'Basic abc' } }), null);
  assert.equal(getBearerToken({ headers: {} }), null);
  assert.equal(getBearerToken(null), null);
});
