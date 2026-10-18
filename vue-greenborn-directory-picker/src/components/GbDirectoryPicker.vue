<template>
  <div class="gb-directory-picker">
    <div class="gb-directory-picker__actual">
      <span class="gb-directory-picker__actual-label">Ruta seleccionada:</span>
      <span class="gb-directory-picker__actual-valor">{{ rutaSeleccionada || textoSinSeleccion }}</span>
    </div>
    <div class="gb-directory-picker__arbol">
      <GbTreeView
        :cargar-nodos="cargarDirectorios"
        :campo-id="campoRuta"
        :campo-tiene-hijos="campoTieneHijos"
        :texto-cargando="textoCargando"
        :texto-vacio="textoVacio"
        :texto-sin-hijos="textoSinHijos"
        @seleccionar="onSeleccionar">
        <template #nodo="{ nodo }">
          <span class="gb-directory-picker__nombre">{{ nodo[campoNombre] }}</span>
        </template>
      </GbTreeView>
    </div>
  </div>
</template>

<script setup>
  // Selector de directorios construido sobre vue-greenborn-tree-view: el
  // consumidor resuelve `cargarDirectorios(nodoPadre)` (nodoPadre null para
  // el nivel raiz) devolviendo los subdirectorios de ese nodo. El paquete no
  // sabe nada de filesystem real ni de backend concreto, solo muestra el
  // arbol y emite la ruta elegida al hacer click sobre un nodo.
  import { ref } from 'vue'
  import { GbTreeView } from 'vue-greenborn-tree-view'
  import 'vue-greenborn-tree-view/style.css'

  const props = defineProps({
    // async (nodoPadre: object|null) => array de nodos { [campoRuta], [campoNombre], [campoTieneHijos] }.
    cargarDirectorios: { type: Function, required: true },
    campoRuta: { type: String, default: 'ruta' },
    campoNombre: { type: String, default: 'nombre' },
    campoTieneHijos: { type: String, default: 'tieneHijos' },
    textoCargando: { type: String, default: 'Cargando...' },
    textoVacio: { type: String, default: 'Sin directorios' },
    textoSinHijos: { type: String, default: 'Sin subdirectorios' },
    textoSinSeleccion: { type: String, default: 'Ninguna' },
  })
  const emit = defineEmits(['seleccionar'])

  const rutaSeleccionada = ref('')

  function onSeleccionar(nodo) {
    rutaSeleccionada.value = nodo[props.campoRuta]
    emit('seleccionar', rutaSeleccionada.value)
  }
</script>

<style scoped>
  .gb-directory-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .gb-directory-picker__actual {
    font-size: 0.875rem;
    color: var(--gb-directory-picker-muted-color, #6c757d);
  }

  .gb-directory-picker__actual-valor {
    color: var(--gb-directory-picker-valor-color, #212529);
    font-weight: 600;
    word-break: break-all;
  }

  .gb-directory-picker__arbol {
    max-height: 320px;
    overflow: auto;
    border: 1px solid var(--gb-directory-picker-border-color, #dee2e6);
    border-radius: 0.25rem;
    padding: 0.35rem;
  }

  .gb-directory-picker__nombre {
    word-break: break-all;
  }
</style>
