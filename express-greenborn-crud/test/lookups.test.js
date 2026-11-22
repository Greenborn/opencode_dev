import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createCrudRouter } from '../src/index.js';
import { ssoMock, crearKnex, loggerEspia } from './helpers/entorno.js';

const TODOS = 'articulos.listar,articulos.ver,articulos.crear,articulos.editar,articulos.eliminar';

let knex;
let logger;

async function crearEsquema(db) {
  await db.schema.createTable('categorias', (t) => {
    t.increments('id');
    t.string('nombre').notNullable();
    t.integer('workspace').notNullable();
  });
  await db.schema.createTable('etiquetas', (t) => {
    t.increments('id');
    t.string('nombre').notNullable();
    t.integer('workspace').notNullable();
  });
  await db.schema.createTable('articulos', (t) => {
    t.increments('id');
    t.string('nombre').notNullable();
    t.integer('categoria_id');
    t.integer('owner_id').defaultTo(1);
  });
  // Tabla intermedia sin PK: basta para los tests de N:M.
  await db.schema.createTable('articulo_etiquetas', (t) => {
    t.integer('articulo_id').notNullable();
    t.integer('etiqueta_id').notNullable();
  });
  await db('categorias').insert([
    { nombre: 'Bebidas', workspace: 1 },
    { nombre: 'Limpieza', workspace: 1 },
    { nombre: 'Secreta', workspace: 2 },
  ]);
  await db('etiquetas').insert([
    { nombre: 'Oferta', workspace: 1 },
    { nombre: 'Nuevo', workspace: 1 },
    { nombre: 'Interna', workspace: 2 },
  ]);
  await db('articulos').insert([
    { nombre: 'Pan', categoria_id: 1, owner_id: 1 },
    { nombre: 'Jabon', categoria_id: 2, owner_id: 2 },
  ]);
  await db('articulo_etiquetas').insert([
    { articulo_id: 1, etiqueta_id: 1 },
    { articulo_id: 1, etiqueta_id: 2 },
  ]);
}

const CAMPOS = [
  { field: 'nombre', headerName: 'Nombre', type: 'text', sortable: true, filterable: true, searchable: true, required: true },
  {
    field: 'categoria_id',
    headerName: 'Categoría',
    type: 'select',
    sortable: true,
    filterable: true,
    lookup: { tabla: 'categorias', valor: 'id', etiqueta: 'nombre', filtro: (req) => ({ workspace: req.user.workspace }) },
  },
  {
    field: 'etiquetas',
    headerName: 'Etiquetas',
    type: 'multiselect',
    relacion: {
      tabla: 'articulo_etiquetas',
      fkOrigen: 'articulo_id',
      fkDestino: 'etiqueta_id',
      lookup: { tabla: 'etiquetas', valor: 'id', etiqueta: 'nombre', filtro: (req) => ({ workspace: req.user.workspace }) },
    },
  },
];

/** App con usuario inyectado por cabeceras: x-permisos (lista) y x-workspace (default 1). */
function crearAppArticulos(extra = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const permisos = req.headers['x-permisos'];
    if (permisos !== undefined) {
      const ws = req.headers['x-workspace'];
      req.user = { id: 1, permisos: permisos === '' ? [] : permisos.split(','), workspace: ws === undefined ? 1 : Number(ws) };
    }
    next();
  });
  app.use('/api/articulos', createCrudRouter({
    knex, sso: ssoMock(), recurso: 'articulos', tabla: 'articulos', campos: CAMPOS, logger, ...extra,
  }));
  return app;
}

const conCabeceras = (r, ws = '1') => r.set('x-permisos', TODOS).set('x-workspace', ws);
const contar = async (tabla) => Number((await knex(tabla).count({ n: '*' }).first()).n);

beforeEach(async () => {
  knex = crearKnex();
  await crearEsquema(knex);
  logger = loggerEspia();
});

afterEach(async () => {
  await knex.destroy();
});

test('lookup en list: fields_def.options con el filtro aplicado y etiqueta en cada fila', async () => {
  const res = await conCabeceras(request(crearAppArticulos()).get('/api/articulos/list'));
  assert.equal(res.status, 200);
  const def = res.body.data.fields_def.find((d) => d.field === 'categoria_id');
  assert.deepEqual(def.options, [{ value: 1, label: 'Bebidas' }, { value: 2, label: 'Limpieza' }]);
  assert.equal(def.lookup, undefined, 'la definición pública no expone tabla ni columnas del lookup');
  const pan = res.body.data.rows.find((r) => r.nombre === 'Pan');
  assert.equal(pan.categoria_id, 1);
  assert.equal(pan.categoria_id_etiqueta, 'Bebidas');
});

