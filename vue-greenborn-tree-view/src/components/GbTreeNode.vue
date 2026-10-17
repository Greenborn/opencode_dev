<template>
  <li class="gb-tree-view__nodo">
    <div
      class="gb-tree-view__fila"
      :class="{ 'gb-tree-view__fila--seleccionado': esSeleccionado }"
      @click="seleccionar">
      <span class="gb-tree-view__toggle" @click.stop="toggle">
        <slot name="toggle" :nodo="nodo" :abierto="abierto" :tiene-hijos="tieneHijosNodo">
          <i
            v-if="tieneHijosNodo"
            class="gb-tree-view__icono"
            :class="abierto ? 'gb-tree-view__icono--abierto' : 'gb-tree-view__icono--cerrado'"></i>
          <i v-else class="gb-tree-view__icono gb-tree-view__icono--hoja"></i>
        </slot>
      </span>
      <span class="gb-tree-view__contenido">
        <slot name="nodo" :nodo="nodo" :nivel="nivel" :abierto="abierto" :seleccionado="esSeleccionado">
          {{ nodo.label ?? nodo.name ?? nodo[campoId] }}
        </slot>
      </span>
    </div>

    <ul v-if="abierto" class="gb-tree-view__hijos">
      <li v-if="cargando" class="gb-tree-view__estado gb-tree-view__estado--hijo">{{ textoCargando }}</li>
      <li v-else-if="error" class="gb-tree-view__estado gb-tree-view__estado--hijo gb-tree-view__estado--error">{{ error }}</li>
      <li v-else-if="hijos.length === 0" class="gb-tree-view__estado gb-tree-view__estado--hijo">{{ textoSinHijos }}</li>
      <GbTreeNode
        v-for="hijo in hijos"
        :key="hijo[campoId]"
        :nodo="hijo"
        :nivel="nivel + 1"
        :cargar-nodos="cargarNodos"
        :campo-id="campoId"
        :campo-tiene-hijos="campoTieneHijos"
        :texto-cargando="textoCargando"
        :texto-sin-hijos="textoSinHijos"
        :seleccionado="seleccionado"
        @seleccionar="$emit('seleccionar', $event)">
        <template v-if="$slots.nodo" #nodo="s"><slot name="nodo" v-bind="s" /></template>
        <template v-if="$slots.toggle" #toggle="s"><slot name="toggle" v-bind="s" /></template>
      </GbTreeNode>
    </ul>
  </li>
</template>

<script setup>
  // Nodo recursivo de GbTreeView. No se exporta desde el paquete: se usa
  // siempre a traves de GbTreeView, que es quien carga el nivel raiz.
  import { ref, computed } from 'vue'

  const props = defineProps({
    nodo: { type: Object, required: true },
    nivel: { type: Number, default: 0 },
    cargarNodos: { type: Function, required: true },
    campoId: { type: String, default: 'id' },
    campoTieneHijos: { type: String, default: 'tieneHijos' },
    textoCargando: { type: String, default: 'Cargando...' },
    textoSinHijos: { type: String, default: 'Sin subelementos' },
    seleccionado: { type: Object, default: null },
  })
  const emit = defineEmits(['seleccionar'])

  const abierto = ref(false)
  const cargando = ref(false)
  const hijos = ref([])
  const cargado = ref(false)
  const error = ref(null)

  // Si el nodo no informa el campo (p.ej. el backend no precalculo si tiene
  // hijos), se asume expandible: al abrirlo se intenta cargar y, si no trae
  // nada, se muestra "Sin subelementos" en lugar de ocultar el toggle.
  const tieneHijosNodo = computed(() => {
    const v = props.nodo[props.campoTieneHijos]
    return v === undefined ? true : !!v
  })

  const esSeleccionado = computed(() =>
    !!props.seleccionado && props.seleccionado[props.campoId] === props.nodo[props.campoId])

  function seleccionar() {
    emit('seleccionar', props.nodo)
  }

  async function toggle() {
    if (!tieneHijosNodo.value) return
    abierto.value = !abierto.value
    if (abierto.value && !cargado.value) await cargarHijos()
  }

  async function cargarHijos() {
    cargando.value = true
    error.value = null
    try {
      hijos.value = (await props.cargarNodos(props.nodo)) || []
      cargado.value = true
    } catch (e) {
      error.value = e?.message || 'Error al cargar'
    } finally {
      cargando.value = false
    }
  }

  // Permite a GbTreeView forzar un refresco completo del arbol: cada nodo
  // abierto vuelve a pedir sus hijos, descartando la cache previa.
  async function refrescar() {
    cargado.value = false
    hijos.value = []
    if (abierto.value) await cargarHijos()
  }

  defineExpose({ refrescar })
</script>

<style scoped>
  .gb-tree-view__nodo {
    list-style: none;
  }

  .gb-tree-view__hijos {
    list-style: none;
    margin: 0;
    padding-left: 1.25rem;
  }

  .gb-tree-view__fila {
    display: flex;
    align-items: center;
    padding: 0.2rem 0.35rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .gb-tree-view__fila:hover {
    background-color: var(--gb-tree-view-hover-bg, #f1f3f5);
  }

  .gb-tree-view__fila--seleccionado {
    background-color: var(--gb-tree-view-selected-bg, #cfe2ff);
  }

  .gb-tree-view__toggle {
    width: 1.25rem;
    display: inline-flex;
    justify-content: center;
    color: var(--gb-tree-view-toggle-color, #6c757d);
  }

  .gb-tree-view__icono::before {
    content: '';
    display: inline-block;
    width: 0.55rem;
    height: 0.55rem;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
  }

  .gb-tree-view__icono--cerrado::before {
    transform: rotate(-45deg) translate(-1px, -1px);
  }

  .gb-tree-view__icono--abierto::before {
    transform: rotate(45deg);
  }

  .gb-tree-view__icono--hoja::before {
    width: 0.3rem;
    height: 0.3rem;
    border-radius: 50%;
    border: none;
    background: currentColor;
    transform: none;
  }

  .gb-tree-view__contenido {
    flex: 1;
  }

  .gb-tree-view__estado {
    color: var(--gb-tree-view-muted-color, #6c757d);
    font-size: 0.875rem;
    padding: 0.35rem 0.5rem;
  }

  .gb-tree-view__estado--hijo {
    padding-left: 1.25rem;
  }

  .gb-tree-view__estado--error {
    color: var(--gb-tree-view-error-color, #dc3545);
  }
</style>
