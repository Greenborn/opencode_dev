<template>
  <div class="rt-wrapper" ref="wrapperRef" :class="{ 'rt-fullscreen': fullscreen }" @contextmenu.prevent="onContextMenu">
    <div class="rt-toolbar">
      <span class="rt-title">{{ title }}</span>
      <div class="rt-mob-controls">
        <button class="rt-btn" @click="sendInput('\t')" title="Enviar Tab">Tab</button>
        <button class="rt-btn" @click="sendInput('\x1b[A')" title="Enviar flecha arriba">↑</button>
        <button class="rt-btn" @click="sendInput('\x1b[B')" title="Enviar flecha abajo">↓</button>
        <button class="rt-btn" @click="paste" :disabled="pasting" title="Pegar contenido del portapapeles">
          <span v-if="pasting" class="rt-spin"></span>
          <template v-else>Pegar</template>
        </button>
      </div>
      <div class="rt-actions">
        <button class="rt-btn" @click="toggleFullscreen" :title="fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'">⛶</button>
        <button class="rt-btn" @click="emitClose" title="Cerrar terminal">✕</button>
      </div>
    </div>
    <div ref="containerRef" class="rt-container" @contextmenu.prevent="onContextMenu"></div>
    <div v-if="ctxMenu.show" ref="menuRef" class="rt-ctx-menu" :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }" @click.stop>
      <button class="rt-ctx-btn" @click="copySelection" :disabled="!hasSelection">📋 Copiar</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export default {
  name: 'RemoteTerminal',
  props: {
    title: { type: String, default: 'terminal' },
    terminalId: { type: String, default: null },
    fontSize: { type: Number, default: 13 },
  },
  emits: ['input', 'resize', 'close', 'ready', 'exit'],
  setup(props, { emit }) {
    const containerRef = ref(null)
    const wrapperRef = ref(null)
    const fullscreen = ref(false)
    const ctxMenu = ref({ show: false, x: 0, y: 0 })
    const menuRef = ref(null)
    const hasSelection = ref(false)
    const pasting = ref(false)

    let terminal = null
    let fitAddon = null
    let resizeObserver = null
    let fsResizeObserver = null
    let ctxCloseHandler = null

    function fitTerminal() {
      if (!fitAddon || !terminal) return
      try {
        fitAddon.fit()
        emit('resize', { cols: terminal.cols, rows: terminal.rows })
      } catch (err) {
        console.log('[RemoteTerminal] fit error:', err.message)
      }
    }

    function write(data) {
      if (terminal && data != null) terminal.write(String(data))
    }

    function writeExit(code) {
      if (terminal) {
        terminal.write(`\r\n\x1b[38;5;245m[proceso terminado: código ${code !== undefined ? code : '-'}]\x1b[0m\r\n`)
      }
    }

    function enterFullscreen() {
      const el = wrapperRef.value
      if (!el) return
      const modal = el.closest('.modal-content') || el.closest('.modal-dialog')
      const host = modal || el.parentElement
      el.style.position = 'fixed'
      el.style.top = '0px'
      el.style.left = '0px'
      el.style.width = '100vw'
      el.style.height = '100vh'
      el.style.zIndex = 2050
      el.style.margin = '0'
      el.style.borderRadius = '0'
      fsResizeObserver = new ResizeObserver(() => {
        if (!fullscreen.value) return
        el.style.top = '0px'
        el.style.left = '0px'
        el.style.width = '100vw'
        el.style.height = '100vh'
        fitTerminal()
      })
      fsResizeObserver.observe(host)
    }

    function exitFullscreen() {
      const el = wrapperRef.value
      if (!el) return
      el.style.position = ''
      el.style.top = ''
      el.style.left = ''
      el.style.width = ''
      el.style.height = ''
      el.style.zIndex = ''
      el.style.margin = ''
      el.style.borderRadius = ''
      if (fsResizeObserver) {
        fsResizeObserver.disconnect()
        fsResizeObserver = null
      }
    }

    function toggleFullscreen() {
      fullscreen.value = !fullscreen.value
      if (fullscreen.value) enterFullscreen()
      else exitFullscreen()
      nextTick(() => fitTerminal())
    }

    function emitClose() {
      emit('close')
    }

    function sendInput(data) {
      if (data == null) return
      emit('input', String(data))
    }

    async function paste() {
      if (pasting.value) return
      pasting.value = true
      try {
        let texto = ''
        try {
          texto = (await navigator.clipboard.readText()) || ''
        } catch (err) {
          console.log('[RemoteTerminal] clipboard no disponible, probando lectura legacy:', err.message)
          const ta = document.createElement('textarea')
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.focus()
          document.execCommand('paste')
          texto = ta.value || ''
          ta.remove()
        }
        if (texto) emit('input', texto)
      } catch (err) {
        console.log('[RemoteTerminal] error al pegar:', err.message)
      } finally {
        pasting.value = false
      }
    }

    function onContextMenu(e) {
      if (!terminal) return
      hasSelection.value = !!terminal.getSelection()
      const rect = wrapperRef.value?.getBoundingClientRect()
      ctxMenu.value = rect
        ? { show: true, x: e.clientX - rect.left, y: e.clientY - rect.top }
        : { show: true, x: e.clientX, y: e.clientY }
      if (ctxCloseHandler) document.removeEventListener('click', ctxCloseHandler)
      ctxCloseHandler = () => { ctxMenu.value.show = false }
      setTimeout(() => document.addEventListener('click', ctxCloseHandler), 0)
    }

    function copySelection() {
      if (!terminal) return
      const text = terminal.getSelection()
      if (!text) return
      navigator.clipboard.writeText(text).catch((err) => {
        console.log('[RemoteTerminal] Error al copiar:', err.message)
      })
      ctxMenu.value.show = false
    }

    watch(() => props.terminalId, (val) => {
      if (val) {
        nextTick(() => {
          terminal.focus()
          fitTerminal()
        })
      }
    })

    watch(() => props.fontSize, (val) => {
      if (!terminal) return
      terminal.options.fontSize = val
      fitTerminal()
    })

    onMounted(() => {
      terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: props.fontSize,
        fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
        lineHeight: 1.4,
        allowTransparency: true,
        convertEol: true,
        scrollback: 10000,
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#3fb950',
          cursorAccent: '#0d1117',
          selectionBackground: '#264f78',
          black: '#484f58',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#e6edf3',
          brightBlack: '#6e7681',
          brightRed: '#ffa198',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#ffffff',
        },
      })

      fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.open(containerRef.value)

      terminal.onData((data) => {
        emit('input', data)
      })

      terminal.onResize(({ cols, rows }) => {
        emit('resize', { cols, rows })
      })

      nextTick(() => fitTerminal())

      resizeObserver = new ResizeObserver(() => fitTerminal())
      if (wrapperRef.value) resizeObserver.observe(wrapperRef.value)

      emit('ready', { terminalId: props.terminalId })
    })

    onUnmounted(() => {
      if (ctxCloseHandler) {
        document.removeEventListener('click', ctxCloseHandler)
        ctxCloseHandler = null
      }
      if (resizeObserver) resizeObserver.disconnect()
      if (fsResizeObserver) fsResizeObserver.disconnect()
      if (terminal) {
        terminal.dispose()
        terminal = null
      }
    })

    return {
      containerRef,
      wrapperRef,
      fullscreen,
      ctxMenu,
      menuRef,
      hasSelection,
      pasting,
      write,
      writeExit,
      fitTerminal,
      toggleFullscreen,
      emitClose,
      sendInput,
      paste,
      onContextMenu,
      copySelection,
    }
  },
}
</script>

