/**
 * http mock en memoria que responde con la forma del contrato (PLAN_CRUD_GENERICO.md 3.1-3.3).
 * Sólo para la demo: no hay backend.
 */

export const campos = [
  { field: 'id', headerName: 'ID', type: 'number', writable: false, sortable: true },
  { field: 'nombre', headerName: 'Nombre', type: 'text', required: true, sortable: true, filterable: true, searchable: true },
  { field: 'precio', headerName: 'Precio', type: 'number', form_type: 'number', required: true, sortable: true, css: 'text-end' },
  { field: 'fecha', headerName: 'Alta', type: 'date', form_type: 'date', sortable: true },
  // Lookup (select): el back manda options y en cada fila `categoria_etiqueta`.
  { field: 'categoria', headerName: 'Categoría', type: 'select', form_type: 'select', required: true,
    options: [{ value: 1, label: 'Ropa' }, { value: 2, label: 'Hogar' }, { value: 3, label: 'Tecnología' }] },
  // Relación N:M: options y valor = array de ids.
  { field: 'etiquetas', headerName: 'Etiquetas', type: 'multiselect', form_type: 'multiselect',
    options: [{ value: 10, label: 'Oferta' }, { value: 11, label: 'Nuevo' }, { value: 12, label: 'Liquidación' }] },
  { field: 'activo', headerName: 'Activo', type: 'boolean', form_type: 'checkbox' },
  { field: 'descripcion', headerName: 'Descripción', type: 'text', form_type: 'textarea', filas: 3, searchable: true },
  { field: 'notas', headerName: 'Notas', type: 'text', form_type: 'markdown', filas: 6 },
]

const CATEGORIAS = campos.find((c) => c.field === 'categoria').options

let seq = 4
const filas = [
  { id: 1, nombre: 'Remera', precio: 1500, fecha: '2026-01-10', categoria: 1, etiquetas: [10, 11], activo: true, descripcion: 'Algodón', notas: '# Remera\n\nTalles **S** a **XL**.' },
  { id: 2, nombre: 'Taza', precio: 800, fecha: '2026-02-03', categoria: 2, etiquetas: [], activo: true, descripcion: '', notas: '' },
  { id: 3, nombre: 'Auriculares', precio: 25000, fecha: '2026-03-20', categoria: 3, etiquetas: [11, 12], activo: false, descripcion: 'Bluetooth', notas: 'Garantía de *6 meses*.' },
]

function etiquetaCategoria(valor) {
  const op = CATEGORIAS.find((o) => o.value === valor)
  return op === undefined ? undefined : op.label
}

const camposEscribibles = campos.filter((c) => c.writable !== false)

function error(status, message, errors) {
  const cuerpo = { status: false, message }
  if (errors !== undefined) cuerpo.errors = errors
  const err = new Error(message)
  err.response = { status, data: cuerpo }
  return err
}

function validar(body) {
  const errors = {}
  for (const c of camposEscribibles) {
    const v = body[c.field]
    if (c.required === true && (v === null || v === undefined || v === '')) {
      errors[c.field] = 'Campo obligatorio'
    }
  }
  if (body.precio !== null && body.precio < 0) errors.precio = 'No puede ser negativo'
  return errors
}

function soloCamposPermitidos(body) {
  const limpio = {}
  const permitidos = camposEscribibles.map((c) => c.field)
  for (const k of Object.keys(body)) {
    if (permitidos.includes(k)) limpio[k] = body[k]
    else console.log(`[mock] campo no permitido descartado: ${k}`)
  }
  return limpio
}

function listar(params) {
  let res = filas.slice()
  if (params.search) {
    const q = String(params.search).toLowerCase()
    res = res.filter((f) => ['nombre', 'descripcion'].some((k) => String(f[k] ?? '').toLowerCase().includes(q)))
  }
  if (params.filters) {
    const cf = JSON.parse(params.filters)
    for (const k of Object.keys(cf)) {
      res = res.filter((f) => String(f[k] ?? '').toLowerCase().includes(String(cf[k]).toLowerCase()))
    }
  }
  if (params.sortField) {
    const dir = params.sortOrder === 'desc' ? -1 : 1
    res.sort((a, b) => (a[params.sortField] > b[params.sortField] ? dir : -dir))
  }
  const page = Number(params.page)
  const size = Number(params.pageSize)
  const inicio = (page - 1) * size
  // Lookups: el back agrega `<campo>_etiqueta` a cada fila (no se guarda en el store).
  const rows = res.slice(inicio, inicio + size).map((f) => ({ ...f, categoria_etiqueta: etiquetaCategoria(f.categoria) }))
  return { status: true, data: { rows, totalRecords: res.length, fields_def: campos } }
}

export function crearHttpMock() {
  return {
    get: async (url, cfg) => {
      if (url === '/api/productos/list') {
        return listar(cfg.params)
      }
      throw error(404, 'Ruta no encontrada')
    },
    post: async (url, body) => {
      const errors = validar(body)
      if (Object.keys(errors).length > 0) throw error(400, 'Validación fallida', errors)
      const row = { id: seq, ...soloCamposPermitidos(body) }
      seq += 1
      filas.push(row)
      return { status: true, data: row }
    },
    put: async (url, body) => {
      const id = Number(url.split('/').pop())
      const fila = filas.find((f) => f.id === id)
      if (!fila) throw error(404, 'Registro no encontrado')
      const errors = validar({ ...fila, ...body })
      if (Object.keys(errors).length > 0) throw error(400, 'Validación fallida', errors)
      Object.assign(fila, soloCamposPermitidos(body))
      return { status: true, data: fila }
    },
    delete: async (url) => {
      const id = Number(url.split('/').pop())
      const idx = filas.findIndex((f) => f.id === id)
      if (idx < 0) throw error(404, 'Registro no encontrado')
      filas.splice(idx, 1)
      return { status: true, data: { id } }
    },
  }
}
