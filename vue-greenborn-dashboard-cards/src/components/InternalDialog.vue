<template>
  <Teleport to="body">
    <div class="gdc-dialog-overlay" role="presentation" @pointerdown.self="emit('cerrar')">
      <div class="gdc-dialog" role="dialog" aria-modal="true" :aria-label="dialogo.titulo">
        <div class="gdc-dialog__header">
          <h3 class="gdc-dialog__title">{{ dialogo.titulo }}</h3>
          <button type="button" class="gdc-dialog__close" aria-label="Cerrar" @click="emit('cerrar')">×</button>
        </div>
        <div class="gdc-dialog__body">
          <component :is="dialogo.componente" :parametros="dialogo.props" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

defineProps({
  dialogo: { type: Object, required: true },
})
const emit = defineEmits(['cerrar'])

function tecla(event) {
  if (event.key === 'Escape') emit('cerrar')
}

onMounted(() => document.addEventListener('keydown', tecla))
onBeforeUnmount(() => document.removeEventListener('keydown', tecla))
</script>
