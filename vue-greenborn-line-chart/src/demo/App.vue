<script setup>
import { ref } from 'vue'
import GbLineChart from '../components/GbLineChart.vue'

const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const series = ref([
  { name: 'Aperturas', color: '#0d6efd', values: [10, 25, 18, 40, 32, 55, 48] },
  { name: 'Clicks', color: '#dc3545', dashed: true, values: [4, 9, 7, 15, 12, 20, 18] },
])

function vaciar() {
  series.value = []
}

function restaurar() {
  series.value = [
    { name: 'Aperturas', color: '#0d6efd', values: [10, 25, 18, 40, 32, 55, 48] },
    { name: 'Clicks', color: '#dc3545', dashed: true, values: [4, 9, 7, 15, 12, 20, 18] },
  ]
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 640px; margin: 24px auto;">
    <h1 style="font-size: 1.1rem;">vue-greenborn-line-chart demo</h1>
    <GbLineChart :series="series" :labels="labels" :y-max="60" y-sufijo="" titulo="Demo" />
    <p>
      <button @click="vaciar">Vaciar datos</button>
      <button @click="restaurar">Restaurar datos</button>
    </p>
  </div>
</template>
