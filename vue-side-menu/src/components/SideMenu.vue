<template>
  <div class="vsm">
    <div
      v-if="visible && isMobile"
      class="vsm-overlay"
      @click="$emit('close')"
    ></div>

    <div class="vsm-sidebar" :class="{ 'vsm-open': visible }">
      <h5 class="vsm-header">{{ title }}</h5>
      <ul class="vsm-nav">
        <MenuItem
          v-for="(item, index) in visibleItems"
          :key="index"
          :item="item"
          :breakpoint="breakpoint"
          @close="$emit('close')"
        />
      </ul>

      <div class="vsm-footer">
        <slot name="footer">{{ footer }}</slot>
      </div>
    </div>
  </div>
</template>

<script>
import { inject, computed } from 'vue'
import MenuItem from './MenuItem.vue'
import { useEsMovil, filtrarItems } from '../utils/menu.js'

export const HAS_PERMISSION_KEY = 'hasPermission'

export default {
  name: 'SideMenu',
  components: { MenuItem },
  props: {
    items: { type: Array, default: () => [] },
    visible: { type: Boolean, default: false },
    breakpoint: { type: Number, default: 768 },
    title: { type: String, default: 'Menú' },
    footer: { type: String, default: '' },
  },
  emits: ['close'],
  setup(props) {
    const hasPermission = inject(HAS_PERMISSION_KEY, null)
    const isMobile = useEsMovil(() => props.breakpoint)

    const visibleItems = computed(() => filtrarItems(props.items, hasPermission))

    return { hasPermission, visibleItems, isMobile }
  },
}
</script>