test('lookup en ver: options y etiqueta; el filtro cambia con el request', async () => {
  const otro = await conCabeceras(request(crearAppArticulos()).get('/api/articulos/2'), '2');
  assert.equal(otro.status, 200);
  assert.equal(otro.body.data.categoria_id_etiqueta, 'Limpieza');
  const def = otro.body.fields_def.find((d) => d.field === 'categoria_id');
  assert.deepEqual(def.options, [{ value: 3, label: 'Secreta' }]);
});

test('POST con valor de lookup fuera del filtro devuelve 400 y no inserta', async () => {
  const antes = await contar('articulos');
  const res = await conCabeceras(request(crearAppArticulos()).post('/api/articulos')).send({ nombre: 'X', categoria_id: 3 });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors.categoria_id, 'Opción no válida');
  assert.equal(await contar('articulos'), antes);
});

test('PUT con valor de lookup inexistente devuelve 400; sin el campo en el body no se valida', async () => {
  await knex('articulos').where({ id: 2 }).update({ categoria_id: 3 });
  const app = crearAppArticulos();
  const mal = await conCabeceras(request(app).put('/api/articulos/2')).send({ categoria_id: 999 });
  assert.equal(mal.status, 400);
  assert.equal(mal.body.errors.categoria_id, 'Opción no válida');

  // Registro con referencia ya fuera de alcance: editar otro campo no lo revalida.
  const ok = await conCabeceras(request(app).put('/api/articulos/2')).send({ nombre: 'Jabón' });
  assert.equal(ok.status, 200);
  assert.equal((await knex('articulos').where({ id: 2 }).first()).categoria_id, 3);
});

test('POST con lookup y N:M válidos inserta y escribe la intermedia', async () => {
  const res = await conCabeceras(request(crearAppArticulos()).post('/api/articulos'))
    .send({ nombre: 'Leche', categoria_id: 1, etiquetas: [2, 1, 2] });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.categoria_id_etiqueta, 'Bebidas');
  assert.deepEqual(res.body.data.etiquetas, [1, 2]);
  const filas = await knex('articulo_etiquetas').where({ articulo_id: res.body.data.id }).orderBy('etiqueta_id');
  assert.deepEqual(filas.map((f) => f.etiqueta_id), [1, 2]);
});

test('PUT con etiquetas reemplaza el conjunto; [] lo vacía', async () => {
  const app = crearAppArticulos();
  const reemplazo = await conCabeceras(request(app).put('/api/articulos/1')).send({ etiquetas: [2] });
  assert.equal(reemplazo.status, 200);
  assert.deepEqual(reemplazo.body.data.etiquetas, [2]);
  assert.deepEqual((await knex('articulo_etiquetas').where({ articulo_id: 1 })).map((f) => f.etiqueta_id), [2]);

  const vacio = await conCabeceras(request(app).put('/api/articulos/1')).send({ etiquetas: [] });
  assert.equal(vacio.status, 200);
  assert.deepEqual(vacio.body.data.etiquetas, []);
  assert.equal((await knex('articulo_etiquetas').where({ articulo_id: 1 })).length, 0);
});

test('N:M con id inexistente o fuera del filtro: 400 y ningún dato escrito (POST)', async () => {
  const app = crearAppArticulos();
  const antesArticulos = await contar('articulos');
  const antesPivote = await contar('articulo_etiquetas');

  const fueraDeFiltro = await conCabeceras(request(app).post('/api/articulos'))
    .send({ nombre: 'Y', categoria_id: 1, etiquetas: [1, 3] });
  assert.equal(fueraDeFiltro.status, 400);
  assert.equal(fueraDeFiltro.body.errors.etiquetas, 'Opción no válida');

  const inexistente = await conCabeceras(request(app).post('/api/articulos'))
    .send({ nombre: 'Z', categoria_id: 1, etiquetas: [999] });
  assert.equal(inexistente.status, 400);

  assert.equal(await contar('articulos'), antesArticulos);
  assert.equal(await contar('articulo_etiquetas'), antesPivote);
});

test('N:M con id inexistente en PUT: 400 y la intermedia no cambia', async () => {
  const res = await conCabeceras(request(crearAppArticulos()).put('/api/articulos/1')).send({ nombre: 'Pan2', etiquetas: [2, 999] });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors.etiquetas, 'Opción no válida');
  assert.equal((await knex('articulos').where({ id: 1 }).first()).nombre, 'Pan');
  assert.deepEqual((await knex('articulo_etiquetas').where({ articulo_id: 1 })).map((f) => f.etiqueta_id), [1, 2]);
});

