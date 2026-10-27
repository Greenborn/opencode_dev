import { ref, computed, toValue } from 'vue'

// Ancho de la ventana compartido por todas las instancias del menú:
// un único listener de resize para toda la aplicación.
const anchoVentana = ref(typeof window !== 'undefined' ? window.innerWidth : 0)
let escuchando = false

function escucharResize() {
  if (escuchando || typeof window === 'undefined') return
  escuchando = true
  window.addEventListener('resize', () => {
    anchoVentana.value = window.innerWidth
  })
}

/**
 * Computed reactivo: true cuando el ancho de la ventana es menor al breakpoint.
 * `breakpoint` puede ser un número o un getter (p. ej. `() => props.breakpoint`).
 */
export function useEsMovil(breakpoint) {
  escucharResize()
  return computed(() => anchoVentana.value < toValue(breakpoint))
}

/**
 * Filtra los items por permiso (si hay función `hasPermission`) y elimina los
 * separadores sobrantes: al inicio, al final o repetidos.
 */
export function filtrarItems(items, hasPermission) {
  const visibles = items.filter(
    (item) => item.divider || !item.permiso || !hasPermission || hasPermission(item.permiso)
  )
  return visibles.filter((item, i) => {
    if (!item.divider) return true
    const anterior = visibles[i - 1]
    return i > 0 && i < visibles.length - 1 && !anterior.divider
  })
}
