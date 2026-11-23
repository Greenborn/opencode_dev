<script setup>
import { computed, ref, watch } from 'vue';
import { MapViewerComponent } from '@greenborn/vue-greenborn-map-viewer';
import { localesAPuntos, urlComoLlegar, direccionLegible, terminosCompletos } from './logica.js';

const props = defineProps({
  locales: { type: Array, default: () => [] },
  terminos: { type: Object, default: () => ({}) },
  seleccionado: { type: [Number, String], default: null },
});
const emit = defineEmits(['seleccionar']);

const mapa = ref(null);
const term = computed(() => terminosCompletos(props.terminos));
const puntos = computed(() => localesAPuntos(props.locales));
const sinUbicacion = computed(() => props.locales.length - puntos.value.length);

watch(() => props.seleccionado, (id) => {
  if (id != null && mapa.value && typeof mapa.value.resaltarPunto === 'function') mapa.value.resaltarPunto(id);
});

function seleccionar(local) {
  emit('seleccionar', local);
}
</script>

<template>
  <section class="locales-mapa">
    <h2 class="locales-mapa__titulo">{{ term.plural.charAt(0).toUpperCase() + term.plural.slice(1) }}</h2>

    <p v-if="!locales.length" class="locales-mapa__vacio">Todavía no hay {{ term.plural }} publicados.</p>

    <MapViewerComponent v-if="puntos.length" ref="mapa" :puntos="puntos" :label-accesibilidad="`Mapa de ${term.plural}`" class="locales-mapa__mapa" />

    <p v-if="sinUbicacion > 0" class="locales-mapa__aviso">
      {{ sinUbicacion }} {{ sinUbicacion === 1 ? term.singular : term.plural }} sin ubicación en el mapa.
    </p>

    <ul class="locales-mapa__lista">
      <li v-for="local in locales" :key="local.id" :class="{ 'locales-mapa__item--activo': local.id === seleccionado }">
        <button type="button" class="locales-mapa__item" @click="seleccionar(local)">
          <span>{{ direccionLegible(local) || `${term.singular} ${local.id}` }}</span>
        </button>
        <a v-if="urlComoLlegar(local.latitud, local.longitud)" :href="urlComoLlegar(local.latitud, local.longitud)" target="_blank" rel="noopener">
          Cómo llegar
        </a>
      </li>
    </ul>
  </section>
</template>
