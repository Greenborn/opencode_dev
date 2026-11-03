<template>
  <svg
    :width="ancho"
    :height="alto"
    :viewBox="`0 0 ${ancho} ${alto}`"
    role="img"
    :aria-label="etiqueta"
    class="gdc-sparkline"
  >
    <title>{{ etiqueta }}</title>
    <path v-if="relleno && areaPath" :d="areaPath" class="gdc-sparkline__area" :fill="color" />
    <path :d="linePath" class="gdc-sparkline__line" :stroke="color" fill="none" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  valores: { type: Array, default: () => [] },
  min: { type: Number, default: 0 },
  max: { type: Number, default: null },
  color: { type: String, default: '#0d6efd' },
  alto: { type: Number, default: 40 },
  ancho: { type: Number, default: 120 },
  relleno: { type: Boolean, default: true },
  etiqueta: { type: String, default: 'Tendencia' },
})

const puntos = computed(() => {
  const serie = props.valores
  if (!serie.length) return []

  const maximo = props.max !== null ? props.max : Math.max(...serie, props.min)
  const rango = Math.max(maximo - props.min, 1e-6)
  const pasoX = serie.length > 1 ? props.ancho / (serie.length - 1) : props.ancho

  return serie.map((valor, i) => {
    const x = serie.length > 1 ? i * pasoX : 0
    const normalizado = Math.min(Math.max((valor - props.min) / rango, 0), 1)
    const y = props.alto - normalizado * props.alto
    return [x, y]
  })
})

const linePath = computed(() => {
  if (!puntos.value.length) return ''
  return puntos.value
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')
})

const areaPath = computed(() => {
  if (!puntos.value.length) return ''
  const ultimo = puntos.value[puntos.value.length - 1]
  const primero = puntos.value[0]
  return `${linePath.value} L${ultimo[0].toFixed(2)},${props.alto} L${primero[0].toFixed(2)},${props.alto} Z`
})
</script>

<style scoped>
.gdc-sparkline__area {
  opacity: 0.15;
}
.gdc-sparkline__line {
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
</style>
