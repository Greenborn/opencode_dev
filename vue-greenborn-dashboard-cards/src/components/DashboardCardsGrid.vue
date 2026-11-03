<template>
  <!-- Cards del dashboard. El catálogo llega en `cards` (filtrado por permisos) y las pestañas del
       usuario, con el orden, los anchos, los colores y las ocultas de cada una, en su preferencia
       `preferenciasClave` (v2, ver `useTabsPreferences.js`). Sólo se montan las cards de la pestaña
       activa; las demás, como las ocultas, no consultan. La card fija del final cuenta las ocultas de
       la pestaña y las vuelve a mostrar. Mientras hay texto en el filtro, la grilla muestra lo que
       coincide en TODAS las pestañas, agrupado por pestaña. -->
  <div v-if="catalogoDibujable.length" class="gdc-grid-wrapper">
    <TabsBar
      v-model:filtro="filtro"
      :pestanas="pestanas"
      :activa="pref.activa"
      :actualizando="actualizando !== null"
      @actualizar="actualizarTodas"
      @activar="activar"
      @agregar="abrirAlta"
      @renombrar="abrirRenombrar"
      @mover="moverPestana"
      @reordenar="reordenarPestanas"
      @eliminar="confirmarEliminar"
    />

    <div
      class="gdc-grid"
      @pointerdown="empezarArrastre"
      @pointermove="moverArrastre"
      @pointerup="terminarArrastre"
      @pointercancel="terminarArrastre"
    >
      <template v-for="(celda, idx) in celdas" :key="celda.clave ?? 'grupo_' + celda.grupo">
        <div v-if="celda.grupo" v-show="grupoCoincide(celda.grupo)" class="gdc-grupo" :data-grupo="celda.grupo">
          <span class="gdc-grupo__icono" aria-hidden="true">▸</span>
          <span class="gdc-grupo__nombre">{{ celda.nombre }}</span>
          <button type="button" class="gdc-btn gdc-btn--secondary gdc-btn--sm" @click="irAPestana(celda.grupo)">
            Ir a la pestaña
          </button>
        </div>
        <DashboardCard
          v-else
          :ref="(el) => guardarRef(celda.clave, el)"
          :clave="celda.clave"
          :titulo="celda.titulo"
          :ancho="celda.ancho"
          :ancho-elegido="celda.anchoElegido"
          :color="celda.color"
          :primera="filtrando || posiciones.get(celda.clave)?.primera"
          :ultima="filtrando || posiciones.get(celda.clave)?.ultima"
          :destinos="moveTargets(pref, celda.clave)"
          :en-otras="celda.pestana !== ID_GENERAL && pestanasCon(pref, celda.clave).length > 1"
          :puede-mover="celda.pestana !== ID_GENERAL"
          :actualizando="celda.clave === actualizando"
          :colores="paleta"
          :menu-items="celda.menuItems"
          :class="{ 'gdc-card-celda--arrastrada': celda.clave === arrastrando }"
          @cambiar-ancho="(n) => aplicar(cambiarAncho(pref, celda.pestana, celda.clave, n))"
          @cambiar-color="(c) => aplicar(cambiarColor(pref, celda.pestana, celda.clave, c))"
          @mover="(paso) => mover(celda, paso)"
          @mover-a="(id) => aplicar(moverCard(pref, celda.pestana, id, celda.clave))"
          @copiar-a="(id) => aplicar(copiarCard(pref, celda.pestana, id, celda.clave))"
          @quitar="aplicar(quitarCard(pref, celda.pestana, celda.clave))"
          @ocultar="aplicar(ocultar(pref, celda.pestana, celda.clave))"
        >
          <component :is="celda.componenteVue" v-bind="celda.props || {}" />
        </DashboardCard>
      </template>

      <CardOcultas
        v-if="ocultasDisponibles.length && !filtrando"
        :ocultas="ocultasDisponibles"
        @abrir="abrirOcultas"
      />

      <div v-if="filtrando && ningunaCoincide" class="gdc-pestana-vacia">
        Ninguna card de ninguna pestaña tiene «{{ filtro.trim() }}» en el título o el subtítulo.
      </div>
      <div v-if="!filtrando && !cards.length && !ocultasDisponibles.length" class="gdc-pestana-vacia">
        Esta pestaña no tiene cards. Se suman desde el engranaje de una card, con "Copiar a pestaña…" o
        "Mover a pestaña…".
      </div>
    </div>

    <InternalDialog v-if="dialogoInterno" :dialogo="dialogoInterno" @cerrar="dialogoInterno = null" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, markRaw, defineAsyncComponent, onMounted, provide } from 'vue'
