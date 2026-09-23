<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import GbZoomableImage from './GbZoomableImage.vue';
import { normalizeImagen } from '../models/imagen.js';

const props = defineProps({
  imagenes: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 },
  open: { type: Boolean, default: false },
  showDownload: { type: Boolean, default: true },
  showFullscreen: { type: Boolean, default: true },
  showMetadata: { type: Boolean, default: true },
});

const emit = defineEmits(['update:open', 'update:index', 'closed', 'previous', 'next']);

const indice = ref(props.startIndex);
const zoomable = ref(null);
const contenedor = ref(null);
const enFullscreen = ref(false);

const items = computed(() => props.imagenes.map(normalizeImagen).filter((i) => i && i.url));
const actual = computed(() => items.value[indice.value] || null);
const hayPrev = computed(() => indice.value > 0);
const hayNext = computed(() => indice.value < items.value - 1);

watch(() => props.startIndex, (v) => { indice.value = v; });
watch(() => props.open, async (abierto) => {
  if (abierto) {
    indice.value = props.startIndex;
    await nextTick();
    contenedor.value?.focus();
  } else {
    salirFullscreen();
  }
});

function cerrar() {
  emit('update:open', false);
  emit('closed');
}

function previous() {
  if (!hayPrev.value) return;
  indice.value -= 1;
  zoomable.value?.reset();
  emit('update:index', indice.value);
  emit('previous', indice.value);
}

function next() {
  if (!hayNext.value) return;
  indice.value += 1;
  zoomable.value?.reset();
  emit('update:index', indice.value);
  emit('next', indice.value);
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await contenedor.value?.requestFullscreen?.().catch(() => {});
    enFullscreen.value = Boolean(document.fullscreenElement);
  } else {
    await document.exitFullscreen?.().catch(() => {});
    enFullscreen.value = false;
  }
}

async function salirFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen?.().catch(() => {});
  }
  enFullscreen.value = false;
}

function descargar() {
  if (!actual.value) return;
  const a = document.createElement('a');
  a.href = actual.value.url;
  a.download = actual.value.titulo || actual.value.url.split('/').pop() || 'imagen';
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    if (document.fullscreenElement) return salirFullscreen();
    return cerrar();
  }
  if (e.key === 'ArrowLeft') { e.preventDefault(); previous(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  else if (e.key.toLowerCase() === 'f' && props.showFullscreen) toggleFullscreen();
  else if (e.key.toLowerCase() === 'd' && props.showDownload) descargar();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open && actual"
      ref="contenedor"
      class="gb-lightbox"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="gb-lightbox__barra">
        <div class="gb-lightbox__titulo">
          <strong>{{ actual.titulo || 'Imagen' }}</strong>
          <span v-if="items.length > 1">{{ indice + 1 }} / {{ items.length }}</span>
          <span v-if="actual.seccion" class="gb-lightbox__seccion">{{ actual.seccion }}</span>
        </div>
        <div class="gb-lightbox__acciones">
          <button v-if="props.showFullscreen" type="button" title="Pantalla completa (F)" @click="toggleFullscreen">⛶</button>
          <button v-if="props.showDownload" type="button" title="Descargar (D)" @click="descargar">⬇</button>
          <button type="button" title="Cerrar (Esc)" @click="cerrar">✕</button>
        </div>
      </div>

      <button v-if="hayPrev" type="button" class="gb-lightbox__nav gb-lightbox__nav--prev" title="Anterior (←)" @click="previous">‹</button>
      <GbZoomableImage ref="zoomable" :src="actual.url" :alt="actual.titulo" />
      <button v-if="hayNext" type="button" class="gb-lightbox__nav gb-lightbox__nav--next" title="Siguiente (→)" @click="next">›</button>

      <aside v-if="props.showMetadata && (actual.descripcion || actual.metadata.length)" class="gb-lightbox__metadata">
        <p v-if="actual.descripcion" class="gb-lightbox__descripcion">{{ actual.descripcion }}</p>
        <dl v-if="actual.metadata.length">
          <template v-for="(par, i) in actual.metadata" :key="i">
            <dt>{{ par.label }}</dt>
            <dd>{{ par.value }}</dd>
          </template>
        </dl>
      </aside>
    </div>
  </Teleport>
</template>
