<template>
  <div class="gdc-card" :class="`gdc-card--ancho-${ancho}`">
    <div class="gdc-card__header">
      <span class="gdc-card__titulo">{{ titulo }}</span>
      <div class="gdc-card__acciones">
        <button
          v-if="puedeAgrandar"
          type="button"
          class="gdc-card__btn"
          title="Agrandar"
          @click="$emit('cambiar-ancho', Math.min(ancho + 1, 4))"
        >
          +
        </button>
        <button
          v-if="puedeAchicar"
          type="button"
          class="gdc-card__btn"
          title="Achicar"
          @click="$emit('cambiar-ancho', Math.max(ancho - 1, 1))"
        >
          −
        </button>
        <button
          type="button"
          class="gdc-card__btn"
          title="Ocultar"
          @click="$emit('ocultar')"
        >
          ×
        </button>
      </div>
    </div>
    <div class="gdc-card__body">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  titulo: { type: String, required: true },
  ancho: { type: Number, default: 1 },
})

defineEmits(['cambiar-ancho', 'ocultar'])

const puedeAgrandar = computed(() => props.ancho < 4)
const puedeAchicar = computed(() => props.ancho > 1)
</script>

<style scoped>
.gdc-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--gdc-border-color, #dee2e6);
  border-radius: 0.5rem;
  background: var(--gdc-card-bg, #fff);
  overflow: hidden;
}
.gdc-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--gdc-border-color, #dee2e6);
  font-weight: 600;
  font-size: 0.9rem;
}
.gdc-card__acciones {
  display: flex;
  gap: 0.25rem;
}
.gdc-card__btn {
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;
  font-size: 1rem;
  padding: 0 0.25rem;
  color: var(--gdc-muted-color, #6c757d);
}
.gdc-card__btn:hover {
  color: var(--gdc-text-color, #212529);
}
.gdc-card__body {
  padding: 0.75rem;
  flex: 1;
}
</style>
