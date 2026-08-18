<template>
  <div class="demo-app">
    <header class="demo-header">
      <h1>vue-greenborn-panels — demo</h1>
      <p>Tabs reordenables (drag &amp; drop), registry por slot, colapso/resize sin Pinia.</p>
      <div class="demo-toolbar">
        <label>
          <input type="checkbox" v-model="layoutState.sidebarCollapsed.value" @change="layoutState.toggle('sidebarCollapsed')" />
          Collapsar sidebar izq
        </label>
        <label>
          <input type="checkbox" v-model="layoutState.rightPanelCollapsed.value" @change="layoutState.toggle('rightPanelCollapsed')" />
          Collapsar sidebar der
        </label>
        <label>
          <input type="checkbox" v-model="layoutState.panelCollapsed.value" @change="layoutState.toggle('panelCollapsed')" />
          Collapsar dev panel
        </label>
        <label>
          <input type="checkbox" v-model="hideSecondTab" />
          Ocultar la 2ª tab (filtro)
        </label>
      </div>
    </header>

    <div class="demo-body">
      <!-- Panel izquierdo -->
      <ResizablePanel
        side="left"
        :collapsed="layoutState.sidebarCollapsed.value"
        :size="layoutState.sidebarWidth.value"
        @update:size="(v) => layoutState.set('sidebarWidth', v)"
      >
        <TabPanel
          :tabs="left.localTabs.value"
          :active="left.activeTab.value"
          @select="left.select"
          @reorder="left.reorder"
        />
      </ResizablePanel>

      <!-- Centro -->
      <main class="demo-center">
        <h3>Contenido central</h3>
        <p class="muted">Área sin tabs (se puede incrustar el panel central de tu app).</p>
      </main>

      <!-- Panel derecho -->
      <ResizablePanel
        side="right"
        :collapsed="layoutState.rightPanelCollapsed.value"
        :size="layoutState.rightPanelWidth.value"
        @update:size="(v) => layoutState.set('rightPanelWidth', v)"
      >
        <TabPanel
          :tabs="right.localTabs.value"
          :active="right.activeTab.value"
          @select="right.select"
          @reorder="right.reorder"
          :keep-alive="true"
        />
      </ResizablePanel>
    </div>

    <!-- Panel inferior (dev) -->
    <ResizablePanel
      class="demo-bottom"
      side="bottom"
      :collapsed="layoutState.panelCollapsed.value"
      :size="layoutState.panelHeight.value"
      @update:size="(v) => layoutState.set('panelHeight', v)"
    >
      <TabPanel
        :tabs="dev.localTabs.value"
        :active="dev.activeTab.value"
        @select="dev.select"
        @reorder="dev.reorder"
      />
    </ResizablePanel>
  </div>
</template>

<script>
import { h, ref, watch } from 'vue'
import {
  TabPanel,
  ResizablePanel,
  usePanelRegistry,
  useTabController,
  useLayoutState,
} from '../index.js'
import DemoTab from './components/DemoTab.vue'

function makeTab(title, text, color) {
  return { render: () => h(DemoTab, { title, text, color }) }
}

// Fábrica del controlador de tabs de un slot con persistencia del orden en
// localStorage (ejemplo de adaptador; la librería es agnóstica).
function buildController(slot, builtin, storageKey) {
  const registry = usePanelRegistry()
  const slotTabs = ref(registry.getTabs(slot))
  const savedOrder = ref(null)
  try {
    const raw = localStorage.getItem(storageKey)
    savedOrder.value = raw ? JSON.parse(raw) : null
  } catch (err) {
    console.log('No se pudo leer orden guardado', storageKey, err)
  }
  return useTabController({
    slotTabs,
    builtinTabs: builtin,
    savedOrder,
    filterTab: (t) => !filterOut.value.includes(t.id),
    watchFilter: [filterOut],
    persistOrder: (ids) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids))
      } catch (err) {
        console.log('No se pudo guardar orden', storageKey, err)
      }
    },
    initialTab: builtin[0]?.id,
  })
}

const filterOut = ref([])

const registry = usePanelRegistry()
// sidebar izquierdo
registry.registerTab('sidebarLeft', { id: 'chat', label: 'Chat', component: makeTab('Chat', 'Mensajes y sesiones.', '#75aadb'), priority: 10 })
registry.registerTab('sidebarLeft', { id: 'archivos', label: 'Archivos', component: makeTab('Archivos', 'Explorador de archivos.', '#22c55e'), priority: 20 })
// sidebar derecho
registry.registerTab('sidebarRight', { id: 'detalle', label: 'Detalle', component: makeTab('Detalle', 'Datos del elemento.', '#75aadb'), priority: 10 })
registry.registerTab('sidebarRight', { id: 'historial', label: 'Historial', component: makeTab('Historial', 'Registro de eventos.', '#eab308'), priority: 20 })
registry.registerTab('sidebarRight', { id: 'metrics', label: 'Métricas', component: makeTab('Métricas', 'Indicadores en vivo.', '#a855f7'), priority: 30 })
// dev panel
registry.registerTab('devPanel', { id: 'console', label: 'Consola', component: makeTab('Consola', 'Salida del proceso.', '#22c55e'), priority: 10 })
registry.registerTab('devPanel', { id: 'network', label: 'Red', component: makeTab('Red', 'Peticiones HTTP.', '#3b82f6'), priority: 20 })
registry.registerTab('devPanel', { id: 'terminal', label: 'Terminal', component: makeTab('Terminal', 'Shell interactivo.', '#00d4ff'), priority: 30 })

// Estado de layout con persistencia en localStorage (adaptador opcional).
const layoutState = useLayoutState({
  persist: async (entries) => {
    try {
      localStorage.setItem('gp-layout', JSON.stringify(entries))
    } catch (err) {
      console.log('No se pudo guardar layout', err)
    }
  },
  hydrate: async () => {
    try {
      const raw = localStorage.getItem('gp-layout')
      return raw ? JSON.parse(raw) : null
    } catch (err) {
      console.log('No se pudo leer layout', err)
      return null
    }
  },
})

const left = buildController('sidebarLeft', [], 'gp-order-left')
const right = buildController('sidebarRight', [], 'gp-order-right')
const dev = buildController('devPanel', [], 'gp-order-dev')

export default {
  name: 'DemoApp',
  components: { TabPanel, ResizablePanel },
  setup() {
    const hideSecondTab = ref(false)
    // Filtro de ejemplo: oculta la segunda tab del sidebar derecho.
    watch(hideSecondTab, (val) => {
      filterOut.value = val ? ['historial'] : []
    })
    return { layoutState, left, right, dev, hideSecondTab }
  },
}
</script>

<style>
body {
  margin: 0;
  background: #0f1626;
  font-family: system-ui, -apple-system, sans-serif;
  color: #e0e0e0;
}
#app {
  height: 100vh;
}
.demo-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.demo-header {
  padding: 12px 16px;
  border-bottom: 1px solid #374151;
  background: #1a1a2e;
}
.demo-header h1 {
  font-size: 1.1rem;
  margin: 0 0 4px;
  color: #75aadb;
}
.demo-header p {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: #9ca3af;
}
.demo-toolbar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.75rem;
}
.demo-toolbar label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.demo-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.demo-center {
  flex: 1 1 auto;
  min-width: 0;
  padding: 16px;
  overflow: auto;
}
.demo-center h3 {
  color: #75aadb;
}
.muted {
  color: #9ca3af;
}
.demo-bottom {
  flex: 0 0 auto;
  height: 200px;
}
</style>