import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizarAcciones,
  accionPermitida,
  normalizarFormulario,
  construirParametrosFormulario,
  erroresDeRespuesta,
  procesarGuardado,
} from '../src/helpers.js'

const TODOS = { crear: true, editar: true, eliminar: true, listar: true }
const PERMISOS_TODOS = ['productos.listar', 'productos.crear', 'productos.editar', 'productos.eliminar']

test('normalizarAcciones: undefined y null devuelven todas habilitadas', () => {
  assert.deepEqual(normalizarAcciones(undefined), TODOS)
  assert.deepEqual(normalizarAcciones(null), TODOS)
})

test('normalizarAcciones: claves ausentes quedan habilitadas', () => {
  assert.deepEqual(normalizarAcciones({ crear: false }), { crear: false, editar: true, eliminar: true, listar: true })
  assert.deepEqual(normalizarAcciones({}), TODOS)
})

test('normalizarAcciones: clave desconocida lanza error explícito', () => {
  assert.throws(() => normalizarAcciones({ exportar: true }), /clave desconocida: "exportar"/)
})

test('normalizarAcciones: valor no booleano lanza error (sin coerción)', () => {
  assert.throws(() => normalizarAcciones({ crear: 0 }), /"acciones.crear" debe ser booleano/)
  assert.throws(() => normalizarAcciones({ editar: 'true' }), /"acciones.editar" debe ser booleano/)
  assert.throws(() => normalizarAcciones({ listar: undefined }), /"acciones.listar" debe ser booleano/)
  assert.throws(() => normalizarAcciones({ listar: null }), /"acciones.listar" debe ser booleano/)
})

test('normalizarAcciones: tipo de contenedor inválido lanza error', () => {
  assert.throws(() => normalizarAcciones(['crear']), /debe ser un objeto/)
  assert.throws(() => normalizarAcciones('crear'), /debe ser un objeto/)
})

test('accionPermitida: requiere acción habilitada y permiso RBAC', () => {
  assert.equal(accionPermitida(TODOS, PERMISOS_TODOS, 'productos', 'crear'), true)
  assert.equal(accionPermitida({ ...TODOS, crear: false }, PERMISOS_TODOS, 'productos', 'crear'), false)
  assert.equal(accionPermitida(TODOS, ['productos.listar'], 'productos', 'crear'), false)
  assert.equal(accionPermitida({ ...TODOS, eliminar: false }, PERMISOS_TODOS, 'productos', 'eliminar'), false)
  assert.equal(accionPermitida(TODOS, PERMISOS_TODOS, 'productos', 'editar'), true)
  assert.equal(accionPermitida({ ...TODOS, listar: false }, PERMISOS_TODOS, 'productos', 'listar'), false)
})

test('accionPermitida: sin acciones usa el comportamiento de 0.3.x (sólo permisos)', () => {
  assert.equal(accionPermitida(undefined, ['productos.editar'], 'productos', 'editar'), true)
  assert.equal(accionPermitida(undefined, ['productos.editar'], 'productos', 'crear'), false)
})

test('accionPermitida: acción desconocida o permisos inválidos lanzan error', () => {
  assert.throws(() => accionPermitida(TODOS, PERMISOS_TODOS, 'productos', 'exportar'), /acción desconocida/)
  assert.throws(() => accionPermitida(TODOS, 'productos.crear', 'productos', 'crear'), /debe ser un array/)
})

test('normalizarFormulario: null/undefined devuelven null (FormCrud)', () => {
  assert.equal(normalizarFormulario(undefined), null)
  assert.equal(normalizarFormulario(null), null)
})

test('normalizarFormulario: acepta componente con footer opcional', () => {
  const body = { name: 'Body' }
  const footer = { name: 'Footer' }
  assert.deepEqual(normalizarFormulario({ componente: body }), { componente: body, footer: null })
  assert.deepEqual(normalizarFormulario({ componente: body, footer }), { componente: body, footer })
})

test('normalizarFormulario: errores explícitos', () => {
  assert.throws(() => normalizarFormulario({}), /componente.*es requerido/)
  assert.throws(() => normalizarFormulario({ componente: 'FormX' }), /componente.*es requerido/)
  assert.throws(() => normalizarFormulario({ componente: {}, footer: 'x' }), /footer.*componente Vue/)
  assert.throws(() => normalizarFormulario({ componente: {}, extra: 1 }), /clave desconocida: "extra"/)
  assert.throws(() => normalizarFormulario(['x']), /debe ser un objeto/)
})

