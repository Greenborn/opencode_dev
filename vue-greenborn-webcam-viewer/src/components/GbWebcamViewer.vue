<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useWebcam } from '../composables/useWebcam.js'
import { dibujarDetecciones } from '../utils/draw.js'

const props = defineProps({
  dispositivoId: { type: String, default: '' },
  autoIniciar: { type: Boolean, default: false },
  puedeIniciar: { type: Boolean, default: true },
  mostrarControles: { type: Boolean, default: true },
  mostrarSelector: { type: Boolean, default: true },
  restricciones: {
    type: Object,
    default: () => ({ width: { ideal: 1280 }, height: { ideal: 720 } }),
  },
  textoIniciar: { type: String, default: 'Iniciar cámara' },
  textoIniciando: { type: String, default: 'Iniciando...' },
  textoAyuda: {
    type: String,
    default: 'La cámara requiere permiso del navegador (y localhost o HTTPS).',
  },
  detecciones: { type: Array, default: () => [] },
  anchoDetecciones: { type: Number, default: 0 },
  altoDetecciones: { type: Number, default: 0 },
  mostrarDetecciones: { type: Boolean, default: true },
  opcionesDetecciones: { type: Object, default: () => ({}) },
  maxLado: { type: Number, default: 480 },
  calidad: { type: Number, default: 0.8 },
  calidadFoto: { type: Number, default: 0.92 },
})

const emit = defineEmits([
  'update:dispositivoId',
  'iniciada',
  'detenida',
  'error',
  'video-listo',
  'cambio-tamano',
])

const videoEl = ref(null)
const canvasEl = ref(null)
const anchoVideo = ref(0)
const altoVideo = ref(0)
const anchoCanvas = ref(0)
const altoCanvas = ref(0)

const {
  stream,
  streaming,
  iniciando,
  dispositivos,
  dispositivoId,
  error,
  errorOriginal,
  errorTexto,
  iniciar: iniciarWebcam,
  detener: detenerWebcam,
  capturarFrame: capturarFrameWebcam,
  capturarFoto: capturarFotoWebcam,
  enumerarDispositivos,
} = useWebcam({
  restricciones: props.restricciones,
  videoRef: videoEl,
  dispositivoId: props.dispositivoId,
})

async function iniciar() {
  const ok = await iniciarWebcam()
  if (ok) {
    emit('iniciada', { stream: stream.value, dispositivoId: dispositivoId.value })
    actualizarCanvas()
  } else if (error.value) {
    emit('error', {
      codigo: (errorOriginal.value && errorOriginal.value.name) || 'camera_error',
      mensaje: error.value,
      original: errorOriginal.value,
    })
  }
  return ok
}

function detener() {
  detenerWebcam()
  emit('detenida')
}

async function reiniciar() {
  detenerWebcam()
  emit('detenida')
  return iniciar()
}

function capturarFrame(opciones = {}) {
  return capturarFrameWebcam({
    maxLado: props.maxLado,
    calidad: props.calidad,
    ...opciones,
  })
}

function capturarFoto(opciones = {}) {
  return capturarFotoWebcam({
    calidad: props.calidadFoto,
    ...opciones,
  })
}

function onCambioDispositivo(e) {
  dispositivoId.value = e.target.value
  reiniciar()
}

function onVideoMeta() {
  const video = videoEl.value
  if (!video) return
  anchoVideo.value = video.videoWidth || 0
  altoVideo.value = video.videoHeight || 0
  emit('video-listo', {
    ancho: anchoVideo.value,
    alto: altoVideo.value,
    anchoVisible: video.clientWidth,
    altoVisible: video.clientHeight,
  })
  nextTick(actualizarCanvas)
}

function actualizarCanvas() {
  const video = videoEl.value
  const canvas = canvasEl.value
  if (!video || !canvas) return
  const w = video.clientWidth || 0
  const h = video.clientHeight || 0
  if (!w || !h) return
  const cambio = canvas.width !== w || canvas.height !== h
  if (cambio) {
    canvas.width = w
    canvas.height = h
  }
  anchoCanvas.value = w
  altoCanvas.value = h
  if (cambio) {
    emit('cambio-tamano', { anchoCanvas: w, altoCanvas: h })
  }
  dibujar()
}

function dibujar() {
  const canvas = canvasEl.value
  if (!canvas) return
  if (!props.mostrarDetecciones) {
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    return
  }
  const video = videoEl.value
  const naturalW = props.anchoDetecciones || anchoVideo.value || (video && video.videoWidth) || 0
  const naturalH = props.altoDetecciones || altoVideo.value || (video && video.videoHeight) || 0
  dibujarDetecciones(canvas, props.detecciones, naturalW, naturalH, props.opcionesDetecciones)
}

watch(dispositivoId, (valor) => {
  emit('update:dispositivoId', valor)
})

watch(
  () => props.dispositivoId,
  (valor) => {
    if (valor === dispositivoId.value) return
    dispositivoId.value = valor
    if (streaming.value) reiniciar()
  }
)

watch(
  () => props.detecciones,
  () => nextTick(dibujar),
  { deep: true }
)

watch(
  [() => props.anchoDetecciones, () => props.altoDetecciones],
  () => nextTick(dibujar)
)

watch(
  () => props.mostrarDetecciones,
  () => nextTick(dibujar)
)

let resizeObserver = null

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && videoEl.value) {
    resizeObserver = new ResizeObserver(actualizarCanvas)
    resizeObserver.observe(videoEl.value)
  }
  enumerarDispositivos()
  actualizarCanvas()
  if (props.autoIniciar) iniciar()
})

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
})

defineExpose({
  videoEl,
  canvasEl,
  stream,
  streaming,
  iniciando,
  dispositivos,
  dispositivoId,
  error,
  errorTexto,
  iniciar,
  detener,
  reiniciar,
  capturarFrame,
  capturarFoto,
  dibujarDetecciones: dibujar,
})
</script>

<template>
  <div class="gb-webcam-viewer">
    <div v-if="mostrarControles" class="gb-webcam-viewer__barra">
      <template v-if="!streaming">
        <button
          type="button"
          class="gb-webcam-viewer__btn gb-webcam-viewer__btn--primary"
          :disabled="!puedeIniciar || iniciando"
          @click="iniciar"
        >
          {{ iniciando ? textoIniciando : textoIniciar }}
        </button>
      </template>
      <template v-else>
        <button type="button" class="gb-webcam-viewer__btn" @click="detener">Detener</button>
        <label v-if="mostrarSelector && dispositivos.length" class="gb-webcam-viewer__ctl">
          <span>Cámara</span>
          <select :value="dispositivoId" @change="onCambioDispositivo">
            <option v-for="d in dispositivos" :key="d.deviceId" :value="d.deviceId">
              {{ d.label || d.deviceId }}
            </option>
          </select>
        </label>
      </template>
      <slot
        name="acciones"
        :streaming="streaming"
        :iniciando="iniciando"
        :iniciar="iniciar"
        :detener="detener"
        :capturar-frame="capturarFrame"
        :capturar-foto="capturarFoto"
      />
    </div>

    <div v-if="error" class="gb-webcam-viewer__error">{{ errorTexto }}</div>

    <div v-show="streaming" class="gb-webcam-viewer__escenario">
      <video
        ref="videoEl"
        class="gb-webcam-viewer__video"
        autoplay
        playsinline
        muted
        @loadedmetadata="onVideoMeta"
      ></video>
      <canvas ref="canvasEl" class="gb-webcam-viewer__overlay"></canvas>
      <slot
        name="capa-extra"
        :ancho-video="anchoVideo"
        :alto-video="altoVideo"
        :ancho-canvas="anchoCanvas"
        :alto-canvas="altoCanvas"
      />
    </div>

    <div v-if="!streaming && (textoAyuda || $slots.ayuda)" class="gb-webcam-viewer__ayuda">
      <slot name="ayuda">{{ textoAyuda }}</slot>
    </div>
  </div>
</template>
