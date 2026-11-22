import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validarConfig,
  permisosDeRecurso,
  tienePermiso,
  camposFormulario,
  fieldsDefDesdeCampos,
  valoresIniciales,
  validarFormulario,
  construirPayload,
  extraerError,
  esRespuestaFallida,
  formTypeDeCampo,
  combinarOpciones,
  opcionesDeCampo,
  filasDeCampo,
  estaVacio,
  escaparHtml,
  etiquetaDeOpcion,
  textoCeldaCampo,
  formateadoresCeldas,
  markdownAHtmlSeguro,
} from '../src/helpers.js'

const campos = [
  { field: 'id', headerName: 'ID', type: 'number', writable: false },
  { field: 'nombre', headerName: 'Nombre', type: 'text', required: true },
  { field: 'precio', headerName: 'Precio', type: 'number', required: true },
  { field: 'activo', headerName: 'Activo', type: 'boolean' },
  { field: 'categoria', headerName: 'Cat', type: 'select', form_type: 'select', options: [{ value: 1, label: 'A' }] },
]

const http = { get() {}, post() {}, put() {}, delete() {} }

test('validarConfig exige recurso, endpoint, http y permisos', () => {
  assert.throws(() => validarConfig({ endpoint: '/x', http, permisos: [] }), /recurso/)
  assert.throws(() => validarConfig({ recurso: 'a', http, permisos: [] }), /endpoint/)
  assert.throws(() => validarConfig({ recurso: 'a', endpoint: '/x', permisos: [] }), /http/)
  assert.throws(() => validarConfig({ recurso: 'a', endpoint: '/x', http }), /permisos/)
  assert.throws(() => validarConfig({ recurso: 'a', endpoint: '/x', http: { get() {} }, permisos: [] }), /get, post, put y delete/)
  assert.equal(validarConfig({ recurso: 'a', endpoint: '/x', http, permisos: [] }), true)
})

test('permisosDeRecurso genera <recurso>.<accion>', () => {
  assert.deepEqual(permisosDeRecurso('productos'), {
    listar: 'productos.listar',
    crear: 'productos.crear',
    editar: 'productos.editar',
    eliminar: 'productos.eliminar',
  })
  assert.throws(() => permisosDeRecurso(''), /recurso/)
})

test('tienePermiso con permisos vacíos y completos', () => {
  assert.equal(tienePermiso([], 'productos.crear'), false)
  assert.equal(tienePermiso(['productos.crear'], 'productos.crear'), true)
  assert.throws(() => tienePermiso(undefined, 'x'), /array/)
})

test('camposFormulario excluye no escribibles y deduce form_type', () => {
  const form = camposFormulario(campos)
  assert.deepEqual(form.map((c) => c.field), ['nombre', 'precio', 'activo', 'categoria'])
  assert.equal(form.find((c) => c.field === 'activo').form_type, 'checkbox')
  assert.equal(form.find((c) => c.field === 'nombre').form_type, 'text')
  assert.equal(form.find((c) => c.field === 'precio').form_type, 'number')
})

test('fieldsDefDesdeCampos produce columnas para TableEditor', () => {
  const fd = fieldsDefDesdeCampos(campos)
  assert.equal(fd.length, campos.length)
  assert.equal(fd[1].field, 'nombre')
  assert.equal(fd[1].headerName, 'Nombre')
  assert.equal(fd[4].form_type, 'select')
})

test('valoresIniciales para alta y edición', () => {
  const alta = valoresIniciales(campos, undefined)
  assert.equal(alta.nombre, '')
  assert.equal(alta.activo, false)
  const edit = valoresIniciales(campos, { nombre: 'Taza', precio: 800, activo: 1, categoria: 1 })
  assert.equal(edit.nombre, 'Taza')
  assert.equal(edit.precio, 800)
  assert.equal(edit.activo, true)
  assert.equal(edit.categoria, 1)
})

test('validarFormulario detecta required vacíos y números inválidos', () => {
  const errores = validarFormulario(campos, { nombre: '  ', precio: 'abc', activo: false, categoria: '' })
  assert.equal(errores.nombre, 'Nombre es obligatorio')
  assert.equal(errores.precio, 'Debe ser un número')
  assert.equal(errores.activo, undefined)
  assert.deepEqual(validarFormulario(campos, { nombre: 'x', precio: 1, activo: true, categoria: 1 }), {})
})