test('N:M: valor que no es array devuelve 400', async () => {
  const res = await conCabeceras(request(crearAppArticulos()).post('/api/articulos'))
    .send({ nombre: 'W', etiquetas: 1 });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors.etiquetas, 'Debe ser una lista de ids');
});

test('fallo de la intermedia a mitad de la escritura: rollback, el registro principal no queda', async () => {
  const roto = crearAppArticulos({
    campos: [
      ...CAMPOS.slice(0, 2),
      { ...CAMPOS[2], relacion: { ...CAMPOS[2].relacion, fkDestino: 'columna_inexistente' } },
    ],
  });
  const antes = await contar('articulos');
  const res = await conCabeceras(request(roto).post('/api/articulos')).send({ nombre: 'Roto', etiquetas: [1] });
  assert.equal(res.status, 500);
  assert.equal(await contar('articulos'), antes);
  assert.ok(logger.registro.error.length > 0);
});

test('DELETE físico borra también las filas de la intermedia', async () => {
  const res = await conCabeceras(request(crearAppArticulos()).delete('/api/articulos/1'));
  assert.equal(res.status, 200);
  assert.equal(await contar('articulo_etiquetas'), 0);
});

test('/ver incluye fields_def; /list y /ver devuelven los ids de N:M', async () => {
  const res = await conCabeceras(request(crearAppArticulos()).get('/api/articulos/1'));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.etiquetas, [1, 2]);
  const def = res.body.fields_def.find((d) => d.field === 'etiquetas');
  assert.deepEqual(def.options, [{ value: 2, label: 'Nuevo' }, { value: 1, label: 'Oferta' }]);
  assert.equal(def.form_type, 'multiselect');
});

test('options se limitan a 1000 y se registra un aviso', async () => {
  const filas = Array.from({ length: 1001 }, (_, i) => ({ nombre: `Cat ${String(i).padStart(4, '0')}`, workspace: 1 }));
  await knex.batchInsert('categorias', filas, 200);
  const res = await conCabeceras(request(crearAppArticulos()).get('/api/articulos/list'));
  const def = res.body.data.fields_def.find((d) => d.field === 'categoria_id');
  assert.equal(def.options.length, 1000);
  assert.ok(logger.registro.warn.some((m) => m.includes('1000')));
});

test('configuración inválida de lookup o multiselect lanza al construir', () => {
  const base = { knex, sso: ssoMock(), recurso: 'articulos', tabla: 'articulos', logger };
  const con = (campos) => () => createCrudRouter({ ...base, campos: [CAMPOS[0], ...campos] });

  assert.throws(con([{ field: 'x', headerName: 'X', type: 'select', lookup: { tabla: 'a;b', valor: 'id', etiqueta: 'nombre' } }]), /lookup\.tabla/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'select', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n o' } }]), /lookup\.etiqueta/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'select', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n', extra: 1 } }]), /opción desconocida "extra"/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'select', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n', filtro: 'no' } }]), /filtro debe ser una función/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'select', options: [{ value: 1, label: 'a' }], lookup: { tabla: 'c', valor: 'id', etiqueta: 'n' } }]), /excluyentes/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'text', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n' } }]), /sólo es válido con type "select"/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'multiselect' }]), /requiere "relacion"/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'multiselect', relacion: { tabla: 't', fkOrigen: 'a', fkDestino: 'b' } }]), /relacion\.lookup/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'multiselect', relacion: { tabla: 't', fkOrigen: 'a b', fkDestino: 'b', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n' } } }]), /relacion\.fkOrigen/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'multiselect', sortable: true, relacion: { tabla: 't', fkOrigen: 'a', fkDestino: 'b', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n' } } }]), /no admite sortable/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'multiselect', options: [{ value: 1, label: 'a' }], relacion: { tabla: 't', fkOrigen: 'a', fkDestino: 'b', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n' } } }]), /no admite "options"/);
  assert.throws(con([{ field: 'x', headerName: 'X', type: 'text', relacion: { tabla: 't', fkOrigen: 'a', fkDestino: 'b', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n' } } }]), /sólo es válido con type "multiselect"/);
  const rel = { tabla: 't', fkOrigen: 'a', fkDestino: 'b', lookup: { tabla: 'c', valor: 'id', etiqueta: 'n' } };
  assert.throws(con([
    { field: 'x', headerName: 'X', type: 'multiselect', relacion: rel },
    { field: 'y', headerName: 'Y', type: 'multiselect', relacion: rel },
  ]), /más de un campo multiselect/);
});
