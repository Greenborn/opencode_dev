<script setup>
import { ref, computed } from 'vue';
import { GaleriaGrid, GaleriaLightbox } from '../index.js';

// Demo standalone sin backend: imágenes remotas de ejemplo.
const imagenes = Array.from({ length: 12 }, (_, i) => ({
  url: `https://picsum.photos/id/${i + 10}/1200/800`,
  thumbnailUrl: `https://picsum.photos/id/${i + 10}/400/400`,
  title: `Imagen de ejemplo ${i + 1}`,
  caption: `Descripción opcional de la imagen ${i + 1}.`,
  section: i % 3 === 0 ? 'naturaleza' : 'ciudad',
  metadata: [
    { label: 'Fuente', value: 'picsum.photos' },
    { label: 'Id', value: String(i + 10) },
  ],
}));

const abierto = ref(false);
const indice = ref(0);
const columnas = ref(4);

const secciones = computed(() => [...new Set(imagenes.map((i) => i.section))]);

function seleccion(i) {
  indice.value = i;
  abierto.value = true;
}

// Demo de permissionsCheck (patrón RBAC opcional): comentar/descomentar para
// ver los botones de edición/eliminación en la grilla.
const permisosUsuario = ['galeria.ver', 'galeria.editar'];
function permissionsCheck(permiso) {
  return permisosUsuario.includes(permiso);
}
</script>

<template>
  <main class="demo">
    <h1>vue-greenborn-galeria-image &mdash; demo</h1>
    <p>
      Secciones: <button v-for="s in secciones" :key="s" type="button" class="demo-chip">{{ s }}</button>
      &nbsp;| Columnas:
      <input v-model.number="columnas" type="range" min="2" max="6" />
      {{ columnas }}
    </p>

    <GaleriaGrid
      :imagenes="imagenes"
      :columnas="columnas"
      mostrar-seccion
      :permissions-check="permissionsCheck"
      @select="seleccion"
      @edit="(img) => console.log('editar', img)"
      @delete="(img) => console.log('eliminar', img)"
    />

    <GaleriaLightbox
      v-model:open="abierto"
      v-model:index="indice"
      :imagenes="imagenes"
      :start-index="indice"
    />
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #121412;
  color: #e8e8e8;
}

.demo {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.demo-chip {
  background: #2a3a26;
  color: #bfe6b3;
  border: none;
  border-radius: 10px;
  padding: 2px 10px;
  cursor: pointer;
}
</style>
