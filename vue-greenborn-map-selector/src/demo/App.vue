<template>
  <div class="demo">
    <h1>vue-greenborn-map-selector</h1>
    <p>Selector de ubicación en mapa (Leaflet) sobre un modal de vue-greenborn-modal-manager.</p>

    <div class="row">
      <button class="btn btn-primary" @click="abrirMapa">
        Abrir selector de ubicación
      </button>
      <button class="btn btn-secondary" @click="abrirMapaInicial">
        Abrir con coordenadas iniciales
      </button>
    </div>

    <p v-if="seleccion">
      Seleccionado: lat={{ seleccion.lat }}, lng={{ seleccion.lng }}
    </p>

    <ModalContainer />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ModalContainer } from 'vue-greenborn-modal-manager'
import { useMapSelector } from '../index.js'

const { abrir } = useMapSelector()

const seleccion = ref(null)

const abrirMapa = () => {
  abrir({
    onSelect: ({ lat, lng }) => {
      seleccion.value = { lat, lng }
    }
  })
}

const abrirMapaInicial = () => {
  abrir({
    initialLat: -34.603722,
    initialLng: -58.381592,
    onSelect: ({ lat, lng }) => {
      seleccion.value = { lat, lng }
    }
  })
}
</script>

<style>
.demo {
  font-family: system-ui, sans-serif;
  max-width: 900px;
  margin: 2rem auto;
}

.row {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}
</style>
