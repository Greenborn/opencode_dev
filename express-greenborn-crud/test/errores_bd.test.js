import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mapearErrorBd, MENSAJE_DUPLICADO, MENSAJE_REFERENCIA, ErrorCrud } from '../src/errores.js';
import { CAMPOS, ssoMock, crearKnex, crearTablaProductos, crearApp, loggerEspia } from './helpers/entorno.js';

const TODOS = 'productos.listar,productos.ver,productos.crear,productos.editar,productos.eliminar';
const CAMPOS_CON_PK = [...CAMPOS, { field: 'id', headerName: 'ID', type: 'number' }];
const CAMPOS_HIJOS = [
  { field: 'padre_id', headerName: 'Padre', type: 'number', required: true },
  { field: 'nombre', headerName: 'Nombre', type: 'text' },
];

let knex;
let logger;

beforeEach(async () => {
  knex = crearKnex();
  // Con better-sqlite3 las claves foráneas vienen desactivadas; esta conexión (pool de 1) las activa.
  await knex.raw('PRAGMA foreign_keys = ON');
  await crearTablaProductos(knex);
  logger = loggerEspia();
});

afterEach(async () => {
  await knex.destroy();
});

function app(extra = {}) {
  return crearApp({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger, ...extra });
}

test('mapearErrorBd: unicidad y clave primaria de MySQL y SQLite dan 409 de duplicado', () => {
  for (const code of ['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_PRIMARYKEY']) {
    const mapeado = mapearErrorBd({ code });
    assert.ok(mapeado instanceof ErrorCrud);
    assert.equal(mapeado.status, 409);
    assert.equal(mapeado.message, MENSAJE_DUPLICADO);
  }
});

test('mapearErrorBd: claves foráneas de MySQL y SQLite dan 409 de referencia', () => {
  for (const code of ['ER_ROW_IS_REFERENCED', 'ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2', 'SQLITE_CONSTRAINT_FOREIGNKEY']) {
    const mapeado = mapearErrorBd({ code });
    assert.equal(mapeado.status, 409);
    assert.equal(mapeado.message, MENSAJE_REFERENCIA);
  }
});

test('mapearErrorBd: el resto (NOT NULL, desconocido, sin código, no objeto) devuelve null', () => {
  assert.equal(mapearErrorBd({ code: 'SQLITE_CONSTRAINT_NOTNULL' }), null);
  assert.equal(mapearErrorBd({ code: 'ECONNREFUSED' }), null);
  assert.equal(mapearErrorBd(new Error('x')), null);
  assert.equal(mapearErrorBd(null), null);
  assert.equal(mapearErrorBd('ER_DUP_ENTRY'), null);
});

test('duplicado real en SQLite (índice único) responde 409 con el mensaje y registra el original', async () => {
  await knex.raw('CREATE UNIQUE INDEX ux_productos_nombre ON productos (nombre)');
  const res = await request(app()).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Alfa', precio: 1 });
  assert.equal(res.status, 409);
  assert.deepEqual(res.body, { status: false, message: MENSAJE_DUPLICADO });
  assert.ok(logger.registro.error.some((m) => m.includes('UNIQUE constraint failed')));
});

test('duplicado de clave primaria en SQLite responde 409 (pkEscribible)', async () => {
  const a = app({ campos: CAMPOS_CON_PK, pkEscribible: true });
  const res = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ id: 1, nombre: 'Dup', precio: 1 });
  assert.equal(res.status, 409);
  assert.equal(res.body.message, MENSAJE_DUPLICADO);
});

test('clave foránea en SQLite: insertar con padre inexistente responde 409 de referencia', async () => {
  await knex.schema.createTable('padres', (t) => { t.increments('id'); t.string('nombre'); });
  await knex.schema.createTable('hijos', (t) => {
    t.increments('id');
    t.integer('padre_id').references('id').inTable('padres');
    t.string('nombre');
  });
  await knex('padres').insert({ nombre: 'P1' });
  const a = crearApp({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'hijos', campos: CAMPOS_HIJOS, logger });
  const res = await request(a).post('/api/productos').set('x-permisos', 'productos.crear').send({ padre_id: 999, nombre: 'H' });
  assert.equal(res.status, 409);
  assert.deepEqual(res.body, { status: false, message: MENSAJE_REFERENCIA });
  assert.ok(logger.registro.error.some((m) => m.includes('FOREIGN KEY constraint failed')));
});

test('clave foránea en SQLite: borrar un registro referenciado responde 409 de referencia', async () => {
  await knex.schema.createTable('padres', (t) => { t.increments('id'); t.string('nombre'); });
  await knex.schema.createTable('hijos', (t) => {
    t.increments('id');
    t.integer('padre_id').references('id').inTable('padres');
    t.string('nombre');
  });
  await knex('padres').insert({ nombre: 'P1' });
  await knex('hijos').insert({ padre_id: 1, nombre: 'H1' });
  const a = crearApp({
    knex,
    sso: ssoMock(),
    recurso: 'productos',
    tabla: 'padres',
    campos: [{ field: 'nombre', headerName: 'Nombre', type: 'text' }],
    logger,
  });
  const res = await request(a).delete('/api/productos/1').set('x-permisos', 'productos.eliminar');
  assert.equal(res.status, 409);
  assert.equal(res.body.message, MENSAJE_REFERENCIA);
  assert.equal((await knex('padres').where({ id: 1 }).first()).nombre, 'P1');
});

test('error de BD no mapeado (NOT NULL) sigue siendo 500 "Error interno" y se registra', async () => {
  await knex.schema.alterTable('productos', (t) => { t.string('obligatorio').notNullable().defaultTo('x'); });
  const a = app({ campos: [...CAMPOS, { field: 'obligatorio', headerName: 'O', type: 'text' }] });
  const res = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'N', precio: 1, obligatorio: null });
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { status: false, message: 'Error interno' });
  assert.ok(logger.registro.error.some((m) => m.includes('NOT NULL constraint failed')));
});
