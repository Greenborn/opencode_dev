# @greenborn/motor-multijugador

Núcleo multijugador genérico para Node.js. Extraído de un juego multijugador, pero **no
depende de ninguna regla de juego**: sólo maneja salas, transporte y un registro de sistemas
con hooks.

## Qué incluye

- **Salas** (`GestorSalas`): crear, conectar, cola de pendientes hasta que la sala esté lista,
  cierre por inactividad, códigos de sala (`generarCodigoSala`).
- **Transporte**: `FakeSocket` / `FakeIO` (socket.io simulado dentro del worker), `MapaAcks`
  (acks de socket.io que no se pueden clonar por `postMessage`), y el puente
  `reenviarSocketAlWorker` / `despacharMensajeWorker` entre socket.io y un `worker_threads`.
- **Sistemas** (`crearRegistroSistemas`): registro con hooks `onInstalarMapa`,
  `onJugadorEntra`, `onJugadorSale`, `onTick(dt)` y `onMensaje(evento, ...)`.

La API completa, con firmas, está en [`docs/nucleo_api.md`](docs/nucleo_api.md).

## Instalación

```bash
npm install @greenborn/motor-multijugador
```

Requiere Node.js 18 o superior. No tiene dependencias de runtime.

## Uso mínimo

```js
import { crearRegistroSistemas, FakeIO } from '@greenborn/motor-multijugador';
```

Un ejemplo completo y ejecutable, sin puertos, está en `src/ejemplo/`:

```bash
npm run demo
```

## Pruebas

```bash
npm test
```

La prueba de independencia corre el ejemplo en proceso y comprueba que una sala conecta,
procesa un evento, hace tick y desconecta, sin abrir sockets.

## Estado

Versión 0.1.0. No publicada en npm todavía. Pendiente según el plan de modularización:
la interfaz de mapa (proveedor y streaming de chunks) aún no existe en el núcleo.

## Licencia

MIT
