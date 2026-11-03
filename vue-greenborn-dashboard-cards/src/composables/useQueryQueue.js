import { inject, onBeforeUnmount } from 'vue'

// Cola de consultas del dashboard. Una card que se monta sin datos no consulta en el acto: se
// encola, y la cola las corre **de a una**, esperando que termine cada consulta antes de lanzar la
// siguiente. Con "Todas" mostrando todas las cards, un usuario sin caché dispararía muchas
// consultas juntas. El orden es el de la grilla: en cada turno corre la pendiente cuya card está
// primero en la página (`DashboardCard` provee su elemento). "Actualizar todas" pasa por la misma
// cola, así que nunca hay dos consultas del dashboard en vuelo a la vez. El botón de refrescar de
// cada card NO pasa por acá: es un pedido explícito y sale en el acto.

export const CLAVE_ELEMENTO_CARD = Symbol('gdc_elemento_card')

const pendientes = []
let corriendo = false

function porPosicion(a, b) {
  const ea = a.elemento?.()
  const eb = b.elemento?.()
  if (!ea || !eb || ea === eb) return 0
  return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

async function correr() {
  if (corriendo) return
  corriendo = true
  while (pendientes.length) {
    pendientes.sort(porPosicion)
    const turno = pendientes.shift()
    if (turno.vigente()) {
      try {
        await turno.consulta()
      } catch (e) {
        console.error('[vue-greenborn-dashboard-cards] la consulta falló', e)
      }
    }
    turno.listo()
  }
  corriendo = false
}

/**
 * Encola `consulta` (una función que devuelve una promesa) y devuelve una promesa que termina
 * cuando se corrió, o cuando se saltó. `vigente` se pregunta justo antes de correrla: una card que
 * se desmontó mientras esperaba no consulta. `elemento` devuelve el elemento de la card, para el
 * orden. Un error de una consulta no frena a las que vienen detrás.
 */
export function encolar(consulta, { vigente = () => true, elemento = null } = {}) {
  return new Promise((listo) => {
    pendientes.push({ consulta, vigente, elemento, listo })
    void correr()
  })
}

/** Para usar en el `setup` de una card: encola atado a su posición en la grilla y a que siga montada. */
export function usarCola() {
  const elemento = inject(CLAVE_ELEMENTO_CARD, null)
  let montada = true
  onBeforeUnmount(() => { montada = false })
  return (consulta) => encolar(consulta, { vigente: () => montada, elemento })
}

export const enqueue = encolar
export const useQueryQueue = usarCola
