<template>
  <div class="gdc-tabs-bar">
    <div
      class="gdc-tabs-scroll"
      role="tablist"
      aria-label="Pestañas del dashboard"
      @pointerdown="empezarArrastre"
      @pointermove="moverArrastre"
      @pointerup="terminarArrastre"
      @pointercancel="terminarArrastre"
    >
      <div
        v-for="(p, idx) in lista"
        :key="p.id"
        role="tab"
        tabindex="0"
        class="gdc-tab"
        :class="{ 'is-activa': p.id === activa, 'is-arrastrada': p.id === arrastrando }"
        :data-tab="p.id"
        :aria-selected="p.id === activa"
        @click="emit('activar', p.id)"
        @keydown.enter.prevent="emit('activar', p.id)"
        @keydown.space.prevent="emit('activar', p.id)"
      >
        <span class="gdc-tab__handle" aria-hidden="true">⠿</span>
        <span class="gdc-tab__name">{{ p.nombre }}</span>
        <button
          type="button"
          class="gdc-tab__menu"
          :aria-label="`Opciones de la pestaña ${p.nombre}`"
          title="Opciones"
          @pointerdown.stop
          @click.stop="abrirMenu($event, p, idx)"
        >⋯</button>
      </div>
    </div>

    <button type="button" class="gdc-tabs__add" aria-label="Agregar pestaña" title="Agregar pestaña" @click="emit('agregar')">+</button>

    <div class="gdc-tabs__filter">
      <span class="gdc-tabs__filter-icon" aria-hidden="true">⌕</span>
      <input
        :value="filtro"
        type="search"
        class="gdc-tabs__filter-input"
        placeholder="Filtrar cards"
        aria-label="Filtrar cards de todas las pestañas por título y subtítulo"
        @input="emit('update:filtro', $event.target.value)"
        @keydown.esc="emit('update:filtro', '')"
      />
      <button
        v-if="filtro"
        type="button"
        class="gdc-tabs__filter-clear"
        aria-label="Limpiar filtro"
        title="Limpiar filtro"
        @click="emit('update:filtro', '')"
      >×</button>
    </div>

    <ContextMenu ref="menu" :items="opciones" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ContextMenu from './ContextMenu.vue'

const props = defineProps({
  pestanas: { type: Array, required: true },
  activa: { type: String, required: true },
  actualizando: { type: Boolean, default: false },
  filtro: { type: String, default: '' },
})

const emit = defineEmits([
  'update:filtro', 'actualizar', 'activar', 'agregar', 'renombrar', 'mover', 'reordenar', 'eliminar',
])

const lista = ref([])
watch(() => props.pestanas, (v) => { lista.value = [...v] }, { immediate: true })

// ── Menú de la pestaña ────────────────────────────────────────────────────────
const menu = ref()
const opciones = ref([])

function abrirMenu(event, p, idx) {
  const ultima = idx === lista.value.length - 1
  opciones.value = [
    {
      label: 'Actualizar todas las cards',
      icon: '⟳',
      disabled: p.id !== props.activa || props.actualizando,
      command: () => emit('actualizar'),
    },
    { separator: true },
    ...(p.general ? [] : [{ label: 'Renombrar', icon: '✎', command: () => emit('renombrar', p.id) }]),
    { label: 'Mover a la izquierda', icon: '←', disabled: idx === 0, command: () => emit('mover', p.id, -1) },
    { label: 'Mover a la derecha', icon: '→', disabled: ultima, command: () => emit('mover', p.id, 1) },
    ...(p.general ? [] : [
      { separator: true },
      { label: 'Eliminar pestaña', icon: '🗑', command: () => emit('eliminar', p.id) },
    ]),
  ]
  menu.value.open(event)
}

// ── Arrastre de pestañas ─────────────────────────────────────────────────────
const UMBRAL = 5
const arrastrando = ref(null)
let candidato = null
let inicio = null
let ordenInicial = null

function empezarArrastre(event) {
  if (event.button > 0 || event.target.closest('button')) return
  const tab = event.target.closest('[data-tab]')
  if (!tab) return
  if (event.pointerType === 'touch' && !event.target.closest('.gdc-tab__handle')) return
  candidato = tab.dataset.tab
  inicio = { x: event.clientX, y: event.clientY }
}

function moverArrastre(event) {
  if (!candidato) return
  if (!arrastrando.value) {
    if (Math.hypot(event.clientX - inicio.x, event.clientY - inicio.y) < UMBRAL) return
    arrastrando.value = candidato
    ordenInicial = lista.value.map((p) => p.id).join('|')
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const destino = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-tab]')?.dataset.tab
  if (!destino || destino === arrastrando.value) return
  const desde = lista.value.findIndex((p) => p.id === arrastrando.value)
  const hasta = lista.value.findIndex((p) => p.id === destino)
  const [p] = lista.value.splice(desde, 1)
  lista.value.splice(hasta, 0, p)
}

function terminarArrastre(event) {
  candidato = null
  if (!arrastrando.value) return
  arrastrando.value = null
  if (event.currentTarget.hasPointerCapture?.(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId)
  const ids = lista.value.map((p) => p.id)
  if (ids.join('|') !== ordenInicial) emit('reordenar', ids)
}

defineExpose({ abrirMenu })
</script>
