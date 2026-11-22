import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createCrudRouter } from '../src/index.js';
import { CAMPOS, ssoMock, crearKnex, crearTablaProductos, crearApp, loggerEspia } from './helpers/entorno.js';

const TODOS = 'productos.listar,productos.ver,productos.crear,productos.editar,productos.eliminar';

let knex;
let logger;

// Tabla unida: usuarios(id, nombre). productos.owner_id -> usuarios.id (1 = Ana, 2 = Bruno, 3 sin productos).
async function crearTablaUsuarios(k) {
  await k.schema.createTable('usuarios', (t) => {
    t.integer('id').primary();
    t.string('nombre').notNullable();
  });
  await k.raw("INSERT INTO usuarios (id, nombre) VALUES (1, 'Ana'), (2, 'Bruno'), (3, 'Carla')");
}

// Campos con una columna de join (usuario_nombre) y operadores explícitos en precio.
const CAMPOS_JOIN = [
  { field: 'nombre', headerName: 'Nombre', type: 'text', sortable: true, filterable: true, searchable: true },
  { field: 'precio', headerName: 'Precio', type: 'number', sortable: true, filterable: true, operadores: ['igual', 'rango', 'en'] },
  { field: 'activo', headerName: 'Activo', type: 'boolean', filterable: true },
  {
    field: 'categoria', headerName: 'Categoría', type: 'select', sortable: true, filterable: true,
    options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
  },
  {
    field: 'usuario_nombre', headerName: 'Usuario', type: 'text', columna: 'u.nombre',
    sortable: true, filterable: true, searchable: true,
  },
];
const JOIN_USUARIOS = [{ tabla: 'usuarios', alias: 'u', on: ['owner_id', 'id'], tipo: 'left' }];

function app(extra = {}) {
  return crearApp({ knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger, ...extra });
}
function appJoin(extra = {}) {
  return app({ campos: CAMPOS_JOIN, joins: JOIN_USUARIOS, ...extra });
}
const nombres = (res) => res.body.data.rows.map((r) => r.nombre);
const get = (a, query = '') => request(a).get(`/api/productos/list${query}`).set('x-permisos', TODOS);

beforeEach(async () => {
  knex = crearKnex();
  await crearTablaProductos(knex);
  await crearTablaUsuarios(knex);
  // Fila con categoria nula y un 'Epsilon' sin categoría para probar nulo.
  await knex('productos').insert({ nombre: 'Zeta', precio: 60, activo: 1, categoria: null, creado: '2026-01-06', owner_id: 3 });
  logger = loggerEspia();
});

afterEach(async () => {
  await knex.destroy();
});

// ── JOINS ─────────────────────────────────────────────────────────────

test('joins: list trae la columna de la tabla unida y totalRecords sin duplicar', async () => {
  const res = await get(appJoin());
  assert.equal(res.status, 200);
  assert.equal(res.body.data.totalRecords, 6);
  const alfa = res.body.data.rows.find((r) => r.nombre === 'Alfa');
  assert.equal(alfa.usuario_nombre, 'Ana');
  assert.equal(res.body.data.rows.find((r) => r.nombre === 'Zeta').usuario_nombre, 'Carla');
});

test('joins: left join deja null cuando no hay fila relacionada', async () => {
  await knex('productos').insert({ nombre: 'Huerfano', precio: 1, activo: 1, owner_id: 99, creado: '2026-01-07' });
  const res = await get(appJoin(), '?search=Huerfano');
  assert.equal(res.body.data.rows[0].usuario_nombre, null);
});

test('joins: filtro por columna de join con operador', async () => {
  const res = await get(appJoin(), `?filters=${encodeURIComponent('{"usuario_nombre":{"op":"igual","valor":"Ana"}}')}`);
  assert.equal(res.status, 200);
  assert.deepEqual(nombres(res).sort(), ['Alfa', 'Beta', 'Delta 50%', 'Epsilon_x']);
  assert.equal(res.body.data.totalRecords, 4);
});

test('joins: búsqueda global incluye los campos searchable de la tabla unida', async () => {
  const res = await get(appJoin(), '?search=bruno');
  assert.deepEqual(nombres(res), ['Gamma']);
});

