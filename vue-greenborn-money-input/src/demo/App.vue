<script setup>
import { ref } from 'vue'
import GbMoneyInput from '../components/GbMoneyInput.vue'

const monto = ref(1234.5)
</script>

<template>
  <div style="font-family: sans-serif; max-width: 480px; margin: 24px auto;">
    <h1 style="font-size: 1.1rem;">vue-greenborn-money-input demo</h1>
    <GbMoneyInput v-model="monto" />
    <p>Valor numérico: {{ monto }}</p>
  </div>
</template>
