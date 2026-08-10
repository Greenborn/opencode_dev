import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCache } from '../src/index.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('set/get devuelve el mismo objeto', () => {
  const cache = new MemoryCache();
  const obj = { a: 1, b: [2, 3] };
  cache.set('obj', obj);
  assert.equal(cache.get('obj'), obj);
  assert.equal(cache.get('no-existe'), undefined);
  cache.destroy();
});

test('size y keys reflejan entradas vivas', () => {
  const cache = new MemoryCache();
  cache.set('a', 1).set('b', 2);
  assert.equal(cache.size, 2);
  assert.deepEqual(cache.keys().sort(), ['a', 'b']);
  cache.delete('a');
  assert.equal(cache.size, 1);
  cache.destroy();
});

test('get devuelve undefined tras expirar el TTL', async () => {
  const cache = new MemoryCache();
  cache.set('k', 'valor', 30);
  assert.equal(cache.get('k'), 'valor');
  await wait(50);
  assert.equal(cache.get('k'), undefined);
  cache.destroy();
});

test('has es false cuando expira', async () => {
  const cache = new MemoryCache();
  cache.set('k', 1, 20);
  assert.equal(cache.has('k'), true);
  await wait(40);
  assert.equal(cache.has('k'), false);
  cache.destroy();
});

test('ttl por defecto se aplica cuando no se pasa ttlMs', async () => {
  const cache = new MemoryCache({ ttlMs: 20 });
  cache.set('k', 1);
  await wait(40);
  assert.equal(cache.get('k'), undefined);
  cache.destroy();
});

test('ttlMs=0 (por defecto) no expira', async () => {
  const cache = new MemoryCache();
  cache.set('k', 1);
  await wait(30);
  assert.equal(cache.get('k'), 1);
  cache.destroy();
});

test('set reemplaza valor y emite set con exists=true', () => {
  const cache = new MemoryCache();
  const events = [];
  cache.on('set', (e) => events.push(e));
  cache.set('k', 1);
  cache.set('k', 2);
  assert.equal(cache.get('k'), 2);
  assert.equal(events[0].exists, false);
  assert.equal(events[1].exists, true);
  cache.destroy();
});

test('delete emite delete y clear emite clear', () => {
  const cache = new MemoryCache();
  const events = [];
  cache.on('delete', (e) => events.push(['delete', e]));
  cache.on('clear', (e) => events.push(['clear', e]));
  cache.set('a', 1).set('b', 2);
  assert.equal(cache.delete('a'), true);
  assert.equal(cache.delete('no-existe'), false);
  assert.equal(cache.clear(), 1);
  assert.equal(cache.size, 0);
  assert.deepEqual(events.map(([t]) => t), ['delete', 'clear']);
  cache.destroy();
});

test('get de una entrada expirada emite expired', async () => {
  const cache = new MemoryCache();
  const events = [];
  cache.on('expired', (e) => events.push(e.key));
  cache.set('k', 1, 20);
  await wait(40);
  assert.equal(cache.get('k'), undefined);
  assert.deepEqual(events, ['k']);
  cache.destroy();
});

test('cleanup() elimina expirados y emite expired', async () => {
  const cache = new MemoryCache({ cleanupIntervalMs: 0 });
  const events = [];
  cache.on('expired', (e) => events.push(e.key));
  cache.set('a', 1, 20);
  cache.set('b', 2);
  await wait(40);
  const removed = cache.cleanup();
  assert.equal(removed, 1);
  assert.equal(cache.size, 1);
  assert.deepEqual(events, ['a']);
  cache.destroy();
});

test('limpieza periódica automática elimina expirados', async () => {
  const cache = new MemoryCache({ cleanupIntervalMs: 20 });
  const events = [];
  cache.on('expired', (e) => events.push(e.key));
  cache.set('k', 1, 10);
  await wait(70);
  assert.equal(cache.size, 0);
  assert.deepEqual(events, ['k']);
  cache.destroy();
});

test('maxSize expulsa la entrada menos recientemente usada y emite evicted', () => {
  const cache = new MemoryCache({ maxSize: 2 });
  const events = [];
  cache.on('evicted', (e) => events.push(e.key));
  cache.set('a', 1);
  cache.set('b', 2);
  cache.get('a'); // a es la más recientemente usada
  cache.set('c', 3);
  assert.equal(cache.size, 2);
  assert.equal(cache.get('b'), undefined); // b fue expulsada
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('c'), 3);
  assert.deepEqual(events, ['b']);
  cache.destroy();
});

test('destroy detiene la limpieza periódica', async () => {
  const cache = new MemoryCache({ cleanupIntervalMs: 10 });
  cache.set('k', 1, 10);
  cache.destroy();
  await wait(40);
  assert.equal(cache.size, 1);
});

test('set con clave null/undefined lanza TypeError', () => {
  const cache = new MemoryCache();
  assert.throws(() => cache.set(null, 1), TypeError);
  assert.throws(() => cache.set(undefined, 1), TypeError);
  cache.destroy();
});

test('claves numéricas y string son claves distintas (semántica Map)', () => {
  const cache = new MemoryCache();
  cache.set(123, 'num');
  cache.set('123', 'str');
  assert.equal(cache.get(123), 'num');
  assert.equal(cache.get('123'), 'str');
  assert.equal(cache.size, 2);
  cache.destroy();
});
