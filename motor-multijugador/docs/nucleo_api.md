# API pública del núcleo multijugador (`motor_multijugador/`)

Fecha: 2026-11-19 · Fase 4 del plan de modularización.

Todas las firmas están leídas del código fuente (no del plan). Punto de entrada: `motor_multijugador/index.js`.
El núcleo no importa nada fuera de `motor_multijugador/` (salvo `node:crypto`). Verificado por grep: ningún
`import` apunta a `server/`, `cliente/` ni `compartido/`.

Estado de verificación: **sólo estática** (`node --check`, grep de imports, `scripts/check_ciclos_import.mjs`).
No se ejecutó el servidor ni las pruebas de integración (quedan para la fase final).

## Salas (`salas/`)

### `GestorSalas` (`salas/gestor.js`)

- `new GestorSalas()`: mantiene `salas: Map<id, Sala>` y un `MapaAcks` compartido por el proceso.
- `crear(id, { worker, requiereListo = false, minutosInactividad = null, onCierre = null }) → Sala`
  Registra una sala con un worker ya creado. El worker lo crea quien usa el núcleo.
- `existe(id) → boolean`, `obtener(id) → Sala | undefined`.
- `conectar(socket, id)`: conecta un socket ya aceptado.
  - Sala inexistente: emite `mp_sala_invalida` y desconecta.
  - Sala con `requiereListo` y aún no lista: el socket entra en **cola de pendientes** y recibe `mp_sala_pendiente`.
  - Si no, se conecta: `mp_sala_lista` al socket y `connect` al worker.
- `destruir(id, motivo)`: quita la sala, termina su worker (`terminate`) y llama `onCierre(motivo)`.
- `mensajeDeWorker(id, msg)`: punto de entrada de los mensajes del worker. Primero los de transporte
  (`toClient`, `broadcast`, `ack`) vía `despacharMensajeWorker`. Luego:
  - `listo`: marca la sala como lista y conecta a los pendientes (`mp_sala_lista` a cada uno).
  - `vacia`: sólo si `minutosInactividad` está definido y no queda ningún socket, destruye la sala con motivo `'vacia'`.

### Cola de pendientes

Un socket en cola se quita si se desconecta antes de que la sala esté lista. Al llegar `listo`, los
pendientes que sigan conectados pasan a `_conectarSocket`.

### Cierre por inactividad

- `minutosInactividad` (en minutos) activa el cierre. Al crear la sala, arranca el contador como "vacía".
- Cuando la sala queda sin sockets (tras `disconnect`) se programa `setTimeout`. Si al vencer sigue vacía,
  se destruye con motivo `'inactividad'`.
- Un `conectar` cancela el contador (`vacioDesde = null`).

### Función

- `generarCodigoSala() → string` (`salas/codigos.js`): 6 caracteres hex en mayúscula, con `crypto.randomBytes`.

### Protocolo de sala (contrato con el cliente)

| Evento | Quién | Significado |
|---|---|---|
| `mp_sala_lista` | núcleo → socket | conectado a una sala lista |
| `mp_sala_pendiente` | núcleo → socket | sala aún no lista, en cola |
| `mp_sala_invalida` | núcleo → socket | sala inexistente; se desconecta |
| `listo` | worker → hilo principal | la sala terminó de arrancar |
| `vacia` | worker → hilo principal | no quedan humanos jugando (sólo salas con cierre) |

## Sistemas (`sistemas/registro.js`)

### `crearRegistroSistemas() → registro`

Un sistema es un objeto `{ nombre, eventos?, onInstalarMapa?, onJugadorEntra?, onJugadorSale?, onTick?, onMensaje? }`.
Todos los hooks son opcionales.

Métodos del registro:

- `registrar(sistema) → sistema`. Lanza `TypeError` si falta `nombre` (string no vacío) y `Error` si el nombre está repetido.
  El orden de registro es el orden de llamada.
- `nombres() → string[]`
- `instalarMapa(mapa)` → llama `onInstalarMapa(mapa)`
- `jugadorEntra(jugador, ...extra)` → llama `onJugadorEntra(jugador, ...extra)`. `extra` es contexto que pasa quien llama; el registro no devuelve nada, así que un sistema que necesite devolver algo lo escribe en `extra`.
- `jugadorSale(jugador, ...extra)` → llama `onJugadorSale(jugador, ...extra)`. Idem.
- `tick(dt, ahora)` → llama `onTick(dt, ahora)`. `dt` en segundos, `ahora` en ms.
- `mensaje(evento, ...datos)` → llama `onMensaje(evento, ...datos)` en todos los sistemas.
- `eventos() → string[]`: unión sin repetir de `sistema.eventos` (en orden de registro).

Notas:
- Los hooks se llaman como funciones sueltas (sin `this`): el estado de un sistema va en closure.
- Los errores de un hook se propagan tal cual; el registro no los aísla.
- Los sistemas no se importan entre sí.

### Uso real en el juego

- `server/multijugador.js:1352`: registro de sistemas de tick (`onTick`): ronda, ciclo_dia, armas, respawn,
  infecciones, supervivencia, bots, autos, drones, drops, etc.
