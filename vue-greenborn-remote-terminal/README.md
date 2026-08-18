# vue-greenborn-remote-terminal

Terminal remota **xterm.js** transport-agnostic para **Vue 3**, extraída de la vista de desarrollo del SGI. Render completo de terminal (colores ANSI, cursor parpadeante, scrollback, redimensionado con `FitAddon`, pantalla completa, menú contextual copiar, toolbar) sin atarse a ningún transporte.

El **transporte lo implementa el consumidor**: el componente solo emite eventos (`input`, `resize`, `close`) y expone métodos (`write`, `writeExit`) para recibir el streaming. Se conecta igual a un WebSocket directo que a pseudoendpoints socket.io.

## Instalación

```bash
npm install vue-greenborn-remote-terminal @xterm/xterm @xterm/addon-fit
```

## Uso básico

```vue
<template>
  <RemoteTerminal
    ref="term"
    :terminal-id="terminalId"
    :title="`Terminal — ${titulo}`"
    @input="onInput"
    @resize="onResize"
    @close="onClose"
  />
</template>

<script>
import { RemoteTerminal } from 'vue-greenborn-remote-terminal'
import 'vue-greenborn-remote-terminal/style.css'

export default {
  components: { RemoteTerminal },
  methods: {
    onInput(data) {
      // Envía la tecla al canal (socket.io / WebSocket)
      transport.sendInput(data)
    },
    onResize({ cols, rows }) {
      transport.resize(cols, rows)
    },
    onClose() {
      transport.close()
    },
    onStreamData(data) {
      // Recibe el streaming y lo pinta en la terminal
      this.$refs.term.write(data)
    },
  },
}
</script>
```

## API

### Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `title` | `String` | `'terminal'` | Texto de la barra superior. |
| `terminalId` | `String` | `null` | Id de la terminal (solo informativo; al setearse enfoca y reajusta). |

### Emits

| Evento | Payload | Descripción |
|---|---|---|
| `input` | `data: string` | Tecla/entrada de usuario (se emite por cada `onData` de xterm). |
| `resize` | `{ cols, rows }` | Cambio de dimensiones (tanto por `FitAddon` como por resize de xterm). |
| `close` | — | El usuario pulsó ✕ en la barra. |
| `ready` | `{ terminalId }` | El componente terminó de montar y quedó listo. |
| `exit` | — | Reservado para cuando el consumidor notifique el fin del proceso. |

### Métodos expuestos (vía ref)

| Método | Descripción |
|---|---|
| `write(data)` | Escribe datos (streaming) en la terminal. |
| `writeExit(code)` | Escribe el mensaje de proceso terminado con el código de salida. |
| `fitTerminal()` | Fuerza el reajuste de columnas/filas. |

### Colores / tema

El tema oscuro está embebido (mismo esquema que el panel dev). Para customizarlo, no hay prop aún; se puede sobreescribir vía CSS o editando la instancia en futuras versiones.

## Transporte

El componente **no** abre conexiones ni crea PTYs. Ejemplos de adaptación:

- **WebSocket directo** (PTY real): conectarse a `ws://host?terminalId=...`, reenviar `data` a `@input`, y al recibir `data`/`exit` llamar a `write()`/`writeExit()`.
- **Socket.io pseudoendpoints** (retransmisor): emitir `input`/`resize`/`close` con ack y suscribirse a eventos `data`/`exit`.

## Desarrollo de la librería

```bash
npm install
npm run dev     # demo en http://localhost:5175 (puerto fijo según convención del repo)
npm run build   # genera dist/ (ESM + UMD + CSS)
```

## Licencia

MIT
