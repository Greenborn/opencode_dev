<script setup>
  import { ref } from 'vue'
  import GbDirectoryPicker from '../components/GbDirectoryPicker.vue'

  // Simula un filesystem: cada carpeta sabe su padre. cargarDirectorios()
  // filtra por padre y demora un poco para ver el estado "Cargando...".
  const CARPETAS = [
    { ruta: '/var', nombre: 'var', padre: null, tieneHijos: true },
    { ruta: '/home', nombre: 'home', padre: null, tieneHijos: true },
    { ruta: '/var/www', nombre: 'www', padre: '/var', tieneHijos: true },
    { ruta: '/var/log', nombre: 'log', padre: '/var', tieneHijos: false },
    { ruta: '/var/www/proyecto_1', nombre: 'proyecto_1', padre: '/var/www', tieneHijos: false },
    { ruta: '/var/www/proyecto_2', nombre: 'proyecto_2', padre: '/var/www', tieneHijos: false },
    { ruta: '/home/desarrollo', nombre: 'desarrollo', padre: '/home', tieneHijos: false },
  ]

  async function cargarDirectorios(nodoPadre) {
    await new Promise((r) => setTimeout(r, 300))
    const padre = nodoPadre ? nodoPadre.ruta : null
    return CARPETAS.filter((c) => c.padre === padre)
  }

  const elegida = ref('')
</script>

<template>
  <div style="font-family: sans-serif; max-width: 480px; margin: 24px auto;">
    <h1 style="font-size: 1.1rem;">vue-greenborn-directory-picker demo</h1>
    <p v-if="elegida">Última ruta elegida: <strong>{{ elegida }}</strong></p>
    <GbDirectoryPicker :cargar-directorios="cargarDirectorios" @seleccionar="elegida = $event" />
  </div>
</template>
