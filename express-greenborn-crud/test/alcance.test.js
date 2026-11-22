import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createCrudRouter, normalizarCampos } from '../src/index.js';
import { CAMPOS, ssoMock, crearKnex, crearTablaProductos, crearApp, loggerEspia } from './helpers/entorno.js';

const TODOS = 'productos.listar,productos.ver,productos.crear,productos.editar,productos.eliminar';
// alcance por defecto: el owner del usuario autenticado (en el helper, req.user.id === 1).
const ALCANCE_USUARIO = (req) => ({ owner_id: req.user.id });

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
  return crearApp({
    knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger, alcance: ALCANCE_USUARIO, ...extra,
  });
}

test('alcance: POST sin la clave de alcance en el body fija el valor del alcance en la BD', async () => {
  const res = await request(app()).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Zeta', precio: 7 });
  assert.equal(res.status, 201);
  const enBd = await knex('productos').where({ id: res.body.data.id }).first();
  assert.equal(enBd.owner_id, 1);
});

test('alcance: el valor del alcance se fusiona aunque la clave no esté en campos', async () => {
  const a = app({ alcance: () => ({ owner_id: 7 }) });
  const res = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Eta', precio: 7 });
  assert.equal(res.status, 201);
  const enBd = await knex('productos').where({ id: res.body.data.id }).first();
  assert.equal(enBd.owner_id, 7);
});

test('alcance: el body con el mismo valor del alcance se acepta', async () => {
  const res = await request(app()).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Teta', precio: 7, owner_id: 1 });
  assert.equal(res.status, 201);
  assert.equal((await knex('productos').where({ id: res.body.data.id }).first()).owner_id, 1);
});

test('alcance: el body con otro valor en POST responde 400 con errors y no inserta', async () => {
  const res = await request(app()).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Iota', precio: 7, owner_id: 99 });
  assert.equal(res.status, 400);
  assert.equal(res.body.status, false);
  assert.ok(res.body.errors.owner_id);
  const total = await knex('productos').count({ n: '*' }).first();
  assert.equal(total.n, 5);
});

test('alcance: el antesCrear recibe los datos ya fusionados con el alcance', async () => {
  const vistos = [];
  const a = app({
    alcance: () => ({ owner_id: 7 }),
    hooks: { antesCrear: (req, datos) => { vistos.push(datos.owner_id); return datos; } },
  });
  await request(a).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Kappa', precio: 7 });
  assert.deepEqual(vistos, [7]);
});

test('alcance: alcance(req) que devuelve null no fusiona nada', async () => {
  // owner_id no está en CAMPOS: el body lo ignora y queda el default de la tabla (1).
  const a = app({ alcance: () => null });
  const res = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Lambda', precio: 7, owner_id: 5 });
  assert.equal(res.status, 201);
  assert.equal((await knex('productos').where({ id: res.body.data.id }).first()).owner_id, 1);
});

test('alcance: alcance(req) que devuelve algo distinto de objeto da 500 y se registra', async () => {
  const a = app({ alcance: () => 'x' });
  const res = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Mu', precio: 7 });
  assert.equal(res.status, 500);
  assert.ok(logger.registro.error.length > 0);
});

test('alcance: PUT con otro valor en la clave de alcance responde 400 y no modifica', async () => {
  const res = await request(app()).put('/api/productos/2').set('x-permisos', TODOS).send({ owner_id: 5 });
  assert.equal(res.status, 400);
  assert.ok(res.body.errors.owner_id);
  assert.equal((await knex('productos').where({ id: 2 }).first()).owner_id, 1);
});

test('alcance: PUT que mezcla clave de alcance distinta y campos válidos responde 400 (no escribe nada)', async () => {
  const res = await request(app()).put('/api/productos/2').set('x-permisos', TODOS).send({ owner_id: 5, precio: 99 });
  assert.equal(res.status, 400);
  const fila = await knex('productos').where({ id: 2 }).first();
  assert.equal(fila.precio, 30);
});

test('alcance: PUT con el mismo valor de alcance se descarta y el resto se actualiza', async () => {
  const res = await request(app()).put('/api/productos/2').set('x-permisos', TODOS).send({ owner_id: 1, precio: 35 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.precio, 35);
  assert.equal((await knex('productos').where({ id: 2 }).first()).owner_id, 1);
});

test('alcance: PUT que sólo trae la clave de alcance igual responde 400 por no haber campos', async () => {
  const res = await request(app()).put('/api/productos/2').set('x-permisos', TODOS).send({ owner_id: 1 });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'No hay campos para actualizar');
});

test('alcance: configuración inválida (no función ni null) lanza al construir', () => {
  assert.throws(() => createCrudRouter({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, alcance: 'owner_id' }), /"alcance" debe ser una función/);
  assert.throws(() => createCrudRouter({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, alcance: {} }), /"alcance" debe ser una función/);
});

test('alcance: alcance undefined o null son válidos (sin alcance)', () => {
  assert.doesNotThrow(() => createCrudRouter({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, alcance: null }));
  assert.doesNotThrow(() => createCrudRouter({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS }));
});

test('alcance: no restringe la lectura (usar filtroBase para eso)', async () => {
  const res = await request(app()).get('/api/productos/list').set('x-permisos', TODOS);
  assert.equal(res.body.data.totalRecords, 5);
});

test('normalizarCampos: sin pk declarado no cambia writable', () => {
  const [n] = normalizarCampos([{ field: 'id', headerName: 'ID', type: 'number' }]);
  assert.equal(n.writable, true);
});
