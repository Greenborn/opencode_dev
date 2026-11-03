// Paleta de colores de resaltado de las cards. La clave es lo que se guarda en la preferencia;
// `var` es la variable CSS que usa el borde y `hex` el color de respaldo (y del punto del menú).
// El consumidor puede reemplazarla con la prop `colores` de DashboardCardsGrid o con
// `contexto.colores`, manteniendo el mismo contrato.
export const COLORES_CARDS = [
  { clave: 'azul', nombre: 'Azul', var: '--gdc-color-azul', hex: '#3b82f6' },
  { clave: 'verde', nombre: 'Verde', var: '--gdc-color-verde', hex: '#22c55e' },
  { clave: 'amarillo', nombre: 'Amarillo', var: '--gdc-color-amarillo', hex: '#eab308' },
  { clave: 'naranja', nombre: 'Naranja', var: '--gdc-color-naranja', hex: '#f97316' },
  { clave: 'rojo', nombre: 'Rojo', var: '--gdc-color-rojo', hex: '#ef4444' },
  { clave: 'violeta', nombre: 'Violeta', var: '--gdc-color-violeta', hex: '#8b5cf6' },
  { clave: 'rosa', nombre: 'Rosa', var: '--gdc-color-rosa', hex: '#ec4899' },
  { clave: 'gris', nombre: 'Gris', var: '--gdc-color-gris', hex: '#64748b' },
]

export function colorDe(clave, colores = COLORES_CARDS) {
  return (colores || COLORES_CARDS).find((c) => c.clave === clave) ?? null
}
