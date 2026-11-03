import { reactive } from 'vue'

/**
 * Define de una card (todas las claves salvo `clave`, `titulo` y `componente` son opcionales):
 * {
 *   clave: string,            // id único
 *   titulo: string,
 *   categorias: string[],     // agrupación por pestaña/categoría
 *   anchoDefault: number,     // 1-4, span en el grid
 *   ordenDefault: number,
 *   permiso: string | null,   // resuelto con contexto.tienePermiso
 *   componente: () => Promise<Component> | Component,
 *   props: object,
 * }
 */
export function createCardRegistry(inicial = []) {
  const cards = reactive([...inicial])

  function registrar(def) {
    cards.push(def)
  }

  function listar() {
    return cards
  }

  return { cards, registrar, listar }
}
