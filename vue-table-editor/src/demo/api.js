// Datos ficticios para la demo.

const estados = ['activo', 'inactivo', 'pendiente', 'entregado']
const colores = ['2563eb', 'dc2626', '16a34a', 'd97706', '7c3aed', '0891b2']
const nombres = [
  'Ana García', 'Luis Pérez', 'María López', 'Carlos Ruiz', 'Elena Sánchez',
  'Jorge Díaz', 'Lucía Fernández', 'Pedro Gómez', 'Sofía Torres', 'Diego Martín',
  'Valentina Romero', 'Andrés Vega', 'Camila Castro', 'Felipe Ortiz', 'Natalia Ríos',
  'Tomás Herrera', 'Isabel Navarro', 'Mateo Silva', 'Daniela Campos', 'Sebastián Mora',
]

const PRODUCTOS_LEN = 127
const clientes = []
for (let i = 1; i <= PRODUCTOS_LEN; i++) {
  const idx = (i - 1) % nombres.length
  clientes.push({
    id: i,
    nombre: nombres[idx],
    precio: Math.round((Math.random() * 900 + 100) * 100) / 100,
    stock: Math.floor(Math.random() * 300),
    estado: estados[i % estados.length],
    color: colores[i % colores.length],
    activo: i % 3 !== 0,
    creado_en: new Date(Date.now() - i * 86400000).toISOString(),
  })
}

const fields_def = [
  { field: 'id', headerName: 'ID', type: 'integer', width: '70px' },
  { field: 'nombre', headerName: 'Nombre', type: 'string' },
  { field: 'precio', headerName: 'Precio', type: 'decimal' },
  { field: 'stock', headerName: 'Stock', type: 'integer' },
  { field: 'estado', headerName: 'Estado', type: 'string' },
  { field: 'color', headerName: 'Color', type: 'string', form_type: 'color' },
  { field: 'activo', headerName: 'Activo', type: 'boolean' },
  { field: 'creado_en', headerName: 'Creado', type: 'date' },
]

/**
 * API simulada server-side (pagina, filtra y ordena localmente).
 */
export function crearApiClientes() {
  return {
    async list(params = {}) {
      await new Promise((r) => setTimeout(r, 300))
      let { page = 1, pageSize = 25, sortField = 'id', sortOrder = 'asc', search = '' } = params
      let rows = [...clientes]
      if (search) {
        const q = search.toLowerCase()
        rows = rows.filter((r) => String(r.nombre).toLowerCase().includes(q))
      }
      if (params.filters) {
        try {
          const filters = JSON.parse(params.filters)
          for (const [field, val] of Object.entries(filters)) {
            const q = val.toLowerCase()
            rows = rows.filter((r) => String(r[field]).toLowerCase().includes(q))
          }
        } catch { /* ignore */ }
      }
      const safeField = fields_def.some((c) => c.field === sortField) ? sortField : 'id'
      rows.sort((a, b) => {
        let va = a[safeField], vb = b[safeField]
        if (typeof va === 'string') va = va.toLowerCase()
        if (typeof vb === 'string') vb = vb.toLowerCase()
        return sortOrder === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
      })
      const total = rows.length
      const start = (Number(page) - 1) * Number(pageSize)
      return {
        status: true,
        data: {
          rows: rows.slice(start, start + Number(pageSize)),
          totalRecords: total,
          fields_def,
        },
      }
    },
    async create(data) {
      const nuevo = { id: clientes.length + 1, ...data }
      clientes.unshift(nuevo)
      return { status: true, data: nuevo }
    },
    async edit(data) {
      const idx = clientes.findIndex((c) => c.id === data.id)
      if (idx >= 0) clientes[idx] = { ...clientes[idx], ...data }
      return { status: true, data: clientes[idx] }
    },
    async delete(data) {
      const idx = clientes.findIndex((c) => c.id === data.id)
      if (idx >= 0) clientes.splice(idx, 1)
      return { status: true, data: { id: data.id } }
    },
  }
}

export const clientesData = clientes
export const clientesFields = fields_def