- `server/multijugador.js:1527`: registro de mensajes. Cada dominio (`vehiculos`, `drones`, `armas`, `sala`,
  `supervivencia`) registra un sistema con `eventos` y `onMensaje`. Son 38 eventos (ver `docs/fase3b_parte3.md`, E.1).
- El hook **`onMensaje` recibe `(evento, io, socket, ...datos)`**: el juego pasa `io` y `socket` como
  primeros datos. El registro no sabe de socket.io.

### Hooks: uso en el juego

- `onJugadorEntra` / `onJugadorSale` **sí los usa el juego** desde la Fase 5: lo define `server/juego/jugadores_sistema.js` (sistema `jugadores`), y `server/multijugador.js` llama `jugadorEntra` en `mp_registrar` y `jugadorSale` en `mp_salir` y `disconnect`. Ver `docs/fase3b_parte3.md` (sección G). Notar que `onJugadorEntra` se dispara al registrarse el jugador con nombre (`mp_registrar`), no al conectarse el socket.
- `onInstalarMapa` sigue sin uso: el cambio de mapa llama `instalarMapa` de `server/generador_mapa/mapGenerator.js`, no el del registro. Pendiente (ver sección G, mapa).

## Transporte (`transporte/`)

### `FakeSocket` y `FakeIO` (`transporte/fake_socket_io.js`)

Imitación mínima de socket.io para usar dentro de un `worker_thread`. Sólo cubre lo que el juego usa
(sin rooms, namespaces ni broadcast de socket.io).

- `new FakeSocket(id, post)`
  - `id`, `on(evento, handler)`, `emit(evento, ...datos)` → `post({ type: 'toClient', socketId, evento, datos })`.
  - `_recibir(evento, datos, ackId)`: despacha a los handlers. Si hay `ackId`, el último argumento es
    `ack(resp)`, que `post({ type: 'ack', ackId, resp })`. Si no hay `ackId`, el último argumento es `undefined`.
  - `_desconectar()`: dispara `disconnect`.
- `new FakeIO(post)`
  - `on('connection', cb)` (sólo ese evento), `emit(evento, ...datos)` → `post({ type: 'broadcast', evento, datos })`.
  - `conectar(socketId) → FakeSocket` (crea el socket y llama los `connection`).
  - `desconectar(socketId)`.
  - `recibir(socketId, evento, datos, ackId)`.
  - `sockets: Map<socketId, FakeSocket>`.

`server/fake_socket_io.js` reexporta estas clases.

### Mapeo de acks (`transporte/acks.js`)

`new MapaAcks()`:
- `registrar(fn) → ackId` (número entero creciente, empieza en 1).
- `resolver(ackId, resp) → boolean`: llama la función guardada y la quita. `false` si el id no existe.
- `get tamanio`.

### Puente socket.io ↔ worker (`transporte/puente.js`)

- `reenviarSocketAlWorker(socket, postear, acks)`: `socket.onAny` manda al worker
  `{ type: 'event', socketId, evento, datos, ackId }`. Si el último argumento es función, se reemplaza por `ackId`.
- `despacharMensajeWorker(msg, sockets, acks) → boolean`:
  - `toClient` → `socket.emit` al socket indicado.
  - `broadcast` → `emit` a todos los sockets de `sockets`.
  - `ack` → `acks.resolver`.
  - Devuelve `true` si el tipo era de transporte; `false` para el resto (`listo`, `vacia`, etc.), que decide quien usa el núcleo.

Mensajes del hilo principal al worker que genera el núcleo: `{ type: 'connect', socketId }`,
`{ type: 'disconnect', socketId }` y `{ type: 'event', ... }` (ver `gestor.js`).

## Mapa: interfaz del proveedor y streaming de chunks

**No existe en el núcleo.** Lo que hay hoy:
- La entrega del mapa al conectarse (`enviarMapa`), los handlers `request_chunks` y `playerPosition` y el minimapa
  están en `server/room_worker.js` (líneas ~57, ~97, ~127, ~138), con globales del worker.
- La generación de mapa vive en `server/generador_mapa/mapGenerator.js` (`instalarMapa(mapa)`).
- `motor_multijugador/mapa/` no existe. Se mencionó en el cierre de Fase 1 del progreso del plan y no se creó
  (decisión en `docs/fase3b_parte3.md`, sección E.3).

Por eso **no se documenta una interfaz de proveedor de mapa**: no hay código del que leer la firma.

## Exports públicos (`motor_multijugador/index.js`)

`FakeSocket`, `FakeIO`, `MapaAcks`, `reenviarSocketAlWorker`, `despacharMensajeWorker`, `GestorSalas`,
`generarCodigoSala`, `crearRegistroSistemas`.

Nota: `server/multijugador.js:58` importa `crearRegistroSistemas` desde la ruta directa
(`sistemas/registro.js`) y no desde el índice. Las dos rutas dan el mismo símbolo.

## Ejemplo mínimo

`motor_multijugador/ejemplo/`: sistema `saludos` con `eventos`, `onJugadorEntra`, `onJugadorSale`, `onTick`,
`onMensaje`, cableado con `FakeIO` y registro. Ver `motor_multijugador/ejemplo/README.md`.
