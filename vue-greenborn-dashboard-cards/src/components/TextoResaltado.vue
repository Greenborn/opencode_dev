<template>
  <span class="gdc-texto-resaltado"><template v-for="(p, i) in tramos" :key="i"><mark v-if="p.marca" class="gdc-coincidencia">{{ p.texto }}</mark><template v-else>{{ p.texto }}</template></template></span>
</template>

<script setup>
import { computed, inject, watchEffect, onBeforeUnmount, ref } from 'vue'
import { CLAVE_FILTRO, CLAVE_TEXTOS_CARD, partes } from '../composables/useDashboardFilter.js'

const props = defineProps({ texto: { type: String, default: '' } })

const filtro = inject(CLAVE_FILTRO, ref(''))
const textos = inject(CLAVE_TEXTOS_CARD, null)
const id = Symbol('texto')

const tramos = computed(() => partes(props.texto, filtro.value))

// Fuera de una card (o en un modal) no hay dónde anotarse: sólo resalta.
if (textos) {
  watchEffect(() => textos.set(id, props.texto))
  onBeforeUnmount(() => textos.delete(id))
}
</script>
