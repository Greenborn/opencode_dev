<template>
  <div style="max-width: 900px; margin: 2rem auto; font-family: sans-serif">
    <h1>Demo: vue-greenborn-dashboard-cards</h1>
    <DashboardCardsGrid :cards="cards" :contexto="contexto" />
  </div>
</template>

<script setup>
import { reactive, h } from 'vue'
import { DashboardCardsGrid, Sparkline } from '../index.js'

const CardDemoA = {
  setup() {
    return () =>
      h('div', [
        h('div', { style: 'font-size:1.5rem;font-weight:bold' }, '42%'),
        h(Sparkline, { valores: [10, 20, 15, 30, 25, 40, 35], max: 100 }),
      ])
  },
}

const CardDemoB = {
  setup() {
    return () => h('p', 'Contenido de ejemplo B')
  },
}

const cards = reactive([
  { clave: 'demo-a', titulo: 'Card A', categorias: ['ejemplo'], anchoDefault: 1, componente: CardDemoA },
  { clave: 'demo-b', titulo: 'Card B', categorias: ['ejemplo'], anchoDefault: 2, componente: CardDemoB },
])

const contexto = {
  tienePermiso: () => true,
  preferencias: null,
}
</script>
