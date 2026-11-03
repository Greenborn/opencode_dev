// Filtro de cards: el campo de la barra de pestañas. Filtra las cards de TODAS las pestañas por su
// título y subtítulo, y resalta lo que coincide.
//
// Cómo viaja: DashboardCardsGrid provee el texto del filtro (`CLAVE_FILTRO`); cada DashboardCard
// provee dónde se anotan sus textos (`CLAVE_TEXTOS_CARD`) y decide si se muestra; cada texto
// filtrable se dibuja con `TextoResaltado.vue`, que se anota solo. Una card de contenido no tiene
// que saber nada del filtro más allá de usar `TextoResaltado` en su subtítulo.

export const CLAVE_FILTRO = Symbol('gdc_filtro_cards')
export const CLAVE_TEXTOS_CARD = Symbol('gdc_textos_card')
export const CLAVE_COINCIDENCIAS = Symbol('gdc_coincidencias_cards')

export function normalizar(texto) {
  return Array.from(String(texto ?? ''), (c) => {
    const base = c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    return base.length === c.length ? base : c.toLowerCase().slice(0, c.length).padEnd(c.length, ' ')
  }).join('')
}

/** Si `texto` contiene `filtro`, sin mayúsculas ni tildes. Un filtro vacío coincide con todo. */
export function coincide(texto, filtro) {
  const f = normalizar(filtro).trim()
  if (!f) return true
  return normalizar(texto).includes(f)
}

/** `texto` partido en tramos `{ texto, marca }`, con `marca: true` en cada aparición de `filtro`. */
export function partes(texto, filtro) {
  const original = String(texto ?? '')
  const f = normalizar(filtro).trim()
  if (!f) return [{ texto: original, marca: false }]
  const comparable = normalizar(original)
  const salida = []
  let desde = 0
  for (let i = comparable.indexOf(f); i !== -1; i = comparable.indexOf(f, i + f.length)) {
    if (i > desde) salida.push({ texto: original.slice(desde, i), marca: false })
    salida.push({ texto: original.slice(i, i + f.length), marca: true })
    desde = i + f.length
  }
  if (desde < original.length) salida.push({ texto: original.slice(desde), marca: false })
  return salida
}