test('construirParametrosFormulario: contrato de parametros (sin _modal_cod)', () => {
  const guardar = async () => ({ ok: true })
  const modalState = { guardar: null, guardando: false }
  const valores = { nombre: 'a' }
  const campos = [{ field: 'nombre', form_type: 'text' }]
  const p = construirParametrosFormulario({ modo: 'editar', fila: { id: 1 }, campos, valores, guardar, modalState })
  assert.deepEqual(Object.keys(p).sort(), ['_modalState', 'campos', 'fila', 'guardar', 'modo', 'valores'])
  assert.equal(p.modo, 'editar')
  assert.deepEqual(p.fila, { id: 1 })
  assert.equal(p.guardar, guardar)
  assert.equal(p._modalState, modalState)
  const crear = construirParametrosFormulario({ modo: 'crear', fila: null, campos, valores, guardar, modalState })
  assert.equal(crear.fila, null)
})

test('construirParametrosFormulario: validaciones explícitas', () => {
  const base = { campos: [], valores: {}, guardar: () => null, modalState: {} }
  assert.throws(() => construirParametrosFormulario({ ...base, modo: 'x', fila: null }), /modo de formulario inválido/)
  assert.throws(() => construirParametrosFormulario({ ...base, modo: 'editar', fila: null }), /"fila" es requerida/)
  assert.throws(() => construirParametrosFormulario({ ...base, modo: 'crear', fila: {} }), /"fila" debe ser null/)
  assert.throws(() => construirParametrosFormulario({ ...base, modo: 'crear', fila: null, guardar: 'x' }), /"guardar"/)
  assert.throws(() => construirParametrosFormulario({ ...base, modo: 'crear', fila: null, campos: null }), /"campos"/)
})

test('erroresDeRespuesta: errores de campo y mensaje general (mismo criterio que FormCrud)', () => {
  const campos = [{ field: 'nombre' }, { field: 'precio' }]
  const err = { response: { data: { message: 'No se pudo guardar', errors: { nombre: 'Duplicado', otro: 'x' } } } }
  assert.deepEqual(erroresDeRespuesta(err, campos), {
    errores: { nombre: 'Duplicado' },
    errorGeneral: 'No se pudo guardar otro: x',
  })
  const soloCampos = { response: { data: { message: 'Inválido', errors: { precio: 'Negativo' } } } }
  assert.deepEqual(erroresDeRespuesta(soloCampos, campos), { errores: { precio: 'Negativo' }, errorGeneral: '' })
  const sinErrors = new Error('Red caída')
  assert.deepEqual(erroresDeRespuesta(sinErrors, campos), { errores: {}, errorGeneral: 'Red caída' })
})

test('procesarGuardado: validación de cliente no llama a ejecutar ni a alEnviar', async () => {
  const llamadas = []
  const campos = [{ field: 'nombre', form_type: 'text', required: true }]
  const r = await procesarGuardado({
    campos,
    valores: { nombre: '' },
    modo: 'crear',
    id: undefined,
    ejecutar: async () => { llamadas.push('ejecutar') },
    alEnviar: () => { llamadas.push('enviar') },
  })
  assert.equal(r.ok, false)
  assert.ok(r.errores.nombre !== undefined)
  assert.deepEqual(llamadas, [])
})

test('procesarGuardado: envía payload y devuelve ok', async () => {
  const llamadas = []
  const campos = [{ field: 'nombre', form_type: 'text', required: true }, { field: 'activo', form_type: 'checkbox' }]
  const r = await procesarGuardado({
    campos,
    valores: { nombre: 'Pan', activo: true },
    modo: 'editar',
    id: 7,
    ejecutar: async (modo, id, payload) => { llamadas.push({ modo, id, payload }) },
    alEnviar: () => { llamadas.push('enviar') },
  })
  assert.deepEqual(r, { ok: true, errores: {}, errorGeneral: '' })
  assert.equal(llamadas[0], 'enviar')
  assert.equal(llamadas[1].modo, 'editar')
  assert.equal(llamadas[1].id, 7)
  assert.equal(llamadas[1].payload.nombre, 'Pan')
})

test('procesarGuardado: error del back se traduce a errores y registra en consola', async () => {
  const original = console.error
  const registros = []
  console.error = (...args) => { registros.push(args) }
  try {
    const campos = [{ field: 'nombre', form_type: 'text', required: true }]
    const r = await procesarGuardado({
      campos,
      valores: { nombre: 'Pan' },
      modo: 'crear',
      id: undefined,
      ejecutar: async () => { throw { response: { data: { message: 'Fallo', errors: { nombre: 'Ya existe' } } } } },
      alEnviar: () => {},
    })
    assert.deepEqual(r, { ok: false, errores: { nombre: 'Ya existe' }, errorGeneral: '' })
    assert.equal(registros.length, 1)
  } finally {
    console.error = original
  }
})
