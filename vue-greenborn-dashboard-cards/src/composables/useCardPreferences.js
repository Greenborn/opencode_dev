import { reactive } from 'vue'

const DEFAULT_CLAVE = 'dashboard_cards'

/**
 * Persiste overrides por card ({ ancho, oculta, categoria }) usando el adaptador
 * genérico { cargar(clave), guardar(clave, valor) } recibido por el contexto.
 * Si no hay adaptador, funciona en memoria (sin persistencia) sin romper.
 */
export function useCardPreferences(preferenciasAdapter, clave = DEFAULT_CLAVE) {
  const overrides = reactive({})
  let cargado = false

  async function cargar() {
    if (!preferenciasAdapter || typeof preferenciasAdapter.cargar !== 'function') {
      cargado = true
      return
    }
    try {
      const valor = await preferenciasAdapter.cargar(clave)
      if (valor && typeof valor === 'object') {
        Object.assign(overrides, valor)
      }
    } catch (error) {
      console.warn('[vue-greenborn-dashboard-cards] Error cargando preferencias de cards:', error)
    } finally {
      cargado = true
    }
  }

  function guardar() {
    if (!preferenciasAdapter || typeof preferenciasAdapter.guardar !== 'function') return
    preferenciasAdapter.guardar(clave, { ...overrides }).catch((error) => {
      console.warn('[vue-greenborn-dashboard-cards] Error guardando preferencias de cards:', error)
    })
  }

  function setOverride(claveCard, patch) {
    overrides[claveCard] = { ...(overrides[claveCard] || {}), ...patch }
    guardar()
  }

  function getOverride(claveCard) {
    return overrides[claveCard] || {}
  }

  return { overrides, cargar, setOverride, getOverride, estaCargado: () => cargado }
}
