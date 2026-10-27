<template>
  <div class="vgmv-viewer">
    <div v-if="error" class="alert alert-danger mb-2">
      {{ error }}
    </div>
    <div v-if="!error && puntos.length === 0 && !cargando" class="alert alert-secondary mb-2">
      {{ mensajeSinPuntos || 'No hay puntos para mostrar en el mapa.' }}
    </div>
    <div v-if="cargando" class="alert alert-info mb-2">
      {{ mensajeCargando || 'Cargando mapa…' }}
    </div>
    <div
      ref="mapaEl"
      class="vgmv-map"
      role="region"
      :aria-label="labelAccesibilidad"
    />
    <p v-if="!error && mostrarResumen" class="vgmv-resumen small text-muted mt-2 mb-0">
      {{ cargando ? (mensajeCargando || 'Cargando…') : `${puntos.length} ${puntos.length === 1 ? 'punto' : 'puntos'} en el mapa.` }}
    </p>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { markRaw } from 'vue'

export default {
  name: 'MapViewerComponent',
  props: {
    puntos: {
      type: Array,
      default: () => []
    },
    centro: {
      type: Array,
      default: () => [-37.3186, -59.1341] // Tandil, Buenos Aires por defecto
    },
    zoom: {
      type: Number,
      default: 13
    },
    altura: {
      type: String,
      default: '420px'
    },
    tileUrl: {
      type: String,
      default: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    colorPunto: {
      type: String,
      default: '#0d6efd'
    },
    radioPunto: {
      type: Number,
      default: 8
    },
    mostrarResumen: {
      type: Boolean,
      default: true
    },
    cargando: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    labelAccesibilidad: {
      type: String,
      default: 'Mapa interactivo con múltiples puntos'
    },
    mensajeCargando: {
      type: String,
      default: ''
    },
    mensajeSinPuntos: {
      type: String,
      default: ''
    }
  },
  emits: ['punto-click', 'mapa-listo'],
  data() {
    return {
      mapa: null,
      capaPuntos: null,
      marcadores: new Map()
    }
  },
  watch: {
    puntos: {
      deep: true,
      handler() {
        this.dibujarPuntos()
      }
    },
    altura(newVal) {
      if (this.mapa) {
        this.$nextTick(() => {
          this.mapa.invalidateSize()
        })
      }
    }
  },
  mounted() {
    this.iniciarMapa()
    this.$emit('mapa-listo')
  },
  beforeUnmount() {
    if (this.mapa) {
      this.mapa.remove()
      this.mapa = null
    }
  },
  methods: {
    iniciarMapa() {
      if (!this.$refs.mapaEl) return

      // markRaw: Leaflet maneja su propio estado, no debe pasar por el proxy reactivo de Vue
      this.mapa = markRaw(L.map(this.$refs.mapaEl, { scrollWheelZoom: false }).setView(this.centro, this.zoom))

      L.tileLayer(this.tileUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(this.mapa)

      this.capaPuntos = markRaw(L.layerGroup().addTo(this.mapa))

      // Fix de iconos de Leaflet para bundlers
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString()
      })

      this.dibujarPuntos()
    },
    dibujarPuntos() {
      if (!this.mapa || !this.capaPuntos) return

      this.capaPuntos.clearLayers()
      this.marcadores.clear()
      const coordenadas = []

      for (const punto of this.puntos) {
        if (punto.lat === null || punto.lat === undefined || punto.lng === null || punto.lng === undefined) {
          continue
        }

        const coord = [punto.lat, punto.lng]
        coordenadas.push(coord)

        const circulo = L.circleMarker(coord, {
          radius: this.radioPunto,
          color: '#fff',
          weight: 2,
          fillColor: this.colorPunto,
          fillOpacity: 0.9
        })

        if (punto.popup) {
          circulo.bindPopup(this.crearPopup(punto))
        }

        circulo.on('click', () => {
          this.$emit('punto-click', punto)
        })

        circulo.addTo(this.capaPuntos)
        this.marcadores.set(punto.id, circulo)
      }

      // Ajustar vista a los puntos
      if (coordenadas.length > 0) {
        this.mapa.fitBounds(coordenadas, { padding: [30, 30], maxZoom: 14 })
      } else {
        this.mapa.setView(this.centro, this.zoom)
      }
    },
    crearPopup(punto) {
      const cont = document.createElement('div')

      if (punto.nombre) {
        const titulo = document.createElement('strong')
        titulo.textContent = punto.nombre
        cont.appendChild(titulo)
      }

      if (punto.subtitulo) {
        const subtitulo = document.createElement('div')
        subtitulo.className = 'small'
        subtitulo.textContent = punto.subtitulo
        cont.appendChild(subtitulo)
      }

      if (punto.descripcion) {
        const desc = document.createElement('div')
        desc.className = 'small text-muted'
        desc.textContent = punto.descripcion
        cont.appendChild(desc)
      }

      return cont
    },
    resaltarPunto(puntoId) {
      const marcador = this.marcadores.get(puntoId)
      if (marcador) {
        marcador.openPopup()
      }
    },
    quitarResaltePunto(puntoId) {
      const marcador = this.marcadores.get(puntoId)
      if (marcador) {
        marcador.closePopup()
      }
    }
  }
}
</script>

<style scoped>
.vgmv-viewer {
  width: 100%;
}

.vgmv-map {
  width: 100%;
  border-radius: 0.375rem;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.vgmv-resumen {
  display: block;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .vgmv-map {
    min-height: 300px;
  }
}

@media (min-width: 769px) {
  .vgmv-map {
    min-height: 420px;
  }
}
</style>
