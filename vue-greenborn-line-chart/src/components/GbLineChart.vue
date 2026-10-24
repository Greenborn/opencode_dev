<template>
  <div class="gb-line-chart">
    <div v-if="hayDatos" class="gb-line-chart__leyenda">
      <div v-for="serie in series" :key="serie.name" class="gb-line-chart__leyenda-item">
        <span class="gb-line-chart__leyenda-color" :style="{ background: serie.color || '#0d6efd' }"></span>
        <span>{{ serie.name }}</span>
      </div>
    </div>

    <div v-if="!hayDatos" class="gb-line-chart__vacio">
      <svg class="gb-line-chart__vacio-icono" viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true">
        <path d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z" />
      </svg>
      Sin registros para graficar en esta página.
    </div>

    <svg
      v-else
      :viewBox="`0 0 ${ANCHO} ${ALTO}`"
      class="gb-line-chart__svg"
      role="img"
      :aria-label="titulo || 'Gráfico de líneas'"
      preserveAspectRatio="xMidYMid meet"
    >
      <g>
        <line
          v-for="tick in ticksY"
          :key="`grid-${tick}`"
          :x1="PAD_IZQ"
          :x2="ANCHO - PAD_DER"
          :y1="y(tick)"
          :y2="y(tick)"
          class="gb-line-chart__grid"
        />
        <text
          v-for="tick in ticksY"
          :key="`label-y-${tick}`"
          :x="PAD_IZQ - 8"
          :y="y(tick) + 3"
          text-anchor="end"
          class="gb-line-chart__eje-texto"
        >
          {{ tick }}{{ ySufijo }}
        </text>
      </g>

      <g v-for="(serie, si) in series" :key="`serie-${si}`">
        <polyline
          :points="puntos(serie.values)"
          fill="none"
          :stroke="serie.color || '#0d6efd'"
          :stroke-width="serie.dashed ? 1.5 : 2"
          :stroke-dasharray="serie.dashed ? '5 4' : null"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <g v-for="(valor, i) in serie.values" :key="`punto-${si}-${i}`">
          <circle
            v-if="serie.values.length <= 80"
            :cx="x(i, serie.values.length)"
            :cy="y(valor)"
            r="2.5"
            :fill="serie.color || '#0d6efd'"
          >
            <title>{{ labels[i] }}: {{ valor }}{{ ySufijo }}</title>
          </circle>
        </g>
      </g>

      <g>
        <text
          v-for="marca in marcasX"
          :key="`label-x-${marca.indice}`"
          :x="marca.x"
          :y="ALTO - 10"
          :text-anchor="marca.ancla"
          class="gb-line-chart__eje-texto"
        >
          {{ marca.texto }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const ANCHO = 800
const ALTO = 260
const PAD_IZQ = 46
const PAD_DER = 14
const PAD_SUP = 14
const PAD_INF = 32

const props = defineProps({
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  yMax: { type: Number, default: 100 },
  ySufijo: { type: String, default: '%' },
  titulo: { type: String, default: '' },
})

const hayDatos = computed(() =>
  props.series.some((serie) => Array.isArray(serie.values) && serie.values.length > 0)
)

const ticksY = computed(() => [0, 25, 50, 75, 100].filter((t) => t <= props.yMax))

function x(indice, total) {
  if (total <= 1) return (PAD_IZQ + ANCHO - PAD_DER) / 2
  return PAD_IZQ + (indice / (total - 1)) * (ANCHO - PAD_IZQ - PAD_DER)
}

function y(valor) {
  const proporcion = Math.max(0, Math.min(1, valor / props.yMax))
  return PAD_SUP + (1 - proporcion) * (ALTO - PAD_SUP - PAD_INF)
}

function puntos(values) {
  const total = values.length
  return values.map((valor, i) => `${x(i, total)},${y(valor)}`).join(' ')
}

const marcasX = computed(() => {
  const total = props.labels.length
  if (!total) return []
  const cantidad = Math.min(6, total)
  const indices = new Set()
  if (cantidad === 1) {
    indices.add(0)
  } else {
    for (let i = 0; i < cantidad; i += 1) {
      indices.add(Math.round((i * (total - 1)) / (cantidad - 1)))
    }
  }
  const ordenados = [...indices].sort((a, b) => a - b)
  return ordenados.map((indice, pos) => {
    let ancla = 'middle'
    if (pos === 0 && ordenados.length > 1) ancla = 'start'
    if (pos === ordenados.length - 1 && ordenados.length > 1) ancla = 'end'
    return { indice, texto: props.labels[indice], ancla, x: x(indice, total) }
  })
})
</script>

<style scoped>
.gb-line-chart {
  width: 100%;
}
.gb-line-chart__leyenda {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.gb-line-chart__leyenda-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}
.gb-line-chart__leyenda-color {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.gb-line-chart__vacio {
  text-align: center;
  color: var(--gb-line-chart-muted-color, #6c757d);
  padding: 3rem 0;
}
.gb-line-chart__vacio-icono {
  margin-right: 0.25rem;
}
.gb-line-chart__svg {
  display: block;
  width: 100%;
  overflow: visible;
}
.gb-line-chart__grid {
  stroke: var(--gb-line-chart-border-color, #dee2e6);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}
.gb-line-chart__eje-texto {
  fill: var(--gb-line-chart-muted-color, #6c757d);
  font-size: 11px;
  font-family: system-ui, sans-serif;
}
</style>
