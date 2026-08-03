/**
 * Set de iconos SVG autocontenido (sin bootstrap-icons).
 * Devuelve un <svg> con viewBox 0 0 24 24 (estilo línea) listo para insertar vía v-html.
 */

const paths = {
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pencil: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  'sort-asc': '<path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/>',
  'sort-desc': '<path d="M12 5v14"/><polyline points="19 12 12 19 5 12"/>',
  sort: '<path d="M7 8h10"/><path d="M7 12h6"/><path d="M7 16h3"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
}

/**
 * Devuelve el <svg> correspondiente al nombre de icono.
 * @param {string|null} name Nombre del icono (p. ej. 'plus', 'bi-plus-lg' o 'te-plus').
 * @returns {string} HTML del SVG o '' si no se conoce.
 */
export function iconSvg(name) {
  if (!name) return ''
  const key = normalizeIcon(name)
  const body = paths[key]
  if (!body) return ''
  return `<svg class="te-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

/**
 * Normaliza nombres legacy de bootstrap-icons y prefijos te-* a claves del set.
 */
function normalizeIcon(name) {
  let n = String(name).trim().toLowerCase()
  n = n.replace(/^bi\s+bi-/, '')
  n = n.replace(/^te-/, '')
  // aliases legacy bi-*
  const aliases = {
    'arrow-clockwise': 'refresh',
    'layout-three-columns': 'columns',
    'plus-lg': 'plus',
    'plus-circle': 'plus',
  }
  return aliases[n] || n
}

export const availableIcons = Object.keys(paths)
