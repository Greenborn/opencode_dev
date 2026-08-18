<template>
  <div
    class="gp-panel"
    :class="{ collapsed, 'gp-panel--left': side === 'left', 'gp-panel--right': side === 'right', 'gp-panel--bottom': side === 'bottom' }"
    :style="panelStyle"
  >
    <div class="gp-panel__content">
      <slot />
    </div>
    <div
      v-if="resizable"
      class="gp-panel__handle"
      :class="`gp-panel__handle--${side}`"
      :title="title"
      @mousedown.prevent="onResizeStart"
    >
      <div class="gp-panel__handle-bar"></div>
    </div>
  </div>
</template>

<script>
// Panel colapsable con handle de redimensionado. Admite tres orientaciones:
//   - 'left'   → panel lateral izquierdo (colapsa a 0 de ancho, handle a la derecha)
//   - 'right'  → panel lateral derecho (colapsa a 0 de ancho, handle a la izquierda)
//   - 'bottom' → panel inferior / dev (colapsa a 0 de alto, handle arriba)
// Emite `update:size` y `update:collapsed` para que el estado lo gestione el
// consumidor (normalmente `useLayoutState`).
export default {
  name: 'ResizablePanel',
  props: {
    side: { type: String, default: 'left' }, // left | right | bottom
    collapsed: { type: Boolean, default: false },
    size: { type: Number, default: 220 }, // width (px) para left/right, height para bottom
    resizable: { type: Boolean, default: true },
    minSize: { type: Number, default: 60 },
    title: { type: String, default: '' },
  },
  emits: ['update:size', 'update:collapsed'],
  setup(props, { emit }) {
    const isHorizontal = () => props.side === 'left' || props.side === 'right'

    const panelStyle = {
      get() {
        if (props.collapsed) {
          return isHorizontal() ? { width: '0px', minWidth: '0px' } : { height: '0px' }
        }
        if (isHorizontal()) {
          return { width: props.size + 'px', minWidth: props.size + 'px' }
        }
        return { height: props.size + 'px' }
      },
    }

    function onResizeStart(e) {
      const handle = e.currentTarget

      function onMouseMove(e) {
        if (props.side === 'left') {
          emit('update:size', Math.max(props.minSize, e.clientX))
        } else if (props.side === 'right') {
          const right = window.innerWidth - e.clientX
          emit('update:size', Math.max(props.minSize, right))
        } else {
          // bottom: alto = viewport - y del mouse
          emit('update:size', Math.max(props.minSize, window.innerHeight - e.clientY))
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      document.body.style.cursor = isHorizontal() ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    }

    return { panelStyle, onResizeStart }
  },
}
</script>