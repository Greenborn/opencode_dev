import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  construirFiltrosAvanzados,
  combinarFiltros,
  opcionesTamanoPagina,
  pageSizeAceptado,
  resolverAyuda,
  atributosAyuda,
  operadoresDeFiltro,
  crearAdaptadorPreferencias,
  crearPreferenciasLocales,
  clavePreferenciasTabla,
} from '../src/helpers.js'

const CAMPOS = [
  { field: 'nombre', headerName: 'Nombre', type: 'text', filterable: true, operadores: ['igual', 'contiene', 'en', 'nulo'] },
  { field: 'precio', headerName: 'Precio', type: 'number', filterable: true, operadores: ['igual', 'rango', 'en'] },
  { field: 'activo', headerName: 'Activo', type: 'boolean', filterable: true, operadores: ['igual', 'nulo'] },
  { field: 'creado', headerName: 'Creado', type: 'date', filterable: false },
]

// ── Filtros avanzados ─────────────────────────────────────────────

test('construirFiltrosAvanzados: igual numérico se tipa a número', () => {
  const r = construirFiltrosAvanzados(CAMPOS, { precio: { op: 'igual', valor: '20' } })
  assert.deepEqual(r, { precio: { op: 'igual', valor: 20 } })
})

test('construirFiltrosAvanzados: en separa por coma y tipa números', () => {
  const r = construirFiltrosAvanzados(CAMPOS, { precio: { op: 'en', valor: ' 10, 50 ,' } })
  assert.deepEqual(r, { precio: { op: 'en', valor: [10, 50] } })
  const t = construirFiltrosAvanzados(CAMPOS, { nombre: { op: 'en', valor: 'a,b' } })
  assert.deepEqual(t, { nombre: { op: 'en', valor: ['a', 'b'] } })
})

test('construirFiltrosAvanzados: rango con uno o ambos extremos; sin extremos no se envía', () => {
  assert.deepEqual(
    construirFiltrosAvanzados(CAMPOS, { precio: { op: 'rango', desde: '5', hasta: '' } }),
    { precio: { op: 'rango', desde: 5 } },
  )
  assert.deepEqual(
    construirFiltrosAvanzados(CAMPOS, { precio: { op: 'rango', desde: '', hasta: '9' } }),
    { precio: { op: 'rango', hasta: 9 } },
  )
  assert.deepEqual(construirFiltrosAvanzados(CAMPOS, { precio: { op: 'rango', desde: '', hasta: '' } }), {})
})

test('construirFiltrosAvanzados: nulo y booleanos con si/no', () => {
  assert.deepEqual(construirFiltrosAvanzados(CAMPOS, { nombre: { op: 'nulo', valor: 'si' } }), { nombre: { op: 'nulo', valor: true } })
  assert.deepEqual(construirFiltrosAvanzados(CAMPOS, { nombre: { op: 'nulo', valor: 'no' } }), { nombre: { op: 'nulo', valor: false } })
  assert.deepEqual(construirFiltrosAvanzados(CAMPOS, { activo: { op: 'igual', valor: 'si' } }), { activo: { op: 'igual', valor: true } })
  assert.throws(() => construirFiltrosAvanzados(CAMPOS, { activo: { op: 'igual', valor: 'quizas' } }), /si o no/)
})

test('construirFiltrosAvanzados: operador no declarado para el campo lanza', () => {
  assert.throws(() => construirFiltrosAvanzados(CAMPOS, { precio: { op: 'contiene', valor: '1' } }), /no permitido/)
  assert.throws(() => construirFiltrosAvanzados(CAMPOS, { creado: { op: 'igual', valor: '2026-01-01' } }), /no permitido/)
})

test('construirFiltrosAvanzados: campos sin operador o valor vacío se omiten; requiere array', () => {
  assert.deepEqual(construirFiltrosAvanzados(CAMPOS, { nombre: { op: '', valor: 'x' } }), {})
  assert.deepEqual(construirFiltrosAvanzados(CAMPOS, { nombre: { op: 'igual', valor: '   ' } }), {})
  assert.throws(() => construirFiltrosAvanzados({}, {}), /array/)
})

