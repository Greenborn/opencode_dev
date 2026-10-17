<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  ancho: { type: Number, required: true },
  alto: { type: Number, required: true },
  anguloLibre: { type: Number, default: 0 },
  zoomMinFactor: { type: Number, default: 0.1 },
  zoomMaxAbs: { type: Number, default: 32 },
  mostrarPorcentaje: { type: Boolean, default: true },
})

const emit = defineEmits(['cargada', 'cambio-viewport', 'cambio-pan'])

const contenedor = ref(null)
const contenidoEl = ref(null)

const zoom = ref(1.0)
const fitScale = ref(1.0)
const ctrlPresionado = ref(false)
const paneando = ref(false)
let panInicio = null

// Cuantizado a device-pixels para que el canvas superpuesto quede nítido.
const escalaActual = computed(() => {
  const raw = fitScale.value * zoom.value
  const dpr = window.devicePixelRatio || 1
  const steps = raw * dpr
  if (steps < 1) return raw
  return Math.round(steps) / dpr
})

const zoomPercent = computed(() => {
  if (!fitScale.value) return 100
  return Math.round((escalaActual.value / fitScale.value) * 100)
})

const zoomMax = computed(() => Math.max(1, props.zoomMaxAbs / fitScale.value))

const estiloContenido = computed(() => ({
  width: `${props.ancho * escalaActual.value}px`,
  height: `${props.alto * escalaActual.value}px`,
}))

// Preview CSS de la rotación libre; el recorte real lo hace el backend.
const estiloTransformPreview = computed(() => {
  if (!props.anguloLibre) return {}
  return { transform: `rotate(${props.anguloLibre}deg)` }
})

function actualizarFitScale() {
  const c = contenedor.value
  if (!c || !props.ancho || !props.alto) return
  const escalaX = c.clientWidth / props.ancho
  const escalaY = c.clientHeight / props.alto
  let s = Math.min(escalaX, escalaY)
  if (!isFinite(s) || s <= 0) s = 1.0
  fitScale.value = s
}

function cambiarZoom(delta) {
  zoom.value = Math.min(zoomMax.value, Math.max(props.zoomMinFactor, zoom.value + delta))
}

function restablecerZoom() {
  actualizarFitScale()
  zoom.value = 1.0
}

function onImgCargada() {
  actualizarFitScale()
  emit('cargada')
}

function origToCanvas(x, y) {
  const s = escalaActual.value
  return { x: x * s, y: y * s }
}

function canvasToOrig(x, y) {
  const s = escalaActual.value
  return { x: Math.round(x / s), y: Math.round(y / s) }
}

function estaDentroDeImagen(x, y) {
  const w = props.ancho * escalaActual.value
  const h = props.alto * escalaActual.value
  return x >= 0 && y >= 0 && x <= w && y <= h
}

// Zoom centrado en el cursor manipulando scroll (no transform CSS), en
// pasos de "device-pixel steps" para evitar aliasing del canvas superpuesto.
function manejarRueda(e) {
  if (paneando.value) return
  const wrap = contenedor.value
  const contenido = contenidoEl.value
  if (!wrap || !contenido) return
  const dpr = window.devicePixelRatio || 1
  const dir = e.deltaY < 0 ? 1 : -1
  const curSteps = escalaActual.value * dpr
  let nextSteps
  if (curSteps >= 1) {
    const step = Math.max(1, Math.round(curSteps * 0.2))
    const down = curSteps - step
    nextSteps = dir > 0 ? curSteps + step : (down >= 1 ? down : curSteps / 1.2)
  } else {
    nextSteps = curSteps * (dir > 0 ? 1.2 : 1 / 1.2)
    if (dir > 0 && nextSteps > 1) nextSteps = 1
  }
  const nuevaEscala = Math.min(props.zoomMaxAbs, Math.max(props.zoomMinFactor * fitScale.value, nextSteps / dpr))
  if (nuevaEscala === escalaActual.value) return

  const rect = contenido.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const k = nuevaEscala / escalaActual.value
  zoom.value = nuevaEscala / fitScale.value

  nextTick(() => {
    const wRect = wrap.getBoundingClientRect()
    const cRect = contenido.getBoundingClientRect()
    const px = e.clientX - wRect.left
    const py = e.clientY - wRect.top
    const maxX = Math.max(0, wrap.scrollWidth - wrap.clientWidth)
    const maxY = Math.max(0, wrap.scrollHeight - wrap.clientHeight)
    wrap.scrollLeft = Math.max(0, Math.min(maxX, cRect.left - wRect.left + wrap.scrollLeft + mx * k - px))
    wrap.scrollTop = Math.max(0, Math.min(maxY, cRect.top - wRect.top + wrap.scrollTop + my * k - py))
  })
}

