import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { CAMPOS, ssoMock, crearKnex, crearTablaProductos, crearApp, loggerEspia } from './helpers/entorno.js';

const TODOS = 'productos.listar,productos.ver,productos.crear,productos.editar,productos.eliminar';

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

test('list: devuelve rows, totalRecords y fields_def', async () => {
  const res = await request(app()).get('/api/productos/list').set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, true);
  assert.equal(res.body.data.totalRecords, 5);
  assert.equal(res.body.data.rows.length, 5);
  assert.equal(res.body.data.fields_def[0].field, 'nombre');
  assert.equal(res.body.data.fields_def[1].css, 'text-end');
});

test('list: paginación con page y pageSize', async () => {
  const res = await request(app()).get('/api/productos/list?page=2&pageSize=2').set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.totalRecords, 5);
  assert.deepEqual(res.body.data.rows.map((r) => r.nombre), ['Gamma', 'Delta 50%']);
});

test('list: orden ascendente y descendente por campo ordenable', async () => {
  const asc = await request(app()).get('/api/productos/list?sortField=precio&sortOrder=asc').set('x-permisos', TODOS);
  assert.deepEqual(asc.body.data.rows.map((r) => r.precio), [10, 20, 30, 40, 50]);
  const desc = await request(app()).get('/api/productos/list?sortField=precio&sortOrder=desc').set('x-permisos', TODOS);
  assert.deepEqual(desc.body.data.rows.map((r) => r.precio), [50, 40, 30, 20, 10]);
});

test('list: sortField vacío (como lo envía TableEditor) no ordena', async () => {
  const res = await request(app()).get('/api/productos/list?sortField=&sortOrder=asc&search=').set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.totalRecords, 5);
});

test('list: búsqueda global sobre campos searchable, con escape de comodines', async () => {
  const res = await request(app()).get('/api/productos/list?search=alf').set('x-permisos', TODOS);
  assert.deepEqual(res.body.data.rows.map((r) => r.nombre), ['Alfa']);

  const porPorcentaje = await request(app()).get('/api/productos/list?search=' + encodeURIComponent('50%')).set('x-permisos', TODOS);
  assert.deepEqual(porPorcentaje.body.data.rows.map((r) => r.nombre), ['Delta 50%']);

  const porGuion = await request(app()).get('/api/productos/list?search=' + encodeURIComponent('_x')).set('x-permisos', TODOS);
  assert.deepEqual(porGuion.body.data.rows.map((r) => r.nombre), ['Epsilon_x']);
});

test('list: filtros por campo filterable (texto contiene, select/boolean igualdad)', async () => {
  const texto = await request(app()).get('/api/productos/list?filters=' + encodeURIComponent('{"nombre":"ta"}')).set('x-permisos', TODOS);
  assert.deepEqual(texto.body.data.rows.map((r) => r.nombre), ['Beta', 'Delta 50%']);

  const select = await request(app()).get('/api/productos/list?filters=' + encodeURIComponent('{"categoria":"a"}')).set('x-permisos', TODOS);
  assert.equal(select.body.data.totalRecords, 3);

  const bool = await request(app()).get('/api/productos/list?filters=' + encodeURIComponent('{"activo":false,"precio":"50"}')).set('x-permisos', TODOS);
  assert.deepEqual(bool.body.data.rows.map((r) => r.nombre), ['Epsilon_x']);
});