import DashboardCard from './DashboardCard.vue'
import CardOcultas from './CardOcultas.vue'
import TabsBar from './TabsBar.vue'
import TabFormModal from './TabFormModal.vue'
import SelectorCardsOcultas from './SelectorCardsOcultas.vue'
import InternalDialog from './InternalDialog.vue'
import { COLORES_CARDS } from '../config/coloresCards.js'
import { provideDashboardCardsContext } from '../composables/useDashboardCardsContext.js'
import {
  leer, conNuevas, conIniciales, activa as tabActiva, pestana as tabDe, pestanasCon, destinos as moveTargets,
  ID_GENERAL, errorDeNombre, agregarPestana, renombrar, reordenarPestanas as reordenarPestanasPref,
  moverPestana as moverPestanaPref, eliminarPestana, reordenarCards, cambiarAncho, cambiarColor,
  ocultar, mostrar, moverCard, copiarCard, quitarCard,
} from '../composables/useTabsPreferences.js'
import { CLAVE_FILTRO, CLAVE_COINCIDENCIAS } from '../composables/useDashboardFilter.js'
import { encolar } from '../composables/useQueryQueue.js'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  contexto: { type: Object, default: () => ({}) },
  preferenciasClave: { type: String, default: 'dashboard_cards' },
  colores: { type: Array, default: null },
})

const emit = defineEmits(['preferencia-cambiada'])

provideDashboardCardsContext(props.contexto)

const ctx = computed(() => props.contexto || {})
const paleta = computed(() => props.colores || ctx.value.colores || COLORES_CARDS)

// ── Catálogo ─────────────────────────────────────────────────────────────────
const cacheComponentes = new Map()

function componenteResuelto(def) {
  const comp = def.componente
  if (comp == null) return null
  if (typeof comp === 'function') {
    if (!cacheComponentes.has(def.clave)) cacheComponentes.set(def.clave, markRaw(defineAsyncComponent(comp)))
    return cacheComponentes.get(def.clave)
  }
  if (!cacheComponentes.has(def.clave)) cacheComponentes.set(def.clave, markRaw(comp))
  return cacheComponentes.get(def.clave)
}

function permitida(def) {
  if (!def.permiso) return true
  return typeof ctx.value.tienePermiso !== 'function' || ctx.value.tienePermiso(def.permiso)
}

const catalogoDibujable = computed(() => {
  const res = []
  for (const def of props.cards) {
    if (!def?.clave || !permitida(def)) continue
    const componente = componenteResuelto(def)
    if (!componente) {
      console.warn('[vue-greenborn-dashboard-cards] card sin componente', def.clave)
      continue
    }
    res.push({ ...def, componenteVue: componente })
  }
  return res
})

// ── Preferencia ──────────────────────────────────────────────────────────────
// `crudo` es lo último leído del adaptador (undefined hasta que termina la carga). `leer` valida y
// `conNuevas`/`conIniciales` aplican las cards nuevas y las pestañas iniciales, sin guardar.
let crudo = undefined
let cargado = false

const pref = ref(leer(null))
const cards = ref([])

function recalcular() {
  const filas = catalogoDibujable.value
  pref.value = conIniciales(conNuevas(leer(crudo, filas), filas), filas)
}

function aCard(fila, e) {
  return {
    clave: fila.clave,
    titulo: fila.titulo,
    componenteVue: fila.componenteVue,
    props: fila.props,
    menuItems: fila.menuItems,
    ancho: e.ancho ?? fila.anchoDefault ?? 1,
    anchoElegido: e.ancho != null,
    color: e.color ?? null,
  }
}

function armarCards() {
  const porClave = new Map(catalogoDibujable.value.map((f) => [f.clave, f]))
  const act = tabActiva(pref.value)
  cards.value = act.cards
    .filter((e) => porClave.has(e.clave))
    .map((e) => ({ ...aCard(porClave.get(e.clave), e), pestana: act.id }))
}

watch(catalogoDibujable, recalcular, { immediate: true })
watch(pref, armarCards, { immediate: true })

const pestanas = computed(() => pref.value.pestanas.map((p) => ({ id: p.id, nombre: p.nombre, general: !!p.general })))

onMounted(async () => {
  const adapter = ctx.value.preferencias
  try {
    crudo = typeof adapter?.cargar === 'function' ? await adapter.cargar(props.preferenciasClave) : null
  } catch (error) {
    console.warn('[vue-greenborn-dashboard-cards] Error cargando preferencias de cards:', error)
    crudo = null
  } finally {
    cargado = true
    recalcular()
  }
})

