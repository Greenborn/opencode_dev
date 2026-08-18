<template>
  <div class="demo">
    <h1>vue-greenborn-remote-terminal — demo</h1>
    <p class="sub">
      Componente transport-agnostic. Acá un transporte simulado: cada
      <code>@input</code> se responde, el streaming llega vía <code>write()</code> y
      <code>writeExit()</code> por ref.
    </p>

    <div class="bar">
      <button @click="send('ls -la\r')">enviar: ls -la</button>
      <button @click="send('echo hola && date\r')">enviar: echo</button>
      <button @click="simulateExit">simular exit (código 0)</button>
      <button @click="clear">limpiar</button>
    </div>

    <RemoteTerminal ref="term" title="demo — shell simulado" @input="onInput" @resize="onResize" />
  </div>
</template>

<script>
import { ref, onUnmounted } from 'vue'
import RemoteTerminal from '../components/RemoteTerminal.vue'

export default {
  name: 'DemoApp',
  components: { RemoteTerminal },
  setup() {
    const term = ref(null)
    let timer = null

    function write(data) {
      term.value?.write(data)
    }

    function prompt() {
      write('\r\n\x1b[38;5;39mdemo@greenborn\x1b[0m:\x1b[38;5;47m~\x1b[0m$ ')
    }

    function onInput(data) {
      write(data)
      if (data === '\r') {
        prompt()
      } else if (data === '\x03') {
        write('^C')
        prompt()
      }
    }

    function send(cmd) {
      write(cmd)
      setTimeout(() => {
        write('total 0\r\n')
        prompt()
      }, 200)
    }

    function simulateExit() {
      term.value?.writeExit(0)
    }

    function clear() {
      term.value?.write('\x1b[2J\x1b[3J\x1b[H')
      prompt()
    }

    function onResize({ cols, rows }) {
      console.log('[demo] resize ->', cols, 'x', rows)
    }

    function startStream() {
      write('\r\n\x1b[38;5;245mBienvenido a la demo. Escribí y presioná Enter.\x1b[0m\r\n')
      prompt()
      let n = 0
      timer = setInterval(() => {
        write(`\r\n\x1b[38;5;214m[stream ${++n}]\x1b[0m`)
      }, 8000)
    }

    setTimeout(startStream, 50)

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return { term, onInput, onResize, send, simulateExit, clear }
  },
}
</script>

<style>
body {
  margin: 0;
  background: #0d1117;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #e6edf3;
}
.demo {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px;
}
.demo h1 {
  font-size: 1.3rem;
  color: #e6edf3;
}
.demo .sub {
  color: #8b949e;
  font-size: 0.9rem;
  margin-bottom: 16px;
}
.demo .sub code {
  background: #161b22;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.85em;
}
.bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.bar button {
  background: #21262d;
  color: #e6edf3;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.8rem;
}
.bar button:hover {
  background: #1f6feb;
  border-color: #58a6ff;
}
</style>
