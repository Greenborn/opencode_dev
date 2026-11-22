<template>
  <div class="gmm-footer-bar">
    <button type="button" class="gmm-btn gmm-btn-secondary" @click="cancelar">Cancelar</button>
    <button
      type="button"
      class="gmm-btn gmm-btn-success"
      :disabled="estado.guardando"
      @click="guardar"
    >
      {{ estado.guardando ? 'Guardando…' : 'Guardar' }}
    </button>
  </div>
</template>

<script setup>
import { useModal } from '@greenborn/vue-greenborn-modal-manager'

const props = defineProps({
  parametros: { type: Object, required: true },
})

const { ocultar_modal } = useModal()
const estado = props.parametros._modalState

function guardar() {
  if (estado.guardar === null) {
    throw new Error('[crud] el formulario no registró su función guardar')
  }
  return estado.guardar()
}

function cancelar() {
  ocultar_modal(props.parametros._modal_cod)
}
</script>
