<template>
  <div class="vgms-picker">
    <div class="vgms-coords mb-2 small text-muted">
      <i class="bi bi-geo" />
      Latitud: {{ selectedLatDisplay }} | Longitud: {{ selectedLngDisplay }}
    </div>
    <div
      v-if="leafletError"
      class="alert alert-danger py-2"
    >
      {{ leafletError }}
    </div>
    <div
      v-else
      ref="mapEl"
      class="vgms-map"
    />
    <div class="d-flex justify-content-end gap-2 mt-3">
      <button
        type="button"
        class="btn btn-secondary"
        @click="closeModal"
      >
        Cerrar
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        @click="clearMarker"
      >
        Limpiar
      </button>
      <button
        type="button"
        class="btn btn-success"
        :disabled="!hasMarker"
        @click="confirmSelection"
      >
        Usar ubicación
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useModal } from 'vue-greenborn-modal-manager'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  parametros: {
    type: Object,
    required: true
  }
})

const { ocultar_modal } = useModal()

const mapEl = ref(null)
let map = null
const markerRef = ref(null)
const selectedLat = ref(null)
const selectedLng = ref(null)
const leafletError = ref('')

const hasMarker = computed(() => !!markerRef.value)

const selectedLatDisplay = computed(() => {
  if (selectedLat.value === null) return '-'
  return Number(selectedLat.value).toFixed(6)
})

const selectedLngDisplay = computed(() => {
  if (selectedLng.value === null) return '-'
  return Number(selectedLng.value).toFixed(6)
})

// Fix de iconos de Leaflet para bundlers (Vite) - usa assets del paquete
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString()
})

const attachMarker = (lat, lng) => {
  markerRef.value.on('dragend', () => {
    const { lat: dlat, lng: dlng } = markerRef.value.getLatLng()
    selectedLat.value = dlat
    selectedLng.value = dlng
  })
  selectedLat.value = lat
  selectedLng.value = lng
}

const initMap = () => {
  if (!L) {
    leafletError.value = 'Leaflet no está disponible.'
    return
  }
  if (!mapEl.value) return

  const defaultCenter = [-34.603722, -58.381592] // Buenos Aires como centro por defecto
  const parseNum = (val) => {
    if (val === null || val === undefined) return null
    if (typeof val === 'string' && val.trim() === '') return null
    const num = Number(val)
    return Number.isFinite(num) ? num : null
  }
  const startLat = parseNum(props.parametros.initialLat)
  const startLng = parseNum(props.parametros.initialLng)
  const hasInitial = startLat !== null && startLng !== null

  map = L.map(mapEl.value)
  const center = hasInitial ? [startLat, startLng] : defaultCenter
  map.setView(center, hasInitial ? 15 : 12)
  L.tileLayer(props.parametros.tileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  if (hasInitial) {
    markerRef.value = L.marker([startLat, startLng], { draggable: true }).addTo(map)
    attachMarker(startLat, startLng)
  }

  map.on('click', (e) => {
    const { lat, lng } = e.latlng
    if (!markerRef.value) {
      markerRef.value = L.marker([lat, lng], { draggable: true }).addTo(map)
      attachMarker(lat, lng)
    } else {
      markerRef.value.setLatLng([lat, lng])
      selectedLat.value = lat
      selectedLng.value = lng
    }
  })
}

const destroyMap = () => {
  if (map) {
    map.remove()
    map = null
  }
  markerRef.value = null
  selectedLat.value = null
  selectedLng.value = null
}

const closeModal = () => {
  ocultar_modal(props.parametros._modal_cod)
}

const confirmSelection = () => {
  if (!markerRef.value || selectedLat.value === null || selectedLng.value === null) return
  if (props.parametros.onSelect) {
    props.parametros.onSelect({ lat: String(selectedLat.value), lng: String(selectedLng.value) })
  }
  closeModal()
}

const clearMarker = () => {
  if (!markerRef.value) return
  markerRef.value.remove()
  markerRef.value = null
  selectedLat.value = null
  selectedLng.value = null
}

onMounted(async () => {
  leafletError.value = ''
  await nextTick()
  // Pequeño delay para esperar la transición de apertura del modal
  setTimeout(() => {
    initMap()
    if (map) map.invalidateSize()
  }, 150)
})

onUnmounted(() => {
  destroyMap()
})
</script>

<style scoped>
.vgms-map {
  width: 100%;
  height: 60vh;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}
</style>
