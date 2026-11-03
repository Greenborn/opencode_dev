<template>
  <div class="gdc-grid-wrapper">
    <ul v-if="categorias.length > 1" class="nav nav-tabs gdc-tabs">
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: pestanaActiva === TODAS }"
          @click="pestanaActiva = TODAS"
        >
          Todas
        </button>
      </li>
      <li v-for="cat in categorias" :key="cat" class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: pestanaActiva === cat }"
          @click="pestanaActiva = cat"
        >
          {{ cat }}
        </button>
      </li>
    </ul>

    <div class="gdc-grid">
      <DashboardCard
        v-for="def in cardsVisibles"
        :key="def.clave"
        :titulo="def.titulo"
        :ancho="anchoDe(def)"
        @cambiar-ancho="(valor) => preferencias.setOverride(def.clave, { ancho: valor })"
        @ocultar="preferencias.setOverride(def.clave, { oculta: true })"
      >
        <component :is="componenteResuelto(def)" v-bind="def.props || {}" />
      </DashboardCard>
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, onMounted } from 'vue'
import DashboardCard from './DashboardCard.vue'
import { provideDashboardCardsContext } from '../composables/useDashboardCardsContext.js'
import { useCardPreferences } from '../composables/useCardPreferences.js'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  contexto: { type: Object, default: () => ({}) },
  preferenciasClave: { type: String, default: 'dashboard_cards' },
})

provideDashboardCardsContext(props.contexto)

const TODAS = Symbol('todas')
const pestanaActiva = ref(TODAS)

const preferencias = useCardPreferences(props.contexto.preferencias, props.preferenciasClave)
onMounted(() => {
  preferencias.cargar()
})

const categorias = computed(() => {
  const set = new Set()
  for (const def of props.cards) {
    for (const cat of def.categorias || []) set.add(cat)
  }
  return [...set]
})

const cardsVisibles = computed(() => {
  return props.cards
    .filter((def) => {
      if (def.permiso && typeof props.contexto.tienePermiso === 'function') {
        if (!props.contexto.tienePermiso(def.permiso)) return false
      }
      if (preferencias.getOverride(def.clave).oculta) return false
      if (pestanaActiva.value === TODAS) return true
      return (def.categorias || []).includes(pestanaActiva.value)
    })
    .sort((a, b) => (a.ordenDefault ?? 0) - (b.ordenDefault ?? 0))
})

function anchoDe(def) {
  return preferencias.getOverride(def.clave).ancho ?? def.anchoDefault ?? 1
}

const cache = new Map()
function componenteResuelto(def) {
  if (!cache.has(def.clave)) {
    const comp = typeof def.componente === 'function' && def.componente.length === 0
      ? defineAsyncComponent(def.componente)
      : def.componente
    cache.set(def.clave, comp)
  }
  return cache.get(def.clave)
}
</script>

<style scoped>
.gdc-tabs {
  margin-bottom: 1rem;
}
.gdc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.gdc-grid :deep(.gdc-card--ancho-1) {
  grid-column: span 1;
}
.gdc-grid :deep(.gdc-card--ancho-2) {
  grid-column: span 2;
}
.gdc-grid :deep(.gdc-card--ancho-3) {
  grid-column: span 3;
}
.gdc-grid :deep(.gdc-card--ancho-4) {
  grid-column: span 4;
}
@media (max-width: 992px) {
  .gdc-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .gdc-grid :deep(.gdc-card--ancho-3),
  .gdc-grid :deep(.gdc-card--ancho-4) {
    grid-column: span 2;
  }
}
@media (max-width: 576px) {
  .gdc-grid {
    grid-template-columns: 1fr;
  }
  .gdc-grid :deep([class*='gdc-card--ancho-']) {
    grid-column: span 1;
  }
}
</style>
