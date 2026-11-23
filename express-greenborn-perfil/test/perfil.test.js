import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createPerfilRouter, dtoPublico, filtrarCambios, normalizarCampos, normalizarTerminos } from '../src/index.js';

const campos = normalizarCampos([
  { nombre: 'nombre', publicable: true },
  { nombre: 'telefono', publicable: true, interruptor: 'mostrar_telefono' },
  { nombre: 'nota_interna', editable: false },
  { nombre: 'acepta_ofertas', tipo: 'booleano', editable: true },
]);

test('terminos por defecto son negocio', () => {
  assert.deepEqual(normalizarTerminos(), { singular: 'negocio', plural: 'negocios' });
  assert.equal(normalizarTerminos({ singular: 'tienda' }).singular, 'tienda');
});

test('dtoPublico no devuelve campos con interruptor apagado', () => {
  const fila = { id: 1, nombre: 'Ana', mostrar_nombre: true, telefono: '123', mostrar_telefono: false, nota_interna: 'x', usuario_id: 9 };
  assert.deepEqual(dtoPublico(fila, campos), { id: 1, nombre: 'Ana' });
});

test('dtoPublico incluye campo publicable con interruptor encendido', () => {
  const fila = { id: 1, nombre: 'Ana', mostrar_nombre: true, telefono: '123', mostrar_telefono: true };
  assert.deepEqual(dtoPublico(fila, campos), { id: 1, nombre: 'Ana', telefono: '123' });
});

test('filtrarCambios descarta claves no editables y ajenas', () => {
  const cambios = filtrarCambios(
    { nombre: 'B', usuario_id: 5, id: 99, nota_interna: 'h', mostrar_telefono: true, rol: 'admin' },
    campos,
  );
  assert.deepEqual(cambios, { nombre: 'B', mostrar_telefono: true });
});

test('campo publicable sin interruptor explícito usa mostrar_<nombre>', () => {
  assert.equal(campos[0].interruptor, 'mostrar_nombre');
});

test('normalizarCampos rechaza nombres inválidos y duplicados', () => {
  assert.throws(() => normalizarCampos([{ nombre: 'Mal Nombre' }]));
  assert.throws(() => normalizarCampos([{ nombre: 'a' }, { nombre: 'a' }]));
});

function servidor(repoFalso, userId = 7) {
  const app = express();
  app.use(express.json());
  const auth = (req, _res, next) => { req.user = { id: userId }; next(); };
  app.use('/api/perfil', createPerfilRouter({ repo: repoFalso, auth, campos, logger: { error() {} } }));
  return new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
}

test('router: PUT ignora campos no editables y GET público filtra', async () => {
  const filas = new Map([[7, { id: 1, usuario_id: 7, nombre: 'Ana', mostrar_nombre: true, telefono: '1', mostrar_telefono: false, nota_interna: 'secreta' }]]);
  const repo = {
    async obtenerPorUsuario(u) { return filas.get(u) || null; },
    async obtenerPorId(id) { return [...filas.values()].find((f) => f.id === Number(id)) || null; },
    async crear(u) { const f = { id: 1, usuario_id: u, nombre: null }; filas.set(u, f); return f; },
    async actualizar(u, c) { const f = filas.get(u); if (!f) return null; Object.assign(f, c); return f; },
  };
  const srv = await servidor(repo);
  const base = `http://127.0.0.1:${srv.address().port}/api/perfil`;
  try {
    const put = await fetch(`${base}/mi-perfil`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'Ana B', nota_interna: 'hack', mostrar_telefono: true }),
    });
    const guardado = await put.json();
    assert.equal(guardado.nombre, 'Ana B');
    assert.equal(guardado.nota_interna, 'secreta');
    const pub = await (await fetch(`${base}/publico/1`)).json();
    assert.deepEqual(pub, { id: 1, nombre: 'Ana B', telefono: '1' });
    assert.ok(!('nota_interna' in pub));
  } finally {
    srv.close();
  }
});