test('operadoresDeFiltro: sólo operadores conocidos y sólo si es filtrable', () => {
  assert.deepEqual(operadoresDeFiltro({ filterable: true, operadores: ['igual', 'raro'] }), ['igual'])
  assert.deepEqual(operadoresDeFiltro({ filterable: false, operadores: ['igual'] }), [])
  assert.deepEqual(operadoresDeFiltro({ filterable: true }), [])
})

// ── combinarFiltros (TableEditor + avanzados) ────────────────────────

test('combinarFiltros: sin filtros devuelve undefined', () => {
  assert.equal(combinarFiltros(undefined, {}), undefined)
  assert.equal(combinarFiltros('', undefined), undefined)
})

test('combinarFiltros: une el JSON de TableEditor con los avanzados; los avanzados ganan', () => {
  const r = combinarFiltros('{"nombre":"alf","precio":"1"}', { precio: { op: 'igual', valor: 20 } })
  assert.deepEqual(JSON.parse(r), { nombre: 'alf', precio: { op: 'igual', valor: 20 } })
})

test('combinarFiltros: JSON inválido o no objeto lanza', () => {
  assert.throws(() => combinarFiltros('{', {}), SyntaxError)
  assert.throws(() => combinarFiltros('[1]', {}), /objeto JSON/)
  assert.throws(() => combinarFiltros(5, {}), /string JSON/)
})

// ── Paginación ───────────────────────────────────────────────────────

test('opcionesTamanoPagina: usa los permitidos, limitados a tamanoMaximo y con el defecto incluido', () => {
  assert.deepEqual(opcionesTamanoPagina({ tamanoDefecto: 25, tamanoMaximo: 100, tamanosPermitidos: [10, 25, 50, 100, 500] }), [10, 25, 50, 100])
  assert.deepEqual(opcionesTamanoPagina({ tamanoDefecto: 15, tamanoMaximo: 500, tamanosPermitidos: [10, 25] }), [10, 15, 25])
  assert.deepEqual(opcionesTamanoPagina({ tamanoDefecto: 25, tamanoMaximo: 100, tamanosPermitidos: null }), [10, 25, 50, 100])
})

test('pageSizeAceptado: sin paginación conocida omite el parámetro; fuera de la lista usa el defecto', () => {
  assert.equal(pageSizeAceptado(50, undefined), undefined)
  const pag = { tamanoDefecto: 10, tamanoMaximo: 100, tamanosPermitidos: [10, 25] }
  assert.equal(pageSizeAceptado(25, pag), 25)
  assert.equal(pageSizeAceptado(50, pag), 10)
  assert.equal(pageSizeAceptado(undefined, pag), 10)
})

// ── Ayuda (data-help) ────────────────────────────────────────────────

test('resolverAyuda: sin configuración todos los botones quedan sin clave', () => {
  const r = resolverAyuda(undefined, { recurso: 'productos' })
  assert.deepEqual(r.botones, { listar: null, crear: null, editar: null, eliminar: null })
  assert.deepEqual(r.campos, {})
})

test('resolverAyuda: clave string con true (base-accion) y string propio', () => {
  const r = resolverAyuda({
    clave: 'productos',
    botones: { crear: true, editar: 'ayuda-editar-prod', eliminar: false, campo: { precio: true, nombre: 'ayuda-nombre' } },
  }, { recurso: 'productos' })
  assert.equal(r.botones.crear, 'productos-crear')
  assert.equal(r.botones.editar, 'ayuda-editar-prod')
  assert.equal(r.botones.eliminar, null)
  assert.equal(r.campos.precio, 'productos-campo-precio')
  assert.equal(r.campos.nombre, 'ayuda-nombre')
})

test('resolverAyuda: clave función recibe el recurso', () => {
  const r = resolverAyuda({ clave: ({ recurso }) => `ayuda-${recurso}`, botones: { listar: true } }, { recurso: 'clientes' })
  assert.equal(r.botones.listar, 'ayuda-clientes-listar')
})

test('resolverAyuda: true sin clave y tipos inválidos lanzan', () => {
  assert.throws(() => resolverAyuda({ botones: { crear: true } }, { recurso: 'x' }), /requiere ayuda.clave/)
  assert.throws(() => resolverAyuda({ clave: 'x', botones: { crear: 5 } }, { recurso: 'x' }), /string, true o false/)
  assert.throws(() => resolverAyuda({ clave: () => '' }, { recurso: 'x' }), /no vacío/)
  assert.throws(() => resolverAyuda({ clave: 'x' }, {}), /Parámetro requerido/)
})

