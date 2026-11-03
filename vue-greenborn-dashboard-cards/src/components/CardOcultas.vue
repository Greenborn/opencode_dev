<template>
  <div class="gdc-card-celda gdc-card-celda--ancho-1 gdc-card-celda--ocultas" data-gdc-card-ocultas>
    <div class="gdc-card">
      <div class="gdc-card__header">
        <span class="gdc-card__titulo">Cards ocultas</span>
      </div>
      <div class="gdc-card__body gdc-card__body--center">
        <b class="gdc-ocultas__num">{{ ocultas.length }}</b>
        <button type="button" class="gdc-btn gdc-btn--info" @click="emit('abrir')">Mostrar cards</button>
        <small class="gdc-ocultas__texto">
          {{ ocultas.length === 1 ? '1 card que no se muestra' : `${ocultas.length} cards que no se muestran` }}
        </small>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  ocultas: { type: Array, required: true },
})
const emit = defineEmits(['abrir'])
</script>
