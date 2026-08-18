import { ref, shallowRef, watch } from 'vue'
import { sortTabs } from '../utils/sortTabs.js'

// Controlador de tabs: extrae y unifica la lógica compartida por todos los
// paneles con pestañas (SidebarChat/SidebarRight/DevPanel en la app de origen):
//   - fusiona tabs built-in + tabs del registry de un slot
//   - las ordena con `sortTabs` (priority + orden guardado)
//   - aplica un filtro opcional (p. ej. "componentes activos")
//   - mantiene la tab activa, permitiendo restaurarla desde prefs de sesión
//   - drag & drop nativo para reordenar
// La persistencia y el filtrado quedan inyectados por el consumidor: el paquete
// no asume Pinia ni ningún servicio de guardado.

export function useTabController(options) {
  const {
    // Ref o array con las tabs registradas para este slot.
    slotTabs = [],
    // Tabs built-in del panel (id, label, component, priority).
    builtinTabs = [],
    // Orden guardado (Ref de array de ids) — opcional.
    savedOrder = null,
    // Filtro opcional: (tab) => boolean.
    filterTab = null,
    // Fuentes reactivas que, al cambiar, disparan un rebuild de las tabs
    // (p. ej. el estado de "componentes activos" del consumidor).
    watchFilter = [],
    // Callback al reordenar: (ids) => void.
    persistOrder = null,
    // Tab inicial / restaurada desde prefs de sesión.
    initialTab = null,
    // Función opcional para restaurar la tab activa ante un contexto nuevo.
    restoreTab = null,
  } = options || {}

  const activeTab = ref(initialTab || builtinTabs[0]?.id || slotTabs.value?.[0]?.id || null)
  if (restoreTab) {
    const restored = restoreTab()
    if (restored) activeTab.value = restored
  }

  const localTabs = shallowRef([])
  const dragIndex = ref(null)
  const dragOverIndex = ref(null)

  function buildTabs() {
    const all = [...builtinTabs]
    const src = Array.isArray(slotTabs)
      ? slotTabs
      : slotTabs?.value || []
    for (const t of src) all.push(t)

    let sorted = sortTabs(all, savedOrder?.value || null)
    if (filterTab) {
      sorted = sorted.filter(filterTab)
    }
    localTabs.value = sorted

    if (activeTab.value && sorted.length && !sorted.find((t) => t.id === activeTab.value)) {
      activeTab.value = sorted[0].id
    }
    return sorted
  }

  function select(tabId) {
    activeTab.value = tabId
  }

  function saveOrder(ids) {
    if (!savedOrder?.value) return
    savedOrder.value = ids
    if (persistOrder) persistOrder(ids)
  }

  function onDragStart(index, e) {
    dragIndex.value = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  // Reordena la tab de `from` a `to` y persiste el nuevo orden. Es el método que
  // normalmente conecta el evento `reorder` de `TabBar`.
  function reorder(from, to) {
    if (from === null || to === null || from === to) return
    const items = [...localTabs.value]
    const [moved] = items.splice(from, 1)
    items.splice(to, 0, moved)
    localTabs.value = items
    saveOrder(items.map((t) => t.id))
  }

  function onDragOver(index) {
    dragOverIndex.value = index
  }

  function onDrop(index) {
    if (dragIndex.value === null || dragIndex.value === index) {
      dragIndex.value = null
      dragOverIndex.value = null
      return
    }
    reorder(dragIndex.value, index)
    dragIndex.value = null
    dragOverIndex.value = null
  }

  function onDragEnd() {
    dragIndex.value = null
    dragOverIndex.value = null
  }

  // Reacciona a cambios del registry / orden guardado / filtro.
  watch(slotTabs, () => buildTabs(), { immediate: true })
  watch(savedOrder, () => buildTabs())
  if (Array.isArray(watchFilter)) {
    for (const src of watchFilter) {
      watch(src, () => buildTabs(), { deep: true })
    }
  }

  return {
    activeTab,
    localTabs,
    dragIndex,
    dragOverIndex,
    buildTabs,
    select,
    saveOrder,
    reorder,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }
}