test('joins: orden por columna de join', async () => {
  const res = await get(appJoin(), '?sortField=usuario_nombre&sortOrder=desc');
  assert.equal(res.body.data.rows[0].usuario_nombre, 'Carla');
  assert.equal(res.body.data.rows[res.body.data.rows.length - 1].usuario_nombre, 'Ana');
});

test('joins: GET /:id devuelve la columna de join', async () => {
  const lista = await get(appJoin(), '?sortField=nombre');
  const id = lista.body.data.rows[0].id;
  const res = await request(appJoin()).get(`/api/productos/${id}`).set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.usuario_nombre, 'Ana');
});

test('joins: escritura sólo sobre la tabla principal; la columna de join se ignora con warning', async () => {
  const res = await request(appJoin())
    .post('/api/productos')
    .set('x-permisos', TODOS)
    .send({ nombre: 'Nuevo', precio: 5, activo: 1, usuario_nombre: 'Hacker' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.usuario_nombre, 'Ana');
  assert.ok(logger.registro.warn.some((m) => m.includes('usuario_nombre')));
  const fila = await knex('productos').where({ nombre: 'Nuevo' }).first();
  const usuarios = await knex('usuarios').select('nombre');
  assert.equal(usuarios.length, 3);
});

test('joins: PUT no modifica la tabla unida', async () => {
  const id = (await knex('productos').where({ nombre: 'Alfa' }).first()).id;
  const res = await request(appJoin())
    .put(`/api/productos/${id}`)
    .set('x-permisos', TODOS)
    .send({ precio: 11, usuario_nombre: 'X' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.precio, 11);
  assert.equal(res.body.data.usuario_nombre, 'Ana');
  assert.equal((await knex('usuarios').where({ id: 1 }).first()).nombre, 'Ana');
});

test('joins: declaración inválida lanza al construir (alias, on, columna, multiselect)', () => {
  const base = { knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', logger };
  const campos = CAMPOS_JOIN;
  const variantes = [
    [{ joins: [{ tabla: 'usuarios', alias: 'productos', on: ['owner_id', 'id'] }] }, /alias/],
    [{ joins: [{ tabla: 'usuarios; drop', alias: 'u', on: ['owner_id', 'id'] }] }, /tabla/],
    [{ joins: [{ tabla: 'usuarios', alias: 'u', on: ['owner_id'] }] }, /on debe ser/],
    [{ joins: [{ tabla: 'usuarios', alias: 'u', on: ['owner_id', 'id'], tipo: 'right' }] }, /tipo/],
    [{ joins: [{ tabla: 'usuarios', alias: 'u', on: ['owner_id', 'id'], extra: 1 }] }, /desconocida/],
    [{ joins: [{ tabla: 'usuarios', alias: 'u', on: ['x.owner_id; --', 'id'] }] }, /origen/],
    [{ joins: [{ tabla: 'usuarios', alias: 'u', on: ['owner_id', 'id'] }, { tabla: 'usuarios', alias: 'u', on: ['owner_id', 'id'] }] }, /ya está en uso/],
    [{ joins: JOIN_USUARIOS, campos: [{ ...CAMPOS_JOIN[4], columna: 'z.nombre' }, ...CAMPOS_JOIN.slice(0, 4)] }, /alias que no está declarado/],
    [{ joins: JOIN_USUARIOS, campos: [{ ...CAMPOS_JOIN[4], columna: 'sinalias' }, ...CAMPOS_JOIN.slice(0, 4)] }, /alias.columna|debe ser "alias.columna"/],
  ];
  for (const [extra, patron] of variantes) {
    assert.throws(() => createCrudRouter({ ...base, campos, ...extra }), patron);
  }
});

test('joins: el origen puede ser alias.columna de un join anterior', async () => {
  await knex.schema.createTable('grupos', (t) => {
    t.integer('id').primary();
    t.string('etiqueta');
    t.integer('usuario_id');
  });
  await knex('grupos').insert({ id: 1, etiqueta: 'Equipo A', usuario_id: 2 });
  const campos = [
    { field: 'nombre', headerName: 'Nombre', type: 'text', sortable: true },
    { field: 'grupo', headerName: 'Grupo', type: 'text', columna: 'g.etiqueta', sortable: true, filterable: true },
    { field: 'responsable', headerName: 'Responsable', type: 'text', columna: 'u.nombre', sortable: true },
  ];
  const joins = [
    { tabla: 'usuarios', alias: 'u', on: ['owner_id', 'id'] },
    { tabla: 'grupos', alias: 'g', on: ['u.id', 'usuario_id'] },
  ];
  const res = await get(app({ campos, joins }), '?sortField=nombre');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.rows.find((r) => r.nombre === 'Gamma').grupo, 'Equipo A');
});

// ── FILTROS CON OPERADORES ───────────────────────────────────────────

const filtro = (obj) => `?filters=${encodeURIComponent(JSON.stringify(obj))}`;

test('filtros: igual, distinto y en sobre campos numéricos', async () => {
  const igual = await get(app(), filtro({ precio: { op: 'igual', valor: 20 } }));
  assert.deepEqual(nombres(igual), ['Gamma']);
  const distinto = await get(app(), filtro({ categoria: { op: 'distinto', valor: 'a' } }));
  assert.ok(distinto.body.data.rows.every((r) => r.categoria !== 'a'));
  const en = await get(appJoin(), filtro({ precio: { op: 'en', valor: [10, 50] } }));
  assert.deepEqual(nombres(en).sort(), ['Alfa', 'Epsilon_x']);
});

test('filtros: rango con desde y hasta, y con sólo uno de los extremos', async () => {
  const ambos = await get(app(), filtro({ precio: { op: 'rango', desde: 20, hasta: 40 } }));
  assert.deepEqual(nombres(ambos).sort(), ['Beta', 'Delta 50%', 'Gamma']);
  const soloDesde = await get(app(), filtro({ precio: { op: 'rango', desde: 50 } }));
  assert.deepEqual(nombres(soloDesde).sort(), ['Epsilon_x', 'Zeta'].sort());
  const soloHasta = await get(app(), filtro({ precio: { op: 'rango', hasta: 10 } }));
  assert.deepEqual(nombres(soloHasta), ['Alfa']);
});

test('filtros: nulo true/false', async () => {
  const nulos = await get(app(), filtro({ categoria: { op: 'nulo', valor: true } }));
  assert.deepEqual(nombres(nulos), ['Zeta']);
  const noNulos = await get(app(), filtro({ categoria: { op: 'nulo', valor: false } }));
  assert.equal(noNulos.body.data.totalRecords, 5);
});

test('filtros: contiene sobre texto con operador explícito y legacy (valor plano)', async () => {
  const explicito = await get(app(), filtro({ nombre: { op: 'contiene', valor: 'mma' } }));
  assert.deepEqual(nombres(explicito), ['Gamma']);
  const legacy = await get(app(), filtro({ nombre: 'alf' }));
  assert.deepEqual(nombres(legacy), ['Alfa']);
});

test('filtros: en con join y contiene sobre join', async () => {
  const res = await get(appJoin(), filtro({ usuario_nombre: { op: 'en', valor: ['Bruno', 'Carla'] } }));
  assert.deepEqual(nombres(res).sort(), ['Gamma', 'Zeta']);
});

test('filtros: operador no declarado en el campo devuelve 400 con error por campo', async () => {
  const res = await get(app(), filtro({ precio: { op: 'contiene', valor: '1' } }));
  assert.equal(res.status, 400);
  assert.ok(res.body.errors['filters.precio']);
  const rango = await get(appJoin(), filtro({ precio: { op: 'rango' } }));
  assert.equal(rango.status, 400);
  assert.match(rango.body.errors['filters.precio'], /desde|hasta/);
});

test('filtros: operador desconocido, valor inválido y lista demasiado larga dan 400', async () => {
  const desconocido = await get(app(), filtro({ nombre: { op: 'sql', valor: 'x' } }));
  assert.equal(desconocido.status, 400);
  const invalido = await get(app(), filtro({ precio: { op: 'igual', valor: 'abc' } }));
  assert.equal(invalido.status, 400);
  const larga = await get(app(), filtro({ precio: { op: 'en', valor: Array.from({ length: 101 }, (_, i) => i) } }));
  assert.equal(larga.status, 400);
  const nuloMal = await get(app(), filtro({ categoria: { op: 'nulo', valor: 'si' } }));
  assert.equal(nuloMal.status, 400);
});

test('filtros: un campo no filterable devuelve 400', async () => {
  const res = await get(app(), filtro({ creado: { op: 'igual', valor: '2026-01-01' } }));
  assert.equal(res.status, 400);
});

test('configuración: operadores inválidos lanzan al construir', () => {
  const base = { knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', logger };
  const con = (campo) => createCrudRouter({ ...base, campos: [{ field: 'nombre', headerName: 'N', type: 'text' }, campo] });
  const f = { field: 'precio', headerName: 'P', type: 'number', filterable: true };
  assert.throws(() => con({ ...f, operadores: ['igual', 'sql'] }), /operador desconocido/);
  assert.throws(() => con({ ...f, operadores: ['contiene'] }), /contiene/);
  assert.throws(() => con({ ...f, operadores: ['rango', 'rango'] }), /repetidos|rango/);
  assert.throws(() => con({ ...f, filterable: false, operadores: ['igual'] }), /sólo es válido con filterable/);
  assert.throws(() => con({ ...f, operadores: [] }), /no vacío/);
});

// ── BÚSQUEDA ──────────────────────────────────────────────────────────

test('búsqueda: los comodines % y _ se buscan literalmente', async () => {
  const porcentaje = await get(app(), '?search=' + encodeURIComponent('%'));
  assert.deepEqual(nombres(porcentaje), ['Delta 50%']);
  const guion = await get(app(), '?search=' + encodeURIComponent('_'));
  assert.deepEqual(nombres(guion), ['Epsilon_x']);
  const barra = await get(app(), '?search=' + encodeURIComponent('\\'));
  assert.equal(barra.body.data.totalRecords, 0);
});

test('búsqueda: modo empieza, termina e igual vía opción busqueda', async () => {
  const empieza = await get(app({ busqueda: { modo: 'empieza' } }), '?search=gam');
  assert.deepEqual(nombres(empieza), ['Gamma']);
  const noEmpieza = await get(app({ busqueda: { modo: 'empieza' } }), '?search=amma');
  assert.equal(noEmpieza.body.data.totalRecords, 0);
  const termina = await get(app({ busqueda: { modo: 'termina' } }), '?search=ma');
  assert.deepEqual(nombres(termina), ['Gamma']);
  const igual = await get(app({ busqueda: { modo: 'igual' } }), '?search=Gamma');
  assert.deepEqual(nombres(igual), ['Gamma']);
  const igualParcial = await get(app({ busqueda: { modo: 'igual' } }), '?search=Gam');
  assert.equal(igualParcial.body.data.totalRecords, 0);
});

test('configuración: modo de búsqueda inválido lanza', () => {
  const base = { knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger };
  assert.throws(() => createCrudRouter({ ...base, busqueda: { modo: 'regex' } }), /busqueda/);
});

// ── PAGINACIÓN ────────────────────────────────────────────────────────

test('paginación: por defecto 25 y data.paginacion informa la configuración', async () => {
  const res = await get(app());
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.paginacion, { tamanoDefecto: 25, tamanoMaximo: 500, tamanosPermitidos: null });
  assert.equal(res.body.data.rows.length, 6);
});

test('paginación: tamanosPermitidos sólo acepta los valores declarados', async () => {
  const a = app({ paginacion: { tamanoDefecto: 10, tamanosPermitidos: [10, 25, 50, 100] } });
  const ok = await get(a, '?pageSize=25');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.rows.length, 6);
  const fuera = await get(a, '?pageSize=30');
  assert.equal(fuera.status, 400);
  assert.match(fuera.body.errors.pageSize, /no permitido/);
  const pagina = await get(a, '?pageSize=10&page=1');
  assert.equal(pagina.body.data.rows.length, 6);
  assert.equal(pagina.body.data.paginacion.tamanoDefecto, 10);
});

test('paginación: tamanoMaximo rechaza pageSize mayor y page inválido', async () => {
  const a = app({ paginacion: { tamanoDefecto: 2, tamanoMaximo: 3 } });
  const grande = await get(a, '?pageSize=4');
  assert.equal(grande.status, 400);
  assert.equal(grande.body.errors.pageSize, 'Máximo 3');
  const cero = await get(a, '?page=0');
  assert.equal(cero.status, 400);
  const cerov = await get(a, '?pageSize=0');
  assert.equal(cerov.status, 400);
  const letras = await get(a, '?pageSize=abc');
  assert.equal(letras.status, 400);
});

test('paginación: totalRecords respeta filtros y joins; las páginas recorren el conjunto filtrado', async () => {
  const a = appJoin({ paginacion: { tamanoDefecto: 2, tamanosPermitidos: [2, 10] } });
  const filtros = filtro({ usuario_nombre: { op: 'igual', valor: 'Ana' } });
  const p1 = await get(a, `${filtros}&pageSize=2&page=1`);
  assert.equal(p1.body.data.totalRecords, 4);
  assert.equal(p1.body.data.rows.length, 2);
  const p2 = await get(a, `${filtros}&pageSize=2&page=2`);
  assert.equal(p2.body.data.rows.length, 2);
  const p3 = await get(a, `${filtros}&pageSize=2&page=3`);
  assert.equal(p3.body.data.rows.length, 0);
  assert.equal(p3.body.data.totalRecords, 4);
});

test('configuración: paginacion inválida lanza', () => {
  const base = { knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger };
  assert.throws(() => createCrudRouter({ ...base, paginacion: { tamanoDefecto: 30, tamanosPermitidos: [10, 25] } }), /tamanoDefecto/);
  assert.throws(() => createCrudRouter({ ...base, paginacion: { tamanosPermitidos: [10, 600] } }), /tamanoMaximo/);
  assert.throws(() => createCrudRouter({ ...base, paginacion: { foo: 1 } }), /desconocida/);
});

// ── AYUDA (sólo claves) ───────────────────────────────────────────────

test('ayuda: el back expone sólo las claves configuradas', async () => {
  const ayuda = { clave: 'productos', botones: { crear: 'productos-crear' }, campos: { precio: 'productos-precio' } };
  const res = await get(app({ ayuda }));
  assert.deepEqual(res.body.data.ayuda, { clave: 'productos', botones: { crear: 'productos-crear' }, campos: { precio: 'productos-precio' } });
});

test('ayuda: sin configuración no aparece en la respuesta; una clave no string lanza', async () => {
  const res = await get(app());
  assert.equal(res.body.data.ayuda, undefined);
  const base = { knex, sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS, logger };
  assert.throws(() => createCrudRouter({ ...base, ayuda: { clave: () => 'x' } }), /string/);
  assert.throws(() => createCrudRouter({ ...base, ayuda: { botones: { borrar: 'x' } } }), /desconocida/);
});

// ── REGRESIÓN SIN JOINS ───────────────────────────────────────────────

test('regresión: sin joins la respuesta conserva rows, totalRecords y fields_def (sólo suma operadores)', async () => {
  const res = await get(app());
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body.data).sort(), ['fields_def', 'paginacion', 'rows', 'totalRecords']);
  assert.equal(res.body.data.totalRecords, 6);
  const precio = res.body.data.fields_def.find((c) => c.field === 'precio');
  assert.deepEqual(precio.operadores, ['igual', 'distinto', 'en', 'rango', 'nulo']);
  assert.equal(res.body.data.fields_def.find((c) => c.field === 'creado').operadores, undefined);
  assert.equal(res.body.data.rows[0].usuario_nombre, undefined);
});

test('regresión: sin joins las columnas no se qualifican (SQL idéntico a 0.3.0 en el listado)', async () => {
  const { aplicarJoins } = await import('../src/joins.js');
  const qb = aplicarJoins(knex('productos'), [], 'productos');
  assert.equal(qb.toSQL().sql, knex('productos').toSQL().sql);
});
