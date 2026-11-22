import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { requireAnyPermission } from '../src/index.js';
import { ssoMock } from './helpers/entorno.js';

/** SSO síncrono (como el mock): 401 sin usuario, 403 sin permiso. */
const ssoSync = ssoMock();

/** SSO asíncrono como el real de express-greenborn-sso-back (espera la consulta de permisos). */
const ssoAsync = {
  requirePermission: (...permisos) => async (req, res, next) => {
    await new Promise((r) => setImmediate(r));
    if (!req.user) return res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
    if (!permisos.every((p) => req.user.permisos.includes(p))) {
      return res.status(403).json({ success: false, message: 'Acceso denegado: permisos insuficientes' });
    }
    return next();
  },
};

function appCon(sso, ...permisos) {
  const app = express();
  app.use((req, res, next) => {
    const cabecera = req.headers['x-permisos'];
    if (cabecera !== undefined) req.user = { id: 1, permisos: cabecera === '' ? [] : cabecera.split(',') };
    next();
  });
  app.get('/x', requireAnyPermission(sso, ...permisos), (req, res) => res.json({ ok: true }));
  app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
  return app;
}

for (const [nombre, sso] of [['SSO síncrono', ssoSync], ['SSO asíncrono (real)', ssoAsync]]) {
  test(`OR (${nombre}): basta con tener uno de los permisos`, async () => {
    const a = appCon(sso, 'docs.leer', 'docs.admin');
    assert.equal((await request(a).get('/x').set('x-permisos', 'docs.admin')).status, 200);
    assert.equal((await request(a).get('/x').set('x-permisos', 'docs.leer')).status, 200);
    assert.equal((await request(a).get('/x').set('x-permisos', 'docs.leer,docs.admin')).status, 200);
  });

  test(`OR (${nombre}): sin ninguno responde 403 con el mensaje del helper`, async () => {
    const a = appCon(sso, 'docs.leer', 'docs.admin');
    const res = await request(a).get('/x').set('x-permisos', 'otro.permiso');
    assert.equal(res.status, 403);
    assert.deepEqual(res.body, { success: false, message: 'Acceso denegado: permisos insuficientes' });
  });

  test(`OR (${nombre}): sin usuario devuelve el 401 del SSO sin probar más permisos`, async () => {
    const a = appCon(sso, 'docs.leer', 'docs.admin');
    const res = await request(a).get('/x');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Token de autenticación requerido');
  });
}

test('OR: un error lanzado por el SSO se propaga con next(err)', async () => {
  const sso = { requirePermission: () => () => { throw new Error('fallo del SSO'); } };
  const res = await request(appCon(sso, 'a.b')).get('/x').set('x-permisos', 'a.b');
  assert.equal(res.status, 500);
  assert.equal(res.body.message, 'fallo del SSO');
});

test('OR: un 403 del SSO con sólo un permiso se comporta como requirePermission', async () => {
  const res = await request(appCon(ssoSync, 'docs.admin')).get('/x').set('x-permisos', 'docs.leer');
  assert.equal(res.status, 403);
  assert.equal(res.body.message, 'Acceso denegado: permisos insuficientes');
});

test('OR: configuración inválida lanza al construir', () => {
  assert.throws(() => requireAnyPermission({}, 'a.b'), /primer argumento debe ser el objeto sso/);
  assert.throws(() => requireAnyPermission(ssoSync), /al menos un permiso/);
  assert.throws(() => requireAnyPermission(ssoSync, ''), /permiso inválido/);
  assert.throws(() => requireAnyPermission(ssoSync, 'a b'), /permiso inválido/);
});
