import MapViewerComponent from './components/MapViewerComponent.vue'

export { MapViewerComponent }

/**
 * Composable para usar el visor de mapa con múltiples puntos
 *
 * @returns {{ MapViewerComponent }}
 *
 * Uso:
 * <MapViewerComponent
 *   :puntos="[{ id: 1, lat: -37.3186, lng: -59.1341, nombre: 'Punto 1' }]"
 *   :centro="[-37.3186, -59.1341]"
 *   :zoom="13"
 *   @punto-click="manejarClick"
 * />
 */
export function useMapViewer() {
  return { MapViewerComponent }
}
