<template>
  <div class="gp-tab-panel">
    <TabBar
      v-if="showTabBar"
      class="gp-tab-panel__bar"
      :tabs="tabs"
      :active="active"
      :draggable="draggable"
      @select="onSelect"
      @reorder="onReorder"
    />
    <div class="gp-tab-panel__body">
      <slot name="default" v-bind="{ tabs, active }">
        <KeepAlive v-if="keepAlive" :max="keepAliveMax" :include="keepAliveInclude" :exclude="keepAliveExclude">
          <component :is="activeComponent" v-if="activeComponent" :key="active" />
        </KeepAlive>
        <component :is="activeComponent" v-else-if="activeComponent" :key="active" />
      </slot>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import TabBar from './TabBar.vue'

// Panel con pestañas: renderiza una `TabBar` + el componente de la tab activa.
// Recibe la lista de tabs ya ordenada/filtrada y el estado de activo desde un
// `useTabController` (o directamente del consumidor). El `default` slot permite
// reemplazar por completo el cuerpo (p. ej. para inyectar sesión/contexto).
export default {
  name: 'TabPanel',
  components: { TabBar },
  props: {
    tabs: { type: Array, default: () => [] },
    active: { type: String, default: null },
    showTabBar: { type: Boolean, default: true },
    draggable: { type: Boolean, default: true },
    keepAlive: { type: Boolean, default: false },
    keepAliveMax: { type: Number, default: 6 },
    keepAliveInclude: { type: [Array, RegExp, String], default: null },
    keepAliveExclude: { type: [Array, RegExp, String], default: null },
  },
  emits: ['select', 'reorder'],
  setup(props, { emit }) {
    const activeComponent = computed(() => {
      const found = props.tabs.find((t) => t.id === props.active)
      return found ? found.component || null : null
    })
    function onSelect(id) {
      emit('select', id)
    }
    function onReorder(from, to) {
      emit('reorder', from, to)
    }
    return { activeComponent, onSelect, onReorder }
  },
}
</script>