function iniciarPaneo(e) {
  const wrap = contenedor.value
  if (!wrap) return
  e.preventDefault()
  paneando.value = true
  panInicio = { x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop }
  window.addEventListener('mousemove', onPaneoMove)
  window.addEventListener('mouseup', onPaneoFin)
}

function onPaneoMove(e) {
  if (!paneando.value || !panInicio) return
  const wrap = contenedor.value
  if (!wrap) return
  wrap.scrollLeft = panInicio.sl - (e.clientX - panInicio.x)
  wrap.scrollTop = panInicio.st - (e.clientY - panInicio.y)
}

function onPaneoFin() {
  if (!paneando.value) return
  paneando.value = false
  panInicio = null
  window.removeEventListener('mousemove', onPaneoMove)
  window.removeEventListener('mouseup', onPaneoFin)
}

function onKeyDown(e) { if (e.key === 'Control') ctrlPresionado.value = true }
function onKeyUp(e) { if (e.key === 'Control') ctrlPresionado.value = false }
function onBlurVentana() { ctrlPresionado.value = false }

onMounted(() => {
  actualizarFitScale()
  window.addEventListener('resize', actualizarFitScale)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlurVentana)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', actualizarFitScale)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlurVentana)
  window.removeEventListener('mousemove', onPaneoMove)
  window.removeEventListener('mouseup', onPaneoFin)
})

watch(() => props.src, () => {
  zoom.value = 1.0
  nextTick(actualizarFitScale)
})

watch(escalaActual, (val) => {
  emit('cambio-viewport', {
    escala: val,
    anchoContenido: props.ancho * val,
    altoContenido: props.alto * val,
  })
}, { immediate: true })

// Estado de paneo expuesto por evento (en vez de sólo defineExpose) para que
// el consumidor pueda reflejarlo en data/computed propio sin depender de que
// $refs ya esté disponible en el primer render (ver nota en ImageViewer.vue).
watch([ctrlPresionado, paneando], ([ctrl, pan]) => {
  emit('cambio-pan', { ctrlPresionado: ctrl, paneando: pan })
}, { immediate: true })

defineExpose({
  escalaActual,
  fitScale,
  zoomPercent,
  cambiarZoom,
  restablecerZoom,
  origToCanvas,
  canvasToOrig,
  estaDentroDeImagen,
  manejarRueda,
  iniciarPaneo,
  ctrlPresionado,
  paneando,
})
</script>

<template>
  <div class="gb-image-viewer__scroll" ref="contenedor">
    <div class="gb-image-viewer__contenido" ref="contenidoEl" :style="estiloContenido">
      <img
        :src="src"
        :alt="alt"
        class="gb-image-viewer__img"
        :style="estiloTransformPreview"
        @load="onImgCargada"
      >
      <slot
        name="overlay"
        :escala="escalaActual"
        :angulo-libre="anguloLibre"
        :estilo-transform-preview="estiloTransformPreview"
        :estilo-contenido="estiloContenido"
      />
    </div>
    <div v-if="mostrarPorcentaje" class="gb-image-viewer__hint">{{ zoomPercent }}%</div>
  </div>
</template>
