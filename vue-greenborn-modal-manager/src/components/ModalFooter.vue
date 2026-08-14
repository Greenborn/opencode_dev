<template>
  <div class="gmm-footer-bar">
    <template v-if="parametros.botones_footer">
      <button
        v-for="(btn, i) in parametros.botones_footer"
        :key="i"
        type="button"
        class="gmm-btn"
        :class="`gmm-btn-${btn.severity || 'primary'}`"
        :autofocus="btn.autofocus"
        :disabled="btn.disabled"
        @click="btn.onClick"
      >
        {{ btn.label }}
      </button>
    </template>
    <template v-else>
      <button type="button" class="gmm-btn gmm-btn-secondary" @click="cancelar">
        Cancelar
      </button>
      <button type="button" class="gmm-btn gmm-btn-success" @click="guardar">
        {{ parametros.action === 'edit' ? 'Guardar' : 'Nuevo' }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { useModal } from '../composables/useModal'

const props = defineProps(['parametros'])
const { ocultar_modal } = useModal()

function cancelar() {
  ocultar_modal(props.parametros._modal_cod)
}

async function guardar() {
  return await props.parametros._callback_guardar(props.parametros)
}
</script>