test('construirPayload convierte tipos y omite campos no escribibles', () => {
  const payload = construirPayload(campos, { id: 99, nombre: 'Taza', precio: '800', activo: 1, categoria: 1 })
  assert.deepEqual(payload, { nombre: 'Taza', precio: 800, activo: true, categoria: 1 })
  const vacio = construirPayload(campos, { nombre: 'x', precio: '', activo: false, categoria: '' })
  assert.equal(vacio.precio, null)
  assert.equal(vacio.categoria, null)
})

test('extraerError lee errores de respuesta HTTP y del cuerpo', () => {
  const axiosLike = { response: { data: { status: false, message: 'Validación', errors: { nombre: 'Obligatorio' } } } }
  assert.deepEqual(extraerError(axiosLike), { message: 'Validación', errors: { nombre: 'Obligatorio' } })
  assert.deepEqual(extraerError({ status: false, message: 'Nope' }), { message: 'Nope', errors: {} })
  assert.deepEqual(extraerError(new Error('red caída')), { message: 'red caída', errors: {} })
  assert.equal(esRespuestaFallida({ status: false }), true)
  assert.equal(esRespuestaFallida({ status: true }), false)
})

const camposAvanzados = [
  { field: 'categoria', headerName: 'Categoría', type: 'select', required: true,
    options: [{ value: 1, label: 'Ropa' }, { value: 2, label: 'Hogar' }] },
  { field: 'etiquetas', headerName: 'Etiquetas', type: 'multiselect',
    options: [{ value: 10, label: 'Oferta' }, { value: 11, label: 'Nuevo' }] },
  { field: 'notas', headerName: 'Notas', type: 'text', form_type: 'markdown' },
  { field: 'descripcion', headerName: 'Desc', type: 'text', form_type: 'textarea', filas: 6 },
]

test('formTypeDeCampo reconoce multiselect y markdown', () => {
  assert.equal(formTypeDeCampo({ field: 'a', type: 'multiselect' }), 'multiselect')
  assert.equal(formTypeDeCampo({ field: 'a', type: 'select' }), 'select')
  assert.equal(formTypeDeCampo({ field: 'a', form_type: 'markdown' }), 'markdown')
  assert.throws(() => formTypeDeCampo({ field: 'a', form_type: 'rich' }), /form_type inválido/)
})

test('combinarOpciones completa options desde fields_def sin pisar las propias', () => {
  const explicitos = [{ field: 'categoria', type: 'select' }, { field: 'etiquetas', type: 'multiselect', options: [{ value: 9, label: 'Propia' }] }]
  const servidor = [
    { field: 'categoria', type: 'select', options: [{ value: 1, label: 'Ropa' }] },
    { field: 'etiquetas', type: 'multiselect', options: [{ value: 10, label: 'Oferta' }] },
  ]
  const combinados = combinarOpciones(explicitos, servidor)
  assert.deepEqual(combinados[0].options, [{ value: 1, label: 'Ropa' }])
  assert.deepEqual(combinados[1].options, [{ value: 9, label: 'Propia' }])
  assert.equal(combinarOpciones(explicitos, null), explicitos)
  assert.throws(() => combinarOpciones(explicitos, 'x'), /fieldsDef/)
})

test('opcionesDeCampo y etiquetaDeOpcion comparan por valor como texto', () => {
  assert.deepEqual(opcionesDeCampo({ field: 'x' }), [])
  assert.equal(etiquetaDeOpcion(camposAvanzados[0], '2'), 'Hogar')
  assert.equal(etiquetaDeOpcion(camposAvanzados[0], 99), undefined)
})

test('filasDeCampo usa filas o 4 por defecto y valida el valor', () => {
  assert.equal(filasDeCampo({ field: 'x' }), 4)
  assert.equal(filasDeCampo({ field: 'x', filas: 6 }), 6)
  assert.throws(() => filasDeCampo({ field: 'x', filas: 0 }), /filas/)
  assert.throws(() => filasDeCampo({ field: 'x', filas: '3' }), /filas/)
})

test('estaVacio contempla null, texto vacío y array vacío', () => {
  assert.equal(estaVacio(null), true)
  assert.equal(estaVacio('  '), true)
  assert.equal(estaVacio([]), true)
  assert.equal(estaVacio([10]), false)
  assert.equal(estaVacio(0), false)
})

test('valoresIniciales y construirPayload manejan multiselect como array de ids', () => {
  const v = valoresIniciales(camposAvanzados, { categoria: 2, etiquetas: [10, 11] })
  assert.deepEqual(v.etiquetas, [10, 11])
  assert.equal(valoresIniciales(camposAvanzados, undefined).etiquetas.length, 0)
  const payload = construirPayload(camposAvanzados, { categoria: '2', etiquetas: [11], notas: '', descripcion: 'x' })
  assert.deepEqual(payload.etiquetas, [11])
  assert.equal(payload.categoria, '2')
  assert.equal(payload.notas, null)
  assert.deepEqual(construirPayload(camposAvanzados, { categoria: '', etiquetas: [] }).etiquetas, [])
})

test('validarFormulario exige select y multiselect requeridos cuando están vacíos', () => {
  const requeridoMulti = [{ field: 'm', headerName: 'M', type: 'multiselect', required: true, options: [] }]
  assert.equal(validarFormulario(camposAvanzados, { categoria: '', etiquetas: [] }).categoria, 'Categoría es obligatorio')
  assert.equal(validarFormulario(camposAvanzados, { categoria: 1, etiquetas: [] }).etiquetas, undefined)
  assert.equal(validarFormulario(requeridoMulti, { m: [] }).m, 'M es obligatorio')
  assert.deepEqual(validarFormulario(requeridoMulti, { m: [1] }), {})
})

test('escaparHtml neutraliza etiquetas', () => {
  assert.equal(escaparHtml('<b>"A" & \'B\'</b>'), '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;')
})

test('textoCeldaCampo muestra _etiqueta de lookups, labels de multiselect y valor tal cual', () => {
  const [categoria, etiquetas] = camposAvanzados
  assert.equal(textoCeldaCampo(categoria, { categoria: 2, categoria_etiqueta: 'Hogar' }), 'Hogar')
  assert.equal(textoCeldaCampo(categoria, { categoria: 2 }), 'Hogar')
  assert.equal(textoCeldaCampo(categoria, { categoria: 7 }), '7')
  assert.equal(textoCeldaCampo(categoria, { categoria: 1, categoria_etiqueta: '<i>X</i>' }), '&lt;i&gt;X&lt;/i&gt;')
  assert.equal(textoCeldaCampo(etiquetas, { etiquetas: [10, 11] }), 'Oferta, Nuevo')
  assert.equal(textoCeldaCampo(etiquetas, { etiquetas: [] }), '')
  assert.equal(textoCeldaCampo(etiquetas, { etiquetas: [99] }), '99')
  assert.equal(textoCeldaCampo(categoria, { categoria: null }), '')
})

test('formateadoresCeldas genera un formateador por campo (o {} sin campos)', () => {
  const mapa = formateadoresCeldas(camposAvanzados)
  assert.deepEqual(Object.keys(mapa), ['categoria', 'etiquetas', 'notas', 'descripcion'])
  assert.equal(mapa.categoria({ categoria: 1, categoria_etiqueta: 'Ropa' }), 'Ropa')
  assert.deepEqual(formateadoresCeldas(null), {})
})

test('markdownAHtmlSeguro escapa HTML crudo y sólo emite etiquetas fijas', () => {
  const html = markdownAHtmlSeguro('# Título\n\nHola **mundo** y *x* con `code`\nlínea 2\n\n<script>alert(1)</script>')
  assert.equal(html, '<h1>Título</h1>\n<p>Hola <strong>mundo</strong> y <em>x</em> con <code>code</code><br>línea 2</p>\n<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  assert.equal(markdownAHtmlSeguro(''), '')
  assert.doesNotMatch(markdownAHtmlSeguro('[a](javascript:alert(1))<img src=x onerror=y>'), /<img|<a /)
  assert.throws(() => markdownAHtmlSeguro(null), /string/)
})