function guardar() {
  if (!cargado) return
  const valor = pref.value
  emit('preferencia-cambiada', valor)
  const adapter = ctx.value.preferencias
  if (typeof adapter?.guardar !== 'function') return
  Promise.resolve(adapter.guardar(props.preferenciasClave, valor)).catch((error) => {
    console.warn('[vue-greenborn-dashboard-cards] Error guardando preferencias de cards:', error)
  })
}

function aplicar(nueva) {
  if (!nueva || nueva === pref.value) return
  pref.value = nueva
  guardar()
}

// ── Filtro ───────────────────────────────────────────────────────────────────
const filtro = ref('')
provide(CLAVE_FILTRO, filtro)
const filtrando = computed(() => filtro.value.trim() !== '')
const coincidencias = reactive(new Map())
provide(CLAVE_COINCIDENCIAS, coincidencias)
const ningunaCoincide = computed(() => ![...coincidencias.values()].some(Boolean))

const celdas = computed(() => {
  if (!filtrando.value) return cards.value
  const porClave = new Map(catalogoDibujable.value.map((f) => [f.clave, f]))
  const vistas = new Set()
  const res = []
  const enOrden = [...pref.value.pestanas.filter((p) => !p.general), ...pref.value.pestanas.filter((p) => p.general)]
  for (const p of enOrden) {
    const propias = p.cards.filter((e) => porClave.has(e.clave) && !vistas.has(e.clave))
    if (!propias.length) continue
    res.push({ grupo: p.id, nombre: p.nombre, claves: propias.map((e) => e.clave) })
    for (const e of propias) {
      vistas.add(e.clave)
      res.push({ ...aCard(porClave.get(e.clave), e), pestana: p.id })
    }
  }
  return res
})

const posiciones = computed(() => {
  const mapa = new Map()
  const vis = celdas.value.filter((c) => !c.grupo)
  vis.forEach((c, i) => mapa.set(c.clave, { primera: i === 0, ultima: i === vis.length - 1 }))
  return mapa
})

function grupoCoincide(id) {
  const grupo = celdas.value.find((c) => c.grupo === id)
  return !!grupo?.claves.some((k) => coincidencias.get(k))
}

function irAPestana(id) {
  filtro.value = ''
  activar(id)
}

// ── Pestañas ─────────────────────────────────────────────────────────────────
function activar(id) {
  filtro.value = ''
  if (id !== pref.value.activa) aplicar({ ...pref.value, activa: id })
}

function moverPestana(id, paso) {
  aplicar(moverPestanaPref(pref.value, id, paso))
}

function reordenarPestanas(ids) {
  aplicar(reordenarPestanasPref(pref.value, ids))
}

const dialogoInterno = ref(null)

function abrirDialogo(componente, titulo, parametros, opciones) {
  let cerrarExterno = () => {}
  const parametrosConCierre = { ...parametros, cerrar: () => cerrarExterno() }
  if (typeof ctx.value.abrirModal === 'function') {
    const res = ctx.value.abrirModal(componente, titulo, parametrosConCierre, opciones)
    cerrarExterno = () => {
      if (typeof res?.cerrar === 'function') res.cerrar()
      else if (typeof ctx.value.cerrarModal === 'function' && res?.code != null) ctx.value.cerrarModal(res.code)
    }
  } else {
    dialogoInterno.value = { componente, titulo, props: parametrosConCierre, opciones }
    cerrarExterno = () => { dialogoInterno.value = null }
  }
}

function abrirAlta() {
  const act = tabActiva(pref.value)
  const enActiva = (clave) => !act.general
    && (act.cards.some((e) => e.clave === clave) || act.ocultas.some((e) => e.clave === clave))
  const lista = catalogoDibujable.value.map((f) => ({ clave: f.clave, titulo: f.titulo, enActiva: enActiva(f.clave) }))
  const modelo = reactive({ nombre: '', elecciones: Object.fromEntries(lista.map((c) => [c.clave, 'no'])) })
  abrirDialogo(TabFormModal, 'Nueva pestaña', {
    modelo,
    cards: lista,
    modo: 'alta',
    validar: (nombre) => errorDeNombre(pref.value, nombre),
    onGuardar: ({ nombre, elecciones }) => aplicar(agregarPestana(pref.value, nombre, elecciones)),
  }, { size: 'md' })
}

