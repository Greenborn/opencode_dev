<template>
  <div class="gdc-form">
    <label class="gdc-form__check gdc-form__check--all">
      <input type="checkbox" :checked="todas" @change="elegirTodas($event.target.checked)" />
      <b>Seleccionar todas</b>
    </label>

    <div v-for="card in ocultas" :key="card.clave" class="gdc-form__check">
      <input v-model="seleccion" type="checkbox" :value="card.clave" />
      <span>{{ card.titulo }}</span>
    </div>

    <div class="gdc-form__footer">
      <button type="button" class="gdc-btn gdc-btn--secondary" @click="cerrar">Cancelar</button>
      <button type="button" class="gdc-btn gdc-btn--info" :disabled="!seleccion.length" @click="mostrar">
        Mostrar
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  parametros: { type: Object, required: true },
})

const ocultas = props.parametros.ocultas ?? []
const seleccion = ref([])
const todas = computed(() => ocultas.length > 0 && seleccion.value.length === ocultas.length)

function elegirTodas(marcar) {
  seleccion.value = marcar ? ocultas.map((c) => c.clave) : []
}

function cerrar() {
  props.parametros.cerrar?.()
}

function mostrar() {
  props.parametros.onMostrar?.([...seleccion.value])
  cerrar()
}
</script>
