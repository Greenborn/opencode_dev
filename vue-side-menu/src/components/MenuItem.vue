<template>
  <template v-if="item.divider">
    <li class="vsm-divider"></li>
  </template>

  <li v-else class="vsm-item" :class="{ 'vsm-has-children': hasChildren }">
    <template v-if="hasChildren">
      <button
        class="vsm-link vsm-submenu-toggle"
        :class="{ 'vsm-open': open }"
        type="button"
        @click.stop="toggle"
      >
        <i v-if="item.icon" :class="item.icon"></i>{{ item.label }}
        <i class="vsm-caret bi bi-chevron-down"></i>
      </button>
      <ul v-if="open" class="vsm-nav vsm-submenu">
        <MenuItem
          v-for="(child, i) in visibleChildren"
          :key="i"
          :item="child"
          :breakpoint="breakpoint"
          @close="$emit('close')"
        />
      </ul>
    </template>

    <component
      v-else
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

<script>
import { inject, ref, computed } from 'vue'

export const HAS_PERMISSION_KEY = 'hasPermission'

export default {
  name: 'MenuItem',
  props: {
    item: { type: Object, required: true },
    breakpoint: { type: Number, default: 768 },
  },
  emits: ['close'],
  setup(props) {
    const hasPermission = inject(HAS_PERMISSION_KEY, null)
    const open = ref(false)

    const hasChildren = computed(
      () => Array.isArray(props.item.children) && props.item.children.length > 0
    )

    const visibleChildren = computed(() => {
      if (!hasPermission) return props.item.children || []
      return (props.item.children || []).filter((child) => {
        if (child.divider) return true
        return !child.permiso || hasPermission(child.permiso)
      })
    })

    return { hasPermission, open, hasChildren, visibleChildren }
  },
  methods: {
    toggle() {
      this.open = !this.open
    },
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
  computed: {
    isMobile() {
      return window.innerWidth < this.breakpoint
    },
  },
}
</script>
