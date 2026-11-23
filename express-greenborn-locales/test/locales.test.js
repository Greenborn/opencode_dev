import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createLocalesRouter, dtoPublicoLocal, filtrarCambiosLocal, normalizarCamposLocal, validarUbicacion } from '../src/index.js';

test('terminos: el router acepta camposExtra y publicosExtra', () => {
  const { campos, publicos } = normalizarCamposLocal([{ nombre: 'horario', publicable: true }], ['horario']);
  assert.ok(campos.some((c) => c.nombre === 'horario'));
  assert.ok(publicos.includes('horario'));
  assert.ok(publicos.includes('latitud'));
  assert.throws(() => normalizarCamposLocal([{ nombre: 'calle' }]));
});

test('dtoPublicoLocal no expone borradores ni campos fuera de la lista', () => {
  assert.equal(dtoPublicoLocal({ id: 1, publicado: false, calle: 'X' }, ['calle']), null);
  const dto = dtoPublicoLocal({ id: 1, publicado: true, calle: 'X', latitud: -37.1, propietario_id: 9 }, ['calle', 'latitud']);
  assert.deepEqual(dto, { id: 1, calle: 'X', latitud: -37.1 });
});

test('filtrarCambiosLocal descarta propietario y convierte publicado a booleano', () => {
  const { campos } = normalizarCamposLocal();
  assert.deepEqual(filtrarCambiosLocal({ calle: 'A', propietario_id: 5, publicado: 'si' }, campos), { calle: 'A', publicado: false });
});

test('validarUbicacion rechaza coordenadas fuera de rango', () => {
  assert.equal(validarUbicacion({ latitud: 95, longitud: 0 }), 'latitud inválida');
  assert.equal(validarUbicacion({ latitud: -37, longitud: -59 }), null);
  assert.equal(validarUbicacion({}), null);
});

function servidor(repo, userId) {
  const app = express();
  app.use(express.json());
  const auth = (req, _res, next) => { req.user = { id: userId }; next(); };
  app.use('/api', createLocalesRouter({ repo, auth, logger: { error() {} } }));
  return new Promise((resolve) => { const srv = app.listen(0, () => resolve(srv)); });
}

test('router: sólo el propietario edita; público no ve borradores', async () => {
  const filas = [];
  const repo = {
    async listarPorPropietario(u) { return filas.filter((f) => f.propietario_id === u); },
    async obtener(id) { return filas.find((f) => f.id === Number(id)) || null; },
    async crear(d) { const f = { id: filas.length + 1, ...d }; filas.push(f); return f; },
    async actualizar(id, c) { const f = filas.find((x) => x.id === Number(id)); Object.assign(f, c); return f; },
    async eliminar(id) { const i = filas.findIndex((x) => x.id === Number(id)); if (i < 0) return false; filas.splice(i, 1); return true; },
    async listarPublicados() { return filas.filter((f) => f.publicado); },
  };
  const srv = await servidor(repo, 7);
  const base = `http://127.0.0.1:${srv.address().port}/api`;
  const json = { 'content-type': 'application/json' };
  try {
    const crea = await fetch(`${base}/mis-locales`, { method: 'POST', headers: json, body: JSON.stringify({ calle: 'Mitre', numero: '100', ciudad: 'Tandil', publicado: true }) });
    const local = await crea.json();
    assert.equal(crea.status, 201);
    assert.equal(local.publicado, false, 'nuevo local arranca no publicado');
    assert.equal((await fetch(`${base}/publico/${local.id}`)).status, 404);

    const edita = await fetch(`${base}/mis-locales/${local.id}`, { method: 'PUT', headers: json, body: JSON.stringify({ publicado: true, latitud: 95 }) });
    assert.equal(edita.status, 400);
    const ok = await fetch(`${base}/mis-locales/${local.id}`, { method: 'PUT', headers: json, body: JSON.stringify({ publicado: true, latitud: -37.3 }) });
    assert.equal(ok.status, 200);
    const pub = await (await fetch(`${base}/publicos`)).json();
    assert.equal(pub.length, 1);
    assert.equal(pub[0].propietario_id, undefined);
    assert.equal(pub[0].latitud, -37.3);
  } finally {
    srv.close();
  }
});

test('router: otro usuario recibe 403 al editar', async () => {
  const filas = [{ id: 1, propietario_id: 3, calle: 'A', publicado: true }];
  const repo = {
    async obtener(id) { return filas.find((f) => f.id === Number(id)) || null; },
    async actualizar() { throw new Error('no debería llamarse'); },
    async listarPorPropietario() { return []; },
  };
  const srv = await servidor(repo, 7);
  try {
    const r = await fetch(`http://127.0.0.1:${srv.address().port}/api/mis-locales/1`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"calle":"Z"}' });
    assert.equal(r.status, 403);
  } finally {
    srv.close();
  }
});
