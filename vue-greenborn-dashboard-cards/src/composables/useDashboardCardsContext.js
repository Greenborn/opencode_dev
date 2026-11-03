import { provide, inject } from 'vue'

export const DASHBOARD_CARDS_CONTEXT_KEY = Symbol('dashboard-cards-context')

/**
 * Contrato del contexto esperado (todas las claves son opcionales salvo donde se indique):
 * - socket: { emit, on, off, once } — compatible con cualquier cliente socket.io-like.
 * - tienePermiso(permiso: string): boolean
 * - preferencias: { cargar(clave): Promise<any>, guardar(clave, valor): Promise<void> }
 * - abrirModal(componente, titulo, props, opciones): { code, cerrar? } | null — si no se provee,
 *   el paquete usa un diálogo interno mínimo para el alta/renombrado de pestañas y cards ocultas.
 * - confirmar({ title, text, onConfirm, confirmLabel?, cancelLabel? }) — si no se provee, usa
 *   window.confirm.
 * - mostrarAlerta(texto) — si no se provee, escribe un warning en consola.
 * - colores: array de { clave, nombre, var, hex } — reemplaza la paleta por defecto.
 *
 * El paquete nunca importa una librería de UI, Pinia, SSO ni un gestor de modales: todo pasa por
 * este contrato.
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