<style scoped>
.rt-wrapper {
  position: relative;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
  margin: 8px 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  background: #0d1117;
}

.rt-toolbar {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex;
  align-items: center;
  padding: 4px 10px;
  gap: 8px;
}

.rt-title {
  color: #8b949e;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.75rem;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rt-actions {
  display: flex;
  gap: 4px;
}

.rt-mob-controls {
  display: none;
  align-items: center;
  gap: 4px;
}

.rt-btn {
  background: none;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #8b949e;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1;
  padding: 2px 6px;
  white-space: nowrap;
}

.rt-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.rt-btn:hover:not(:disabled) {
  background: #21262d;
  border-color: #58a6ff;
  color: #e6edf3;
}

.rt-spin {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid #8b949e;
  border-top-color: transparent;
  border-radius: 50%;
  animation: rt-spin 0.8s linear infinite;
  vertical-align: middle;
}

@keyframes rt-spin {
  to { transform: rotate(360deg); }
}

.rt-container {
  height: 380px;
  padding: 0;
  background: #0d1117;
}

.rt-wrapper.rt-fullscreen {
  position: fixed;
  z-index: 2050;
  margin: 0 !important;
  border-radius: 0;
}

.rt-wrapper.rt-fullscreen .rt-mob-controls {
  display: flex;
}

@media (max-width: 767.98px) {
  .rt-mob-controls {
    display: flex;
  }
}

.rt-wrapper.rt-fullscreen .rt-container {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.rt-container :deep(.xterm) {
  height: 100%;
  padding: 0 8px;
}

.rt-ctx-menu {
  position: absolute;
  z-index: 2100;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  min-width: 120px;
}

.rt-ctx-btn {
  display: block;
  width: 100%;
  background: none;
  border: none;
  color: #e6edf3;
  font-size: 0.75rem;
  padding: 6px 12px;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  white-space: nowrap;
}

.rt-ctx-btn:hover:not(:disabled) {
  background: #1f6feb;
  color: #fff;
}

.rt-ctx-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
