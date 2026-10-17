<template>
  <div class="gb-tree-view">
    <div v-if="cargando" class="gb-tree-view__estado">{{ textoCargando }}</div>
    <div v-else-if="error" class="gb-tree-view__estado gb-tree-view__estado--error">{{ error }}</div>
    <div v-else-if="raices.length === 0" class="gb-tree-view__estado">{{ textoVacio }}</div>
    <ul v-else class="gb-tree-view__raiz">
      <GbTreeNode
        v-for="raiz in raices"
        :key="raiz[campoId]"
        :nodo="raiz"
        :nivel="0"
        :cargar-nodos="cargarNodos"
        :campo-id="campoId"
        :campo-tiene-hijos="campoTieneHijos"
        :texto-cargando="textoCargando"
        :texto-sin-hijos="textoSinHijos"
        :seleccionado="seleccionado"
        @seleccionar="onSeleccionar"
        ref="nodosRaiz">
        <template v-if="$slots.nodo" #nodo="s"><slot name="nodo" v-bind="s" /></template>
        <template v-if="$slots.toggle" #toggle="s"><slot name="toggle" v-bind="s" /></template>
      </GbTreeNode>
    </ul>
  </div>
</template>

<script setup>
  // Vista de arbol generica con carga diferida: pide los nodos raiz al montar
  // y, por cada nodo que se expande, vuelve a invocar `cargarNodos` pasandole
  // el nodo padre (null para la raiz). No asume forma de dato ni backend: el
  // consumidor resuelve `cargarNodos` como quiera (axios, fetch, un array
  // local, etc.) y devuelve la lista de hijos.
  import { ref, onMounted, nextTick } from 'vue'
  import GbTreeNode from './GbTreeNode.vue'

  const props = defineProps({
    // async (nodoPadre: object|null) => array de nodos. nodoPadre es null
    // para pedir el nivel raiz.
    cargarNodos: { type: Function, required: true },
    // Campo que identifica de forma unica a cada nodo (para :key y seleccion).
    campoId: { type: String, default: 'id' },
    // Campo booleano que indica si el nodo tiene hijos (muestra el toggle de
    // expansion antes de cargar). Si el nodo no lo define, se asume true.
    campoTieneHijos: { type: String, default: 'tieneHijos' },
    textoCargando: { type: String, default: 'Cargando...' },
    textoVacio: { type: String, default: 'Sin elementos' },
    textoSinHijos: { type: String, default: 'Sin subelementos' },
  })
  const emit = defineEmits(['seleccionar'])

  const raices = ref([])
  const cargando = ref(true)
  const error = ref(null)
  const seleccionado = ref(null)
  const nodosRaiz = ref([])

  async function cargar() {
    cargando.value = true
    error.value = null
    try {
      raices.value = (await props.cargarNodos(null)) || []
    } catch (e) {
      error.value = e?.message || 'Error al cargar el árbol'
    } finally {
      cargando.value = false
    }
  }

  function onSeleccionar(nodo) {
    seleccionado.value = nodo
    emit('seleccionar', nodo)
  }

  // Recarga el nivel raiz y, de los nodos ya expandidos, sus hijos (sin
  // perder la expansion actual). Util tras un alta/edicion/borrado externo.
  async function refrescar() {
    await cargar()
    await nextTick()
    for (const nodo of nodosRaiz.value) await nodo?.refrescar?.()
  }

  defineExpose({ refrescar })

  onMounted(cargar)
</script>

<style scoped>
  .gb-tree-view {
    display: block;
  }

  .gb-tree-view__raiz {
    list-style: none;
    margin: 0;
    padding-left: 0;
  }

  .gb-tree-view__estado {
    color: var(--gb-tree-view-muted-color, #6c757d);
    font-size: 0.875rem;
    padding: 0.5rem;
  }

  .gb-tree-view__estado--error {
    color: var(--gb-tree-view-error-color, #dc3545);
  }
</style>
