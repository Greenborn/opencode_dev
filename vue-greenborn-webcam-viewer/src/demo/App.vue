<script setup>
import { ref, onBeforeUnmount } from 'vue'
import GbWebcamViewer from '../components/GbWebcamViewer.vue'

const visor = ref(null)
const anchoDetecciones = ref(0)
const altoDetecciones = ref(0)
const detecciones = ref([])
const mostrarDetecciones = ref(true)
const mensaje = ref('')

let timer = null
let fase = 0

function crearDetecciones(ancho, alto) {
  fase += 0.12
  const desplazamiento = Math.sin(fase) * ancho * 0.04
  detecciones.value = [
    {
      id: 1,
      name: 'objeto A',
      score: 0.91,
      p1: { x: ancho * 0.12 + desplazamiento, y: alto * 0.18 },
      p2: { x: ancho * 0.4 + desplazamiento, y: alto * 0.58 },
    },
    {
      id: 2,
      name: 'objeto B',
      score: 0.78,
      p1: { x: ancho * 0.56, y: alto * 0.32 - desplazamiento },
      p2: { x: ancho * 0.88, y: alto * 0.76 - desplazamiento },
    },
  ]
}

function onVideoListo({ ancho, alto }) {
  anchoDetecciones.value = ancho
  altoDetecciones.value = alto
  crearDetecciones(ancho, alto)
  if (timer) clearInterval(timer)
  timer = setInterval(() => crearDetecciones(ancho, alto), 250)
}

async function capturarFrame() {
  const frame = await visor.value?.capturarFrame()
  mensaje.value = frame
    ? `Frame capturado: ${frame.width}x${frame.height}, ${Math.round(frame.blob.size / 1024)} KB`
    : 'No se pudo capturar el frame'
}

async function capturarFoto() {
  const blob = await visor.value?.capturarFoto()
  mensaje.value = blob
    ? `Foto capturada: ${Math.round(blob.size / 1024)} KB`
    : 'No se pudo capturar la foto'
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <main class="demo">
    <h1>vue-greenborn-webcam-viewer</h1>
    <p class="demo__hint">
      Demo de permisos, selección de cámara, captura y capa de bounding boxes. Las cajas son de
      ejemplo y se mueven solas.
    </p>

    <GbWebcamViewer
      ref="visor"
      :detecciones="detecciones"
      :ancho-detecciones="anchoDetecciones"
      :alto-detecciones="altoDetecciones"
      :mostrar-detecciones="mostrarDetecciones"
      @video-listo="onVideoListo"
    >
      <template #acciones="{ streaming }">
        <label v-if="streaming" class="demo__check">
          <input v-model="mostrarDetecciones" type="checkbox">
          Cajas
        </label>
        <template v-if="streaming">
          <button type="button" class="gb-webcam-viewer__btn" @click="capturarFrame">
            Capturar frame
          </button>
          <button type="button" class="gb-webcam-viewer__btn" @click="capturarFoto">
            Capturar foto
          </button>
        </template>
      </template>

      <template #capa-extra="{ anchoCanvas, altoCanvas }">
        <div v-if="anchoCanvas" class="demo__overlay">
          Overlay extra · {{ anchoCanvas }}x{{ altoCanvas }}
        </div>
      </template>
    </GbWebcamViewer>

    <p v-if="mensaje" class="demo__mensaje">{{ mensaje }}</p>
  </main>
</template>

<style>
body {
  margin: 0;
  padding: 24px;
  background: #14171c;
  color: #d7dce3;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.demo {
  max-width: 960px;
  margin: 0 auto;
}

.demo h1 {
  font-size: 1.3em;
}

.demo__hint {
  color: #8b94a3;
}

.demo__check {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 0.9em;
  color: #8b94a3;
}

.demo__overlay {
  position: absolute;
  top: 10px;
  left: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(77, 163, 255, 0.75);
  color: #06111f;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  pointer-events: none;
}

.demo__mensaje {
  color: #6bd18b;
  font-size: 0.9em;
}
</style>
