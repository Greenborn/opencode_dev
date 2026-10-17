<script setup>
import { ref } from 'vue'
import GbImageViewer from '../components/GbImageViewer.vue'

// Imagen de ejemplo con tamaño natural conocido.
const src = 'https://picsum.photos/id/237/1200/800'
const ancho = 1200
const alto = 800

const visor = ref(null)
const freeAngle = ref(0)
const canvas = ref(null)

function onCambioViewport({ anchoContenido, altoContenido }) {
  if (!canvas.value) return
  const dpr = window.devicePixelRatio || 1
  canvas.value.width = Math.round(anchoContenido * dpr)
  canvas.value.height = Math.round(altoContenido * dpr)
  const ctx = canvas.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  dibujarCrosshair()
}

function dibujarCrosshair() {
  if (!canvas.value || !visor.value) return
  const ctx = canvas.value.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  ctx.clearRect(0, 0, canvas.value.width / dpr, canvas.value.height / dpr)
  const centro = visor.value.origToCanvas(ancho / 2, alto / 2)
  ctx.strokeStyle = '#ff4081'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(centro.x - 20, centro.y)
  ctx.lineTo(centro.x + 20, centro.y)
  ctx.moveTo(centro.x, centro.y - 20)
  ctx.lineTo(centro.x, centro.y + 20)
  ctx.stroke()
}

function onWheel(e) {
  visor.value?.manejarRueda(e)
}

function onMouseDown(e) {
  if (e.ctrlKey) visor.value?.iniciarPaneo(e)
}

function onFreeAngleRelease() {
  if (!freeAngle.value) return
  console.log('rotate-free', freeAngle.value)
  freeAngle.value = 0
}
</script>

<template>
  <div style="display:flex; flex-direction:column; height:100vh; font-family:sans-serif;">
    <div style="display:flex; gap:8px; align-items:center; padding:8px; border-bottom:1px solid #ccc;">
      <button @click="visor?.cambiarZoom(-0.1)">-</button>
      <button @click="visor?.cambiarZoom(0.1)">+</button>
      <button @click="visor?.restablecerZoom()">Fit</button>
      <label>
        Rotación libre
        <input
          type="range" min="0" max="360" step="0.5"
          v-model.number="freeAngle"
          @pointerup="onFreeAngleRelease"
        >
        {{ freeAngle }}°
      </label>
    </div>
    <GbImageViewer
      ref="visor"
      :src="src"
      :ancho="ancho"
      :alto="alto"
      :angulo-libre="freeAngle"
      style="flex:1;"
      @cambio-viewport="onCambioViewport"
    >
      <template #overlay>
        <canvas
          ref="canvas"
          style="position:absolute; inset:0; cursor:crosshair;"
          @wheel.prevent="onWheel"
          @mousedown="onMouseDown"
        />
      </template>
    </GbImageViewer>
  </div>
</template>