test('atributosAyuda: sólo añade data-help si hay clave', () => {
  assert.deepEqual(atributosAyuda('k'), { 'data-help': 'k' })
  assert.deepEqual(atributosAyuda(null), {})
})

// ── Preferencias inyectadas ─────────────────────────────────────────

test('crearAdaptadorPreferencias: sin inyección devuelve null (TableEditor usa su adaptador global)', () => {
  assert.equal(crearAdaptadorPreferencias(undefined, 'productos'), null)
  assert.equal(crearAdaptadorPreferencias(null, 'productos'), null)
})

test('crearAdaptadorPreferencias: exige leer y guardar', () => {
  assert.throws(() => crearAdaptadorPreferencias({ leer() {} }, 'x'), /leer\(clave\) y guardar/)
})

test('crearAdaptadorPreferencias: carga al montar (fetch), valor síncrono y persistencia por clave', async () => {
  const almacen = { [clavePreferenciasTabla('productos')]: '{"columnOrder":["nombre"]}' }
  const llamadas = []
  const adaptador = crearAdaptadorPreferencias({
    leer: async (k) => almacen[k] ?? null,
    guardar: async (k, v) => { llamadas.push([k, v]); almacen[k] = v },
  }, 'productos')
  assert.equal(adaptador.valor('te_cfg_productos'), null)
  await adaptador.fetchMisPreferencias()
  assert.equal(adaptador.valor('te_cfg_productos'), '{"columnOrder":["nombre"]}')
  const r = await adaptador.guardarValores({ te_cfg_productos: '{"hiddenFields":["precio"]}' })
  assert.deepEqual(r, { status: true })
  assert.deepEqual(llamadas, [['te_cfg_productos', '{"hiddenFields":["precio"]}']])
  assert.equal(adaptador.valor('te_cfg_productos'), '{"hiddenFields":["precio"]}')
  assert.equal(almacen.te_cfg_productos, '{"hiddenFields":["precio"]}')
})

test('crearAdaptadorPreferencias: un fallo al guardar se registra y devuelve status false', async () => {
  const original = console.error
  const registrados = []
  console.error = (...args) => registrados.push(args)
  try {
    const adaptador = crearAdaptadorPreferencias({
      leer: async () => null,
      guardar: async () => { throw new Error('red caída') },
    }, 'productos')
    const r = await adaptador.guardarValores({ te_cfg_productos: '{}' })
    assert.equal(r.status, false)
    assert.equal(r.error, 'red caída')
    assert.equal(registrados.length, 1)
  } finally {
    console.error = original
  }
})

test('crearAdaptadorPreferencias: un fallo al leer se registra y no rompe el montaje', async () => {
  const original = console.error
  let registrados = 0
  console.error = () => { registrados += 1 }
  try {
    const adaptador = crearAdaptadorPreferencias({
      leer: async () => { throw new Error('sin sesión') },
      guardar: async () => {},
    }, 'productos')
    await adaptador.fetchMisPreferencias()
    assert.equal(adaptador.valor('te_cfg_productos'), null)
    assert.equal(registrados, 1)
  } finally {
    console.error = original
  }
})

test('crearPreferenciasLocales: estado local (storage inyectado) ida y vuelta', () => {
  const datos = new Map()
  const storage = { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, v) }
  const local = crearPreferenciasLocales(storage)
  local.guardar('te_cfg_productos', { columnOrder: ['a'] })
  assert.equal(datos.get('crud_prefs:te_cfg_productos'), '{"columnOrder":["a"]}')
  assert.equal(local.leer('te_cfg_productos'), '{"columnOrder":["a"]}')
  assert.equal(local.leer('otra'), null)
})

test('crearPreferenciasLocales: errores de storage se registran sin propagarse', () => {
  const original = console.error
  let registrados = 0
  console.error = () => { registrados += 1 }
  try {
    const storage = { getItem() { throw new Error('bloqueado') }, setItem() { throw new Error('cuota') } }
    const local = crearPreferenciasLocales(storage)
    assert.equal(local.leer('x'), null)
    local.guardar('x', 'y')
    assert.equal(registrados, 2)
  } finally {
    console.error = original
  }
})
