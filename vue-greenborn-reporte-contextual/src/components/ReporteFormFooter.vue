<template>
  <div class="rc-footer">
    <button type="button" class="gmm-btn gmm-btn-secondary" @click="cancelar">Cancelar</button>
    <button type="submit" form="rc-form" class="gmm-btn gmm-btn-success" :disabled="parametros.estado.enviando">
      {{ parametros.estado.enviando ? 'Enviando…' : 'Enviar reporte' }}
    </button>
  </div>
</template>

<script setup>
import { useModal } from 'vue-greenborn-modal-manager'

const props = defineProps({
  parametros: { type: Object, required: true },
})

const { ocultar_modal } = useModal()

function cancelar() {
  ocultar_modal(props.parametros._modal_cod)
}
</script>