function abrirRenombrar(id) {
  const p = tabDe(pref.value, id)
  if (!p || p.general) return
  const modelo = reactive({ nombre: p.nombre })
  abrirDialogo(TabFormModal, 'Renombrar pestaña', {
    modelo,
    modo: 'renombrar',
    validar: (nombre) => errorDeNombre(pref.value, nombre, id),
    onGuardar: ({ nombre }) => aplicar(renombrar(pref.value, id, nombre)),
  }, { size: 'sm' })
}

function confirmarEliminar(id) {
  const p = tabDe(pref.value, id)
  if (!p || p.general) return
  const accion = () => aplicar(eliminarPestana(pref.value, id))
  const texto = `Se eliminará la pestaña "${p.nombre}". Sus cards siguen en "Todas". ¿Desea continuar?`
  if (typeof ctx.value.confirmar === 'function') {
    ctx.value.confirmar({
      title: 'Eliminar pestaña',
      text: texto,
      confirmLabel: 'Eliminar',
      onConfirm: accion,
    })
  } else if (typeof window !== 'undefined' && window.confirm(texto)) {
    accion()
  }
}

// ── Ocultas ──────────────────────────────────────────────────────────────────
const ocultasDisponibles = computed(() => {
  const ocultas = new Set(tabActiva(pref.value).ocultas.map((e) => e.clave))
  return catalogoDibujable.value
    .filter((fila) => ocultas.has(fila.clave))
    .map((fila) => ({ clave: fila.clave, titulo: fila.titulo }))
})

function abrirOcultas() {
  const lista = ocultasDisponibles.value
  abrirDialogo(SelectorCardsOcultas, 'Cards ocultas', {
    ocultas: lista,
    onMostrar: (claves) => aplicar(mostrar(pref.value, pref.value.activa, claves)),
  }, { size: 'sm' })
}

// ── Actualizar todas ────────────────────────────────────────────────────────
const refsCards = new Map()
function guardarRef(clave, el) {
  if (el) refsCards.set(clave, el)
  else refsCards.delete(clave)
}

const actualizando = ref(null)

async function actualizarTodas() {
  if (actualizando.value !== null) return
  const pestanaId = pref.value.activa
  try {
    for (const clave of cards.value.map((c) => c.clave)) {
      if (pref.value.activa !== pestanaId) break
      await encolar(async () => {
        const card = refsCards.get(clave)
        if (!card) return
        actualizando.value = clave
        await card.refrescar()
      }, { vigente: () => pref.value.activa === pestanaId })
    }
  } finally {
    actualizando.value = null
  }
}

// ── Arrastre de cards ───────────────────────────────────────────────────────
const arrastrando = ref(null)
let ordenInicial = null

function claveBajo(x, y) {
  return document.elementFromPoint(x, y)?.closest('[data-card]')?.dataset.card ?? null
}

function empezarArrastre(event) {
  const manija = event.target.closest('.gdc-card__handle')
  if (filtrando.value || !manija || event.target.closest('button') || event.button > 0) return
  arrastrando.value = manija.closest('[data-card]')?.dataset.card ?? null
  if (!arrastrando.value) return
  ordenInicial = cards.value.map((c) => c.clave).join('|')
  event.currentTarget.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function moverArrastre(event) {
  if (!arrastrando.value) return
  const destino = claveBajo(event.clientX, event.clientY)
  if (!destino || destino === arrastrando.value) return
  const desde = cards.value.findIndex((c) => c.clave === arrastrando.value)
  const hasta = cards.value.findIndex((c) => c.clave === destino)
  if (desde === -1 || hasta === -1) return
  const [card] = cards.value.splice(desde, 1)
  cards.value.splice(hasta, 0, card)
}

function terminarArrastre(event) {
  if (!arrastrando.value) return
  arrastrando.value = null
  if (event.currentTarget.hasPointerCapture?.(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId)
  const claves = cards.value.map((c) => c.clave)
  if (claves.join('|') !== ordenInicial) aplicar(reordenarCards(pref.value, pref.value.activa, claves))
}

function mover(card, paso) {
  const claves = cards.value.map((c) => c.clave)
  const desde = claves.indexOf(card.clave)
  const hasta = desde + paso
  if (hasta < 0 || hasta >= claves.length) return
  claves.splice(desde, 1)
  claves.splice(hasta, 0, card.clave)
  aplicar(reordenarCards(pref.value, pref.value.activa, claves))
}

defineExpose({ actualizarTodas, activar })
</script>
