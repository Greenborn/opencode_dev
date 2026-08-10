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
        <template v-for="(item, index) in visibleItems" :key="index">
          <li v-if="item.divider" class="vsm-divider"></li>

          <li v-else class="vsm-item">
            <component
              :is="linkComponentFor(item)"
              v-bind="linkAttrs(item)"
              class="vsm-link"
              :class="{ 'vsm-button': isAction(item) }"
              @click="handleAction(item)"
            >
              <i v-if="item.icon" :class="item.icon"></i>{{ item.label }}
            </component>
          </li>
        </template>
      </ul>

      <div class="vsm-footer">
        <slot name="footer">{{ footer }}</slot>
      </div>
    </div>
  </div>
</template>

<script>
import { inject, computed, resolveComponent } from 'vue'

export const HAS_PERMISSION_KEY = 'hasPermission'

export default {
  name: 'SideMenu',
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

    const visibleItems = computed(() => {
      if (!hasPermission) return props.items
      return props.items.filter((item) => {
        if (item.divider) return true
        return !item.permiso || hasPermission(item.permiso)
      })
    })

    let routerLink
    try {
      const resolved = resolveComponent('router-link')
      if (typeof resolved !== 'string') {
        routerLink = 'router-link'
      }
    } catch {
      routerLink = undefined
    }

    return { hasPermission, visibleItems, routerLink }
  },
  computed: {
    isMobile() {
      return window.innerWidth < this.breakpoint
    },
    routerLinkComponent() {
      return this.routerLink || 'a'
    },
  },
  methods: {
    linkComponentFor(item) {
      if (item.href) return 'a'
      if (item.to && this.routerLink) return 'router-link'
      if (item.to) return 'a'
      return 'button'
    },
    linkAttrs(item) {
      if (item.href) return { href: item.href }
      if (item.to && this.routerLink) return { to: item.to }
      if (item.to) return { href: item.to }
      return { type: 'button' }
    },
    isAction(item) {
      return !item.href && !item.to
    },
    handleAction(item) {
      if (this.isMobile) {
        this.$emit('close')
      }
      if (typeof item.action === 'function') {
        item.action(item)
      }
    },
  },
}
</script>