test('list: campo de orden o filtro fuera de la whitelist se rechaza con 400', async () => {
  const orden = await request(app()).get('/api/productos/list?sortField=owner_id').set('x-permisos', TODOS);
  assert.equal(orden.status, 400);
  assert.equal(orden.body.status, false);
  assert.ok(orden.body.errors.sortField);

  const inyeccion = await request(app()).get('/api/productos/list?sortField=' + encodeURIComponent('nombre; DROP TABLE productos')).set('x-permisos', TODOS);
  assert.equal(inyeccion.status, 400);

  const filtro = await request(app()).get('/api/productos/list?filters=' + encodeURIComponent('{"owner_id":1}')).set('x-permisos', TODOS);
  assert.equal(filtro.status, 400);
  assert.ok(filtro.body.errors['filters.owner_id']);

  const buscarNoBuscable = await request(app()).get('/api/productos/list?search=x&pageSize=abc').set('x-permisos', TODOS);
  assert.equal(buscarNoBuscable.status, 400);
  assert.ok(buscarNoBuscable.body.errors.pageSize);

  const sortOrderInvalido = await request(app()).get('/api/productos/list?sortField=precio&sortOrder=up').set('x-permisos', TODOS);
  assert.equal(sortOrderInvalido.status, 400);
});

test('list: sortField sólo acepta campos sortable (creado es sortable, calculado no)', async () => {
  const ok = await request(app()).get('/api/productos/list?sortField=creado').set('x-permisos', TODOS);
  assert.equal(ok.status, 200);
  const noOrdenable = await request(app()).get('/api/productos/list?sortField=calculado').set('x-permisos', TODOS);
  assert.equal(noOrdenable.status, 400);
});

test('ver: devuelve el registro o 404', async () => {
  const res = await request(app()).get('/api/productos/1').set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.nombre, 'Alfa');
  const noExiste = await request(app()).get('/api/productos/999').set('x-permisos', TODOS);
  assert.equal(noExiste.status, 404);
});

test('create: inserta sólo campos escribibles, devuelve 201 con la fila', async () => {
  const res = await request(app()).post('/api/productos').set('x-permisos', TODOS).send({
    nombre: 'Zeta', precio: '70', activo: true, categoria: 'b', calculado: 'hack', owner_id: 99,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.nombre, 'Zeta');
  assert.equal(res.body.data.precio, 70);
  assert.equal(res.body.data.activo, 1);
  assert.equal(res.body.data.calculado, 'auto');
  assert.equal(res.body.data.owner_id, undefined);
  const enBd = await knex('productos').where({ id: res.body.data.id }).first();
  assert.equal(enBd.owner_id, 1);
  assert.equal(enBd.calculado, 'auto');
  assert.ok(logger.registro.warn.some((m) => m.includes('calculado')));
  assert.ok(logger.registro.warn.some((m) => m.includes('owner_id')));
});

test('create: validación de requeridos y tipos devuelve 400 con errors', async () => {
  const res = await request(app()).post('/api/productos').set('x-permisos', TODOS).send({ precio: 'abc', categoria: 'zzz' });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors.nombre, 'Campo requerido');
  assert.equal(res.body.errors.precio, 'Debe ser un número');
  assert.equal(res.body.errors.categoria, 'Opción no válida');
});

test('update: modifica campos presentes y devuelve la fila', async () => {
  const res = await request(app()).put('/api/productos/2').set('x-permisos', TODOS).send({ precio: 35, owner_id: 5 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.precio, 35);
  const enBd = await knex('productos').where({ id: 2 }).first();
  assert.equal(enBd.owner_id, 1);
});

test('update: 404 si no existe, 400 si no hay campos válidos', async () => {
  const noExiste = await request(app()).put('/api/productos/999').set('x-permisos', TODOS).send({ precio: 1 });
  assert.equal(noExiste.status, 404);
  const vacio = await request(app()).put('/api/productos/1').set('x-permisos', TODOS).send({ owner_id: 3 });
  assert.equal(vacio.status, 400);
});

test('delete: elimina y devuelve { id }; 404 si no existe', async () => {
  const res = await request(app()).delete('/api/productos/3').set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { id: '3' });
  assert.equal(await knex('productos').where({ id: 3 }).first(), undefined);
  const noExiste = await request(app()).delete('/api/productos/3').set('x-permisos', TODOS);
  assert.equal(noExiste.status, 404);
});

