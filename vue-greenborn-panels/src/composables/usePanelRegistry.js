import { shallowReactive } from 'vue'

// Registro singleton de tabs por "slot". Un slot es una ubicación concreta del
// layout (por ejemplo 'sidebarLeft', 'sidebarRight', 'devPanel', o cualquier
// identificador que el consumidor defina). Cualquier módulo puede registrar tabs
// en un slot y los paneles obtienen la lista fusionada/ordenada con
// `getTabs(slot)`.

// slots -> Map<string id, { id, label, component?, priority, ...meta }>
const slots = shallowReactive(new Map())

function validateTab(tab, slot, tabId) {
  if (!tab || !tab.id || !tab.label || typeof tab.priority !== 'number') {
    console.error(
      `[usePanelRegistry] Tab "${tab?.id || '(sin id)'}" de "${slot}" requiere id, label y priority numérico — se omite`
    )
    return false
  }
  return true
}

export function usePanelRegistry() {
  function registerTab(slot, tab) {
    if (!slot || !tab) return
    if (!validateTab(tab, slot, tab.id)) return
    if (!slots.has(slot)) slots.set(slot, [])
    const list = slots.get(slot)
    if (!list.find((t) => t.id === tab.id)) {
      list.push(tab)
    }
  }

  function getTabs(slot) {
    return slots.get(slot) || []
  }

  function hasSlot(slot) {
    return slots.has(slot) && slots.get(slot).length > 0
  }

  // Devuelve todas las tabs de un slot sin modificar la fuente (copia).
  function getTabsCopy(slot) {
    return (slots.get(slot) || []).slice()
  }

  return {
    slots,
    registerTab,
    getTabs,
    getTabsCopy,
    hasSlot,
  }
}