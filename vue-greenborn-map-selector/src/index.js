import MapSelectorModal from './components/MapSelectorModal.vue'
import { useModal } from 'vue-greenborn-modal-manager'

export { MapSelectorModal }

/**
 * Composable para abrir el selector de ubicación en mapa como modal del
 * gestor genérico (vue-greenborn-modal-manager), apilándose correctamente
 * sobre cualquier otro modal abierto.
 *
 * @returns {{ abrir: Function, cerrar: Function }}
 *
 * abrir({ initialLat, initialLng, onSelect, titulo, size, config })
 *  - initialLat/initialLng: coordenadas iniciales (String o Number, opcionales)
 *  - onSelect: callback ({ lat: String, lng: String }) al confirmar
 *  - titulo: título del modal (default 'Seleccionar ubicación')
 *  - size: 'sm' | 'md' | 'lg' | 'full' (default 'lg')
 *  - config: config extra del modal manager (draggable, minimizable, etc.)
 */
export function useMapSelector() {
  const { mostrar_modal, ocultar_modal } = useModal()

  const abrir = ({
    initialLat = null,
    initialLng = null,
    onSelect = null,
    titulo = 'Seleccionar ubicación',
    size = 'lg',
    tileUrl = null,
    config = {}
  } = {}) => {
    const { code } = mostrar_modal(MapSelectorModal, titulo, {
      initialLat,
      initialLng,
      onSelect,
      tileUrl
    }, {
      draggable: true,
      minimizable: false,
      size,
      ...config
    })
    return {
      code,
      cerrar: () => ocultar_modal(code)
    }
  }

  const cerrar = (code) => ocultar_modal(code)

  return { abrir, cerrar }
}
