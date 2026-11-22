import { test } from 'node:test';
import assert from 'node:assert/strict';
import knexFactory from 'knex';
import request from 'supertest';
import { createCrudRouter } from '../src/index.js';
import { ssoMock, loggerEspia, crearApp } from './helpers/entorno.js';

// Prueba de integración contra un MySQL/MariaDB real. Sólo se ejecuta si CRUD_TEST_MYSQL_URL está definida
// (p. ej. mysql://usuario:clave@127.0.0.1:3306/base_de_prueba). Requiere el driver `mysql2` instalado.
const URL_MYSQL = process.env.CRUD_TEST_MYSQL_URL;
const SALTAR = URL_MYSQL === undefined ? 'CRUD_TEST_MYSQL_URL no definida' : false;
const PERMISOS = 'tst.listar';

test('MySQL: búsqueda y filtros de texto (CAST AS CHAR) funcionan contra servidor real', { skip: SALTAR }, async () => {
  const knex = knexFactory({ client: 'mysql2', connection: URL_MYSQL });
  const tabla = `crud_test_${process.pid}_${Date.now()}`;
  try {
    await knex.schema.createTable(tabla, (t) => {
      t.increments('id');
      t.string('nombre').notNullable();
      t.integer('precio').notNullable();
    });
    await knex(tabla).insert([{ nombre: 'Alfa', precio: 1 }, { nombre: 'Delta 50%', precio: 2 }]);

    const campos = [
      { field: 'nombre', headerName: 'Nombre', type: 'text', searchable: true, filterable: true },
      { field: 'precio', headerName: 'Precio', type: 'number', filterable: true },
    ];
    const app = crearApp({ knex, sso: ssoMock(), recurso: 'tst', tabla, campos, logger: loggerEspia() });

    const busqueda = await request(app).get('/api/productos/list?search=alf').set('x-permisos', PERMISOS);
    assert.equal(busqueda.status, 200);
    assert.deepEqual(busqueda.body.data.rows.map((r) => r.nombre), ['Alfa']);

    const porPorcentaje = await request(app).get('/api/productos/list?search=' + encodeURIComponent('50%')).set('x-permisos', PERMISOS);
    assert.deepEqual(porPorcentaje.body.data.rows.map((r) => r.nombre), ['Delta 50%']);

    const filtro = await request(app).get('/api/productos/list?filters=' + encodeURIComponent('{"nombre":"ta"}')).set('x-permisos', PERMISOS);
    assert.deepEqual(filtro.body.data.rows.map((r) => r.nombre), ['Delta 50%']);
  } finally {
    await knex.schema.dropTableIfExists(tabla);
    await knex.destroy();
  }
});

test('MySQL: el router se construye con un cliente mysql2 (sin consultar)', { skip: SALTAR }, () => {
  const knex = knexFactory({ client: 'mysql2', connection: URL_MYSQL });
  try {
    assert.doesNotThrow(() => createCrudRouter({
      knex, sso: ssoMock(), recurso: 'tst', tabla: 'x', campos: [{ field: 'a', headerName: 'A', type: 'text' }],
    }));
  } finally {
    knex.destroy();
  }
});
