import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createCrudRouter, normalizarCampos } from '../src/index.js';
import { CAMPOS, ssoMock, crearKnex, crearTablaProductos, crearApp, loggerEspia } from './helpers/entorno.js';

const TODOS = 'productos.listar,productos.ver,productos.crear,productos.editar,productos.eliminar';
const CAMPOS_CON_PK = [...CAMPOS, { field: 'id', headerName: 'ID', type: 'number' }];

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
  return crearApp({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger, ...extra });
}

test('pk: por defecto el id del body se ignora en POST y lo genera la base (con warn)', async () => {
  const res = await request(app()).post('/api/productos').set('x-permisos', TODOS).send({ id: 500, nombre: 'Pi', precio: 3 });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.id, 6);
  assert.ok(logger.registro.warn.some((m) => m.includes('pk "id"') && m.includes('ignorado')));
  assert.equal(await knex('productos').where({ id: 500 }).first(), undefined);
});

test('pk: aunque el pk esté en campos, por defecto no es escribible (fields_def writable false)', async () => {
  const a = app({ campos: CAMPOS_CON_PK });
  const list = await request(a).get('/api/productos/list').set('x-permisos', TODOS);
  const def = list.body.data.fields_def.find((f) => f.field === 'id');
  assert.equal(def.writable, false);
  const res = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ id: 500, nombre: 'Rho', precio: 3 });
  assert.equal(res.body.data.id, 6);
});

test('pk: en PUT el id del body se ignora y la clave no cambia', async () => {
  const a = app({ campos: CAMPOS_CON_PK });
  const res = await request(a).put('/api/productos/2').set('x-permisos', TODOS).send({ id: 77, precio: 31 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.id, 2);
  assert.equal(await knex('productos').where({ id: 77 }).first(), undefined);
  assert.ok(logger.registro.warn.some((m) => m.includes('pk "id"')));
});

test('pkEscribible: true permite fijar el pk desde el body (pk declarado en campos)', async () => {
  const a = app({ campos: CAMPOS_CON_PK, pkEscribible: true });
  const res = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ id: 500, nombre: 'Sigma', precio: 3 });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.id, 500);
});

test('normalizarCampos: forzar writable false sólo para el pk salvo pkEscribible', () => {
  const campos = [{ field: 'id', headerName: 'ID', type: 'number', writable: true }, { field: 'x', headerName: 'X', type: 'text' }];
  const [pk, x] = normalizarCampos(campos, { pk: 'id' });
  assert.equal(pk.writable, false);
  assert.equal(x.writable, true);
  const [pkEsc] = normalizarCampos(campos, { pk: 'id', pkEscribible: true });
  assert.equal(pkEsc.writable, true);
});

test('pkEscribible debe ser booleano', () => {
  assert.throws(() => createCrudRouter({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, pkEscribible: 'si' }), /"pkEscribible" debe ser booleana/);
});
