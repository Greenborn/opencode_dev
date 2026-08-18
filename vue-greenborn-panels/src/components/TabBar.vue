<template>
  <div class="gp-tab-bar">
    <button
      v-for="(t, i) in tabs"
      :key="t.id"
      class="gp-tab-btn"
      :class="{ active: t.id === active, dragging: dragIndex === i, 'drag-over': dragOverIndex === i }"
      type="button"
      :draggable="draggable"
      @click="emit('select', t.id)"
      @dragstart="onDragStart(i, $event)"
      @dragover.prevent="onDragOver(i)"
      @drop.prevent="onDrop(i)"
      @dragend="onDragEnd"
    >{{ t.label }}</button>
  </div>
</template>

<script>
import { ref } from 'vue'

// Barra de tabs reordenable con drag & drop nativo (sin librerías externas).
// Es puramente presentacional: gestiona su propio estado visual de arrastre y
// emite `select(id)` y `reorder(fromIndex, toIndex)` para que el consumidor
// (normalmente `useTabController`) aplique la lógica de orden.
export default {
  name: 'TabBar',
  props: {
    tabs: { type: Array, default: () => [] },
    active: { type: String, default: null },
    draggable: { type: Boolean, default: true },
  },
  emits: ['select', 'reorder'],
  setup(props, { emit }) {
    const dragIndex = ref(null)
    const dragOverIndex = ref(null)

    function onDragStart(index, e) {
      dragIndex.value = index
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
    }

    function onDragOver(index) {
      dragOverIndex.value = index
    }

    function onDrop(index) {
      const from = dragIndex.value
      dragIndex.value = null
      dragOverIndex.value = null
      if (from === null || from === index) return
      emit('reorder', from, index)
    }

    function onDragEnd() {
      dragIndex.value = null
      dragOverIndex.value = null
    }

    return { dragIndex, dragOverIndex, onDragStart, onDragOver, onDrop, onDragEnd, emit }
  },
}
</script>