<template>
  <div class="form-row">
    <label for="demo-input">Ingrese un valor:</label>
    <input
      id="demo-input"
      v-model="valor"
      placeholder="Este valor se refleja en el modal padre"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps(['parametros'])
const valor = ref('')

watch(valor, (v) => {
  props.parametros.nivel1dato = v
})
</script>