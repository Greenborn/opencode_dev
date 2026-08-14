<template>
  <div class="demo">
    <h1>vue-greenborn-modal-manager</h1>
    <p>Modales anidados, pasaje de parámetros y helpers, sin Pinia ni Bootstrap.</p>

    <div class="row">
      <button class="gmm-btn gmm-btn-primary" @click="abrir_nivel1">Abrir modal (nivel 1)</button>
      <button class="gmm-btn gmm-btn-success" @click="mostrar_alerta('Hola desde gmm')">Alerta</button>
      <button class="gmm-btn gmm-btn-warn" @click="mostrar_confirm(demoConfirm)">Confirmación</button>
    </div>

    <ModalContainer />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useModal, ModalContainer, ModalFooter } from '../index.js'
import Nivel1 from './components/Nivel1.vue'
import Nivel2 from './components/Nivel2.vue'
import Nivel2Header from './components/Nivel2Header.vue'

const { mostrar_modal, ocultar_modal, mostrar_alerta, mostrar_confirm } = useModal()

const nivel1dato = ref('sin resultados')

const demoConfirm = {
  title: 'Atención',
  text: '¿Confirmás la acción?',
  confirmar_accion: () => {
    mostrar_alerta('Acción confirmada')
  },
  no_confirma_accion: () => {
    mostrar_alerta('Acción cancelada')
  },
}

function abrir_nivel1() {
  mostrar_modal(Nivel1, 'Nivel 1', { nivel1dato, abrir_nivel2 }, { size: 'lg' })
}

function abrir_nivel2() {
  mostrar_modal(
    { body: Nivel2, header: Nivel2Header, footer: ModalFooter },
    'Nivel 2 (anidado)',
    {
      nivel1dato,
      _callback_guardar: async (p) => {
        mostrar_alerta('Guardado nivel 2')
        ocultar_modal(p._modal_cod)
      },
    },
    { size: 'md', dismissableMask: true }
  )
}
</script>