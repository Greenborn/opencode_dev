import { ref } from 'vue'

// Estado de layout de paneles: colapso y tamaños de los paneles lateral izq,
// lateral der, inferior (dev) y central. Extraído y genericizado del store `ui.js`
// de la aplicación de origen, pero SIN Pinia: el estado vive en scope de módulo
// (singleton), de modo que cualquier componente que invoque `useLayoutState()`
// comparte la misma instancia.
//
// La persistencia es inyectable a través de `options.persist`/`hydrate`, por si el
// consumidor quiere guardar/leer preferencias (p. ej. un servicio de settings).
// Sin adaptador, todo queda en memoria.

const defaultPersistKeys = [
  'sidebarCollapsed',
  'sidebarWidth',
  'panelCollapsed',
  'panelHeight',
  'rightPanelCollapsed',
  'rightPanelWidth',
  'centralPanelCollapsed',
  'sidebarWidthPct',
]

let persistAdapter = null
let hydrateAdapter = null
let loaded = false

const state = {
  sidebarCollapsed: ref(false),
  sidebarWidth: ref(220),
  panelCollapsed: ref(false),
  panelHeight: ref(250),
  rightPanelCollapsed: ref(true),
  rightPanelWidth: ref(220),
  centralPanelCollapsed: ref(false),
  sidebarWidthPct: ref(50),
}

export function useLayoutState(options = {}) {
  if (options.persist) persistAdapter = options.persist
  if (options.hydrate) hydrateAdapter = options.hydrate

  function toggle(key) {
    state[key].value = !state[key].value
    save()
  }

  function set(key, value) {
    state[key].value = value
    save()
  }

  function setSidebarWidthPct(val) {
    state.sidebarWidthPct.value = Math.max(5, Math.min(95, Number(val)))
    save()
  }

  function reset() {
    state.sidebarCollapsed.value = false
    state.sidebarWidth.value = 220
    state.panelCollapsed.value = false
    state.panelHeight.value = 250
    state.rightPanelCollapsed.value = true
    state.rightPanelWidth.value = 220
    state.centralPanelCollapsed.value = false
    state.sidebarWidthPct.value = 50
    save()
  }

  async function save() {
    if (!persistAdapter) return
    try {
      const entries = {}
      for (const key of defaultPersistKeys) {
        entries[key] = state[key].value
      }
      await persistAdapter(entries)
    } catch (err) {
      console.error('[useLayoutState] Error al guardar preferencias de layout:', err)
    }
  }

  async function load() {
    if (!hydrateAdapter || loaded) return
    loaded = true
    try {
      const data = await hydrateAdapter()
      if (!data) return
      for (const key of defaultPersistKeys) {
        const val = data[key]
        if (val !== undefined && val !== null && key in state) {
          state[key].value = val
        }
      }
    } catch (err) {
      console.error('[useLayoutState] Error al cargar preferencias de layout:', err)
    }
  }

  function key(keyName) {
    return state[keyName]
  }

  return {
    ...state,
    toggle,
    set,
    setSidebarWidthPct,
    reset,
    save,
    load,
    key,
  }
}