import { provide, inject } from 'vue'

export const DASHBOARD_CARDS_CONTEXT_KEY = Symbol('dashboard-cards-context')

/**
 * Contrato del contexto esperado (todas las claves son opcionales salvo donde se indique):
 * - socket: { emit, on, off, once } — compatible con cualquier cliente socket.io-like.
 * - tienePermiso(permiso: string): boolean
 * - preferencias: { cargar(clave): Promise<any>, guardar(clave, valor): Promise<void> }
 * - abrirModal(componente, titulo, props, opciones): { code } | null — si no se provee,
 *   las cards deben ocultar cualquier acción que dependa de abrir un modal.
 */
export function provideDashboardCardsContext(contexto) {
  provide(DASHBOARD_CARDS_CONTEXT_KEY, contexto || {})
}

export function useDashboardCardsContext() {
  const ctx = inject(DASHBOARD_CARDS_CONTEXT_KEY, null)
  if (!ctx) {
    console.warn(
      '[vue-greenborn-dashboard-cards] No se encontró contexto. Usar provideDashboardCardsContext() o la prop "contexto" de DashboardCardsGrid.'
    )
  }
  return ctx || {}
}
