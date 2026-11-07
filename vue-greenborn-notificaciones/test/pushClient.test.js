import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urlBase64ToUint8Array, arrayBufferToBase64Url } from '../src/pushClient.js';

// node --test corre en Node; atob/btoa son globales desde Node 16+.

test('urlBase64ToUint8Array / arrayBufferToBase64Url son inversas', () => {
  const original = new Uint8Array([1, 2, 3, 250, 255, 0, 128]);
  const base64url = arrayBufferToBase64Url(original.buffer);
  assert.equal(typeof base64url, 'string');
  assert.ok(!base64url.includes('+'));
  assert.ok(!base64url.includes('/'));
  assert.ok(!base64url.includes('='));

  const decoded = urlBase64ToUint8Array(base64url);
  assert.deepEqual(Array.from(decoded), Array.from(original));
});

test('urlBase64ToUint8Array soporta padding faltante', () => {
  // "SGVsbG8" (sin padding) decodifica a "Hello"
  const decoded = urlBase64ToUint8Array('SGVsbG8');
  assert.equal(Buffer.from(decoded).toString('utf8'), 'Hello');
});
