<template>
  <div
    ref="raiz"
    v-show="coincide"
    class="gdc-card-celda"
    :class="[`gdc-card-celda--ancho-${ancho}`, { 'gdc-card-celda--con-color': colorElegido, 'gdc-card-celda--actualizando': actualizando }]"
    :style="colorElegido ? { '--gdc-dash-color': colorElegido.var ? `var(${colorElegido.var}, ${colorElegido.hex})` : colorElegido.hex } : null"
    :data-card="clave"
  >
    <div class="gdc-card">
      <div class="gdc-card__header gdc-card__handle" :data-help="primera ? 'gdc-dashboard-arrastre' : undefined">
        <span class="gdc-card__drag" aria-hidden="true">⠿</span>
        <span class="gdc-card__titulo"><TextoResaltado :texto="titulo" /></span>
        <span
          v-if="actualizando"
          class="gdc-card__spinner"
          role="status"
          aria-label="Actualizando"
        >⟳</span>
        <button
          type="button"
          class="gdc-card__gear"
          aria-label="Configurar card"
          title="Configurar"
          @pointerdown.stop
          @click.stop="abrirMenu"
        >⚙</button>
      </div>
      <div class="gdc-card__body">
        <slot />
      </div>
    </div>
    <ContextMenu ref="menu" :items="opciones" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, provide, inject, watchEffect, onBeforeUnmount } from 'vue'
import ContextMenu from './ContextMenu.vue'
import TextoResaltado from './TextoResaltado.vue'
import { COLORES_CARDS, colorDe } from '../config/coloresCards.js'
import { CLAVE_REFRESCO } from '../composables/useCardRefresh.js'
import { CLAVE_ELEMENTO_CARD } from '../composables/useQueryQueue.js'
import {
  CLAVE_FILTRO,
  CLAVE_TEXTOS_CARD,
  CLAVE_COINCIDENCIAS,
  coincide as coincideTexto,
} from '../composables/useDashboardFilter.js'

const props = defineProps({
  clave: { type: String, required: true },
  titulo: { type: String, required: true },
  ancho: { type: Number, required: true },
  anchoElegido: { type: Boolean, default: false },
  primera: { type: Boolean, default: false },
  ultima: { type: Boolean, default: false },
  color: { type: String, default: null },
  destinos: { type: Array, default: () => [] },
  enOtras: { type: Boolean, default: false },
  puedeMover: { type: Boolean, default: true },
  actualizando: { type: Boolean, default: false },
  colores: { type: Array, default: () => COLORES_CARDS },
  menuItems: { type: [Array, Function], default: () => [] },
})

const emit = defineEmits(['cambiarAncho', 'cambiarColor', 'mover', 'ocultar', 'moverA', 'copiarA', 'quitar'])

// ── Filtro ────────────────────────────────────────────────────────────────────
const filtro = inject(CLAVE_FILTRO, ref(''))
const textos = reactive(new Map())
provide(CLAVE_TEXTOS_CARD, textos)
const coincide = computed(() => [...textos.values()].some((t) => coincideTexto(t, filtro.value)))

const coincidencias = inject(CLAVE_COINCIDENCIAS, null)
if (coincidencias) {
  watchEffect(() => coincidencias.set(props.clave, coincide.value))
  onBeforeUnmount(() => coincidencias.delete(props.clave))
}

const colorElegido = computed(() => colorDe(props.color, props.colores))

const aDestinos = (evento) => props.destinos.length
  ? props.destinos.map((d) => ({ label: d.nombre, command: () => emit(evento, d.id) }))
  : undefined

// ── Refresco ─────────────────────────────────────────────────────────────────
let refresco = null
provide(CLAVE_REFRESCO, (fn) => { refresco = fn })
defineExpose({
  refrescar: () => refresco ? Promise.resolve(refresco()) : null,
})

// ── Cola de consultas ────────────────────────────────────────────────────────
const raiz = ref(null)
provide(CLAVE_ELEMENTO_CARD, () => raiz.value)

const menu = ref()

const extras = computed(() => {
  const valor = typeof props.menuItems === 'function'
    ? props.menuItems({ clave: props.clave, titulo: props.titulo })
    : props.menuItems
  return Array.isArray(valor) ? valor.filter(Boolean) : []
})

const opciones = computed(() => [
  ...(extras.value.length ? [...extras.value, { separator: true }] : []),
  {
    label: 'Ancho',
    icon: '↔',
    items: [
      ...[1, 2, 3, 4].map((n) => ({
        label: n === 1 ? '1 columna' : `${n} columnas`,
        icon: n === props.ancho ? '✓' : ' ',
        command: () => emit('cambiarAncho', n),
      })),
      { separator: true },
      {
        label: 'Restablecer ancho',
        icon: '↺',
        disabled: !props.anchoElegido,
        command: () => emit('cambiarAncho', null),
      },
    ],
  },
  {
    label: 'Color de resaltado',
    icon: '◐',
    items: [
      ...props.colores.map((c) => ({
        label: c.nombre,
        colorVar: c.var,
        colorHex: c.hex,
        elegido: c.clave === colorElegido.value?.clave,
        command: () => emit('cambiarColor', c.clave),
      })),
      { separator: true },
      {
        label: 'Sin color',
        icon: '×',
        disabled: !colorElegido.value,
        command: () => emit('cambiarColor', null),
      },
    ],
  },
  { separator: true },
  { label: 'Mover a la izquierda', icon: '←', disabled: props.primera, command: () => emit('mover', -1) },
  { label: 'Mover a la derecha', icon: '→', disabled: props.ultima, command: () => emit('mover', 1) },
  { separator: true },
  ...(props.puedeMover ? [{ label: 'Mover a pestaña…', icon: '⤴', disabled: !props.destinos.length, items: aDestinos('moverA') }] : []),
  { label: 'Copiar a pestaña…', icon: '⧉', disabled: !props.destinos.length, items: aDestinos('copiarA') },
  ...(props.enOtras ? [{ label: 'Quitar de esta pestaña', icon: '⊖', command: () => emit('quitar') }] : []),
  { separator: true },
  { label: 'Ocultar card', icon: '◌', command: () => emit('ocultar') },
])

function abrirMenu(event) {
  menu.value.open(event)
}
</script>
