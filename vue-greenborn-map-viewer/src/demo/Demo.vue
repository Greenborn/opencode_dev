<template>
  <div class="container mt-4">
    <h1>MapViewerComponent Demo</h1>
    <div class="row">
      <div class="col-md-8">
        <MapViewerComponent
          :puntos="puntosDemo"
          :centro="[-37.3186, -59.1341]"
          :zoom="13"
          altura="500px"
          @punto-click="manejarClick"
        />
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Información</h5>
            <p class="small text-muted">Haz clic en un punto para ver sus detalles.</p>
            <hr />
            <div v-if="puntoSeleccionado" class="bg-light p-2 rounded">
              <p><strong>{{ puntoSeleccionado.nombre }}</strong></p>
              <p class="small text-muted mb-0">{{ puntoSeleccionado.descripcion }}</p>
            </div>
            <div v-else class="text-muted small">
              Ningún punto seleccionado
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MapViewerComponent from '../components/MapViewerComponent.vue'

export default {
  name: 'Demo',
  components: { MapViewerComponent },
  data() {
    return {
      puntosDemo: [
        {
          id: 1,
          lat: -37.3186,
          lng: -59.1341,
          nombre: 'Tandil, Buenos Aires',
          descripcion: 'Ciudad ubicada en la provincia de Buenos Aires, Argentina.',
          popup: true
        },
        {
          id: 2,
          lat: -37.2500,
          lng: -59.1200,
          nombre: 'Punto de Interés 1',
          descripcion: 'Ubicación de ejemplo cercana.',
          popup: true
        },
        {
          id: 3,
          lat: -37.4000,
          lng: -59.1500,
          nombre: 'Punto de Interés 2',
          descripcion: 'Otra ubicación de ejemplo.',
          popup: true
        }
      ],
      puntoSeleccionado: null
    }
  },
  methods: {
    manejarClick(punto) {
      this.puntoSeleccionado = punto
    }
  }
}
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>