test('403 sin permiso en cada ruta (401 sin usuario)', async () => {
  const sinPermiso = 'productos.listar';
  const a = app();
  assert.equal((await request(a).get('/api/productos/list').set('x-permisos', '')).status, 403);
  assert.equal((await request(a).get('/api/productos/1').set('x-permisos', sinPermiso)).status, 403);
  assert.equal((await request(a).post('/api/productos').set('x-permisos', sinPermiso).send({ nombre: 'x', precio: 1 })).status, 403);
  assert.equal((await request(a).put('/api/productos/1').set('x-permisos', sinPermiso).send({ precio: 1 })).status, 403);
  assert.equal((await request(a).delete('/api/productos/1').set('x-permisos', sinPermiso)).status, 403);
  assert.equal((await request(a).get('/api/productos/list')).status, 401);
  const registros = await knex('productos').count({ n: '*' }).first();
  assert.equal(registros.n, 5);
});

test('soloLectura: sólo expone list y ver (POST/PUT/DELETE no existen)', async () => {
  const a = app({ soloLectura: true });
  assert.equal((await request(a).get('/api/productos/list').set('x-permisos', TODOS)).status, 200);
  assert.equal((await request(a).get('/api/productos/1').set('x-permisos', TODOS)).status, 200);
  assert.equal((await request(a).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'x', precio: 1 })).status, 404);
  assert.equal((await request(a).delete('/api/productos/1').set('x-permisos', TODOS)).status, 404);
});

test('filtroBase acota list, ver, editar y eliminar', async () => {
  const a = app({ filtroBase: (req, qb) => qb.where('owner_id', 1) });
  const lista = await request(a).get('/api/productos/list').set('x-permisos', TODOS);
  assert.equal(lista.body.data.totalRecords, 4);
  assert.equal((await request(a).get('/api/productos/3').set('x-permisos', TODOS)).status, 404);
  assert.equal((await request(a).put('/api/productos/3').set('x-permisos', TODOS).send({ precio: 1 })).status, 404);
  assert.equal((await request(a).delete('/api/productos/3').set('x-permisos', TODOS)).status, 404);
});

test('hooks: antesCrear puede modificar datos, despuesEliminar recibe el registro', async () => {
  const eliminados = [];
  const a = app({
    hooks: {
      antesCrear: (req, datos) => ({ ...datos, nombre: `${datos.nombre}!` }),
      despuesEliminar: (req, registro) => { eliminados.push(registro.nombre); },
    },
  });
  const creado = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Nuevo', precio: 5 });
  assert.equal(creado.body.data.nombre, 'Nuevo!');
  await request(a).delete('/api/productos/1').set('x-permisos', TODOS);
  assert.deepEqual(eliminados, ['Alfa']);
});

test('hooks: un error con status se devuelve como respuesta controlada', async () => {
  const a = app({
    hooks: { antesEliminar: () => { const e = new Error('Protegido'); e.status = 409; throw e; } },
  });
  const res = await request(a).delete('/api/productos/1').set('x-permisos', TODOS);
  assert.equal(res.status, 500);
});

test('activityLog se invoca en escrituras; si falla se loguea sin romper la operación', async () => {
  const llamadas = [];
  const a = app({
    activityLog: async (req, info) => { llamadas.push(info.accion); throw new Error('sin tabla'); },
  });
  const res = await request(a).post('/api/productos').set('x-permisos', TODOS).send({ nombre: 'Log', precio: 2 });
  assert.equal(res.status, 201);
  assert.deepEqual(llamadas, ['crear']);
  assert.ok(logger.registro.error.some((m) => m.includes('activityLog falló')));
});

test('error de base de datos devuelve 500 y se registra', async () => {
  const a = app({ tabla: 'tabla_inexistente' });
  const res = await request(a).get('/api/productos/list').set('x-permisos', TODOS);
  assert.equal(res.status, 500);
  assert.equal(res.body.message, 'Error interno');
  assert.ok(logger.registro.error.length > 0);
});
