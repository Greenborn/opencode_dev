<script setup>
  import { ref } from 'vue'
  import GbTreeView from '../components/GbTreeView.vue'

  // Datos de ejemplo planos, como si vinieran de una tabla con parentId.
  // cargarNodos() simula un backend: filtra por padre y demora un poco para
  // que se vea el estado "Cargando...".
  const DATOS = [
    { id: '1', name: 'Alimentos', parentId: null, tieneHijos: true, cantProductos: 0 },
    { id: '2', name: 'Bebidas', parentId: null, tieneHijos: true, cantProductos: 0 },
    { id: '3', name: 'Limpieza', parentId: null, tieneHijos: false, cantProductos: 48 },
    { id: '11', name: 'Lácteos', parentId: '1', tieneHijos: true, cantProductos: 0 },
    { id: '12', name: 'Panificados', parentId: '1', tieneHijos: false, cantProductos: 23 },
    { id: '111', name: 'Quesos', parentId: '11', tieneHijos: false, cantProductos: 15 },
    { id: '112', name: 'Yogures', parentId: '11', tieneHijos: false, cantProductos: 9 },
    { id: '21', name: 'Gaseosas', parentId: '2', tieneHijos: false, cantProductos: 31 },
    { id: '22', name: 'Jugos', parentId: '2', tieneHijos: false, cantProductos: 12 },
  ]

  async function cargarNodos(nodoPadre) {
    await new Promise((r) => setTimeout(r, 400))
    const parentId = nodoPadre ? nodoPadre.id : null
    return DATOS.filter((d) => d.parentId === parentId)
  }

  const seleccionado = ref(null)
  const arbol = ref(null)
</script>

<template>
  <div style="font-family: sans-serif; max-width: 480px; margin: 24px auto;">
    <h1 style="font-size: 1.1rem;">vue-greenborn-tree-view demo</h1>

    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
      <button @click="arbol?.refrescar()">Refrescar</button>
      <span v-if="seleccionado">Seleccionado: <strong>{{ seleccionado.name }}</strong></span>
    </div>

    <GbTreeView ref="arbol" :cargar-nodos="cargarNodos" @seleccionar="seleccionado = $event">
      <template #nodo="{ nodo }">
        {{ nodo.name }}
        <span v-if="nodo.cantProductos" style="background:#e9ecef; border-radius:999px; padding:0 8px; font-size:.75rem; margin-left:6px;">
          {{ nodo.cantProductos }} prod.
        </span>
      </template>
    </GbTreeView>
  </div>
</template>
