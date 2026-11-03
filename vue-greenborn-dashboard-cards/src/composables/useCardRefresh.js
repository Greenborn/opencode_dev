import { inject, onBeforeUnmount } from 'vue'

// "Actualizar todas" de la pestaña: cada card le registra a su `DashboardCard` cómo se refresca, y
// el dashboard las recorre una por una. `DashboardCard` hace el `provide`; la card de contenido —o
// el composable que usa— llama a `usarRefresco()` con una función que consulta y devuelve una
// promesa que termina cuando terminó la consulta. Una card que no lo llama no se actualiza con las
// demás: queda como está.
export const CLAVE_REFRESCO = Symbol('gdc_refresco_card')

export function usarRefresco(refrescar) {
  const registrar = inject(CLAVE_REFRESCO, null)
  if (!registrar) return
  registrar(refrescar)
  onBeforeUnmount(() => registrar(null))
}

export const registerRefresh = usarRefresco
