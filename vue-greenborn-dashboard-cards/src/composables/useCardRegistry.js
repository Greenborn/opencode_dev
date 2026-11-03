import { reactive } from 'vue'

/**
 * Define una card. Obligatorias: `clave`, `titulo` y `componente`. El resto son opcionales:
 * {
 *   clave: string,                 // id único
 *   titulo: string,
 *   categorias: string[],          // pestañas iniciales (se copian una sola vez por usuario)
 *   pestanaDefault: string,        // pestaña inicial principal (alternativa a categorias)
 *   tipo: 'NUMERO' | 'GRAFICO',    // los números se ordenan antes que los gráficos
 *   anchoDefault: number,          // 1-4, span en el grid
 *   ordenDefault: number,
 *   permiso: string | null,        // resuelto con contexto.tienePermiso
 *   subtitulo: string,             // texto filtrable (usar TextoResaltado dentro de la card)
 *   menuItems: Array | Function,   // ítems extra del menú contextual de la card
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
