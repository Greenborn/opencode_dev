<script setup>
import { ref, computed, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  minScale: { type: Number, default: 1 },
  maxScale: { type: Number, default: 8 },
});

const scale = ref(1);
const tx = ref(0);
const ty = ref(0);
const contenedor = ref(null);

const estilo = computed(() => ({
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
}));

function reset() {
  scale.value = 1;
  tx.value = 0;
  ty.value = 0;
}

function zoom(factor, origenX = null, origenY = null) {
  const previa = scale.value;
  const nueva = Math.min(props.maxScale, Math.max(props.minScale, previa * factor));
  if (nueva === previa) return;
  if (origenX !== null && origenY !== null) {
    const rect = contenedor.value.getBoundingClientRect();
    const cx = origenX - rect.left - rect.width / 2;
    const cy = origenY - rect.top - rect.height / 2;
    const ratio = nueva / previa;
    tx.value = cx - (cx - tx.value) * ratio;
    ty.value = cy - (cy - ty.value) * ratio;
  }
  scale.value = nueva;
}

function onWheel(e) {
  e.preventDefault();
  zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
}

let arrastrando = false;
let ultimoX = 0;
let ultimoY = 0;

function onPointerDown(e) {
  if (scale.value <= 1) return;
  arrastrando = true;
  ultimoX = e.clientX;
  ultimoY = e.clientY;
  e.target.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e) {
  if (!arrastrando) return;
  tx.value += e.clientX - ultimoX;
  ty.value += e.clientY - ultimoY;
  ultimoX = e.clientX;
  ultimoY = e.clientY;
}

function onPointerUp() {
  arrastrando = false;
}

function onDblClick(e) {
  if (scale.value > 1) {
    reset();
  } else {
    zoom(2.5, e.clientX, e.clientY);
  }
}

function onKeydown(e) {
  if (e.key === '+' || e.key === '=') zoom(1.25);
  else if (e.key === '-' || e.key === '_') zoom(1 / 1.25);
  else if (e.key === '0') reset();
}

watch(() => props.src, reset);

onBeforeUnmount(() => {
  arrastrando = false;
});

defineExpose({ reset, zoom });
</script>

<template>
  <div
    ref="contenedor"
    class="gb-zoomable-image"
    tabindex="0"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="onDblClick"
    @keydown="onKeydown"
  >
    <img :src="props.src" :alt="props.alt" class="gb-zoomable-image__img" :style="estilo" draggable="false" />
    <div class="gb-zoomable-image__controles">
      <button type="button" title="Acercar (+)" @click.stop="zoom(1.25)">+</button>
      <button type="button" title="Alejar (-)" @click.stop="zoom(1 / 1.25)">−</button>
      <button type="button" title="Restablecer (0)" @click.stop="reset">⟲</button>
    </div>
    <div class="gb-zoomable-image__hint">{{ Math.round(scale * 100) }}%</div>
  </div>
</template>
