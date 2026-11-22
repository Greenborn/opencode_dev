import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createCrudRouter } from '../src/index.js';
import { CAMPOS, ssoMock, crearKnex, crearTablaProductos, crearApp, loggerEspia } from './helpers/entorno.js';

const TODOS = 'productos.listar,productos.ver,productos.crear,productos.editar,productos.eliminar';
const SOFT = { campo: 'activo', valor: 0, extra: { calculado: 'anulado' } };

let knex;
let logger;

beforeEach(async () => {
  knex = crearKnex();
  await crearTablaProductos(knex);
  logger = loggerEspia();
});

afterEach(async () => {
  await knex.destroy();
});

function app(extra = {}) {
  return crearApp({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger, softDelete: SOFT, ...extra });
}

function config(softDelete) {
  return createCrudRouter({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, softDelete });
}

test('softDelete: DELETE hace UPDATE (la fila sigue existiendo) con campo, valor y extra', async () => {
  const res = await request(app()).delete('/api/productos/3').set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { id: '3' });
  const fila = await knex('productos').where({ id: 3 }).first();
  assert.ok(fila);
  assert.equal(fila.activo, 0);
  assert.equal(fila.calculado, 'anulado');
});

test('softDelete: el listado sigue incluyendo la fila borrada lógicamente (filtrar con filtroBase)', async () => {
  await request(app()).delete('/api/productos/3').set('x-permisos', TODOS);
  const res = await request(app()).get('/api/productos/list').set('x-permisos', TODOS);
  assert.equal(res.body.data.totalRecords, 5);
});

test('softDelete: registra actividad con accion eliminar y ejecuta despuesEliminar', async () => {
  const acciones = [];
  const despues = [];
  const a = app({
    activityLog: async (req, info) => { acciones.push(info.accion); },
    hooks: { despuesEliminar: (req, registro) => { despues.push(registro.nombre); } },
  });
  await request(a).delete('/api/productos/3').set('x-permisos', TODOS);
  assert.deepEqual(acciones, ['eliminar']);
  assert.deepEqual(despues, ['Gamma']);
});

test('softDelete con alcance: el UPDATE lleva el alcance y fuera de alcance responde 404 sin tocar la fila', async () => {
  const a = app({ alcance: () => ({ owner_id: 1 }) });
  const fuera = await request(a).delete('/api/productos/3').set('x-permisos', TODOS);
  assert.equal(fuera.status, 404);
  assert.equal((await knex('productos').where({ id: 3 }).first()).activo, 1);

  const dentro = await request(a).delete('/api/productos/1').set('x-permisos', TODOS);
  assert.equal(dentro.status, 200);
  assert.equal((await knex('productos').where({ id: 1 }).first()).activo, 0);
});

test('softDelete: sin la opción el DELETE sigue siendo físico', async () => {
  const a = crearApp({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger });
  const res = await request(a).delete('/api/productos/3').set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  assert.equal(await knex('productos').where({ id: 3 }).first(), undefined);
});

test('softDelete: configuración inválida lanza al construir', () => {
  assert.throws(() => config('activo'), /softDelete" debe ser un objeto/);
  assert.throws(() => config({ valor: 0 }), /softDelete.campo/);
  assert.throws(() => config({ campo: 'activo' }), /softDelete.valor es obligatorio/);
  assert.throws(() => config({ campo: 'id', valor: 0 }), /no puede ser la clave primaria/);
  assert.throws(() => config({ campo: 'activo; drop', valor: 0 }), /softDelete.campo/);
  assert.throws(() => config({ campo: 'activo', valor: 0, otro: 1 }), /opción desconocida en softDelete/);
  assert.throws(() => config({ campo: 'activo', valor: 0, extra: { 'x y': 1 } }), /columna inválida/);
  assert.throws(() => config({ campo: 'activo', valor: 0, extra: { calculado: { a: 1 } } }), /debe ser primitivo/);
  assert.throws(() => config({ campo: 'activo', valor: 0, extra: [] }), /softDelete.extra debe ser/);
});

test('softDelete: null como softDelete no se acepta (usar omitir la opción)', () => {
  assert.throws(() => config(null), /softDelete" debe ser un objeto/);
});
