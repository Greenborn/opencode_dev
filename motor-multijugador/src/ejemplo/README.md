# Ejemplo mínimo del núcleo

Prueba de independencia (Fase 4): un sistema trivial (`sistema_saludos.js`) registrado en
el núcleo, que recibe `onJugadorEntra`, `onJugadorSale`, `onTick` y `onMensaje`, y responde
al evento propio `ejemplo_saludar`. Sólo importa de `src/` y de `node:` builtins
(a través del núcleo). No depende de `server/` ni de `cliente/`.

Archivos:
- `sistema_saludos.js`: el sistema.
- `sala_ejemplo.js`: cableado de una sala (FakeIO + registro), sin socket.io ni workers.
- `demo.js`: recorrido en proceso (conectar, evento, tick, desconectar).

Ejecutar (no abre puertos):

    node src/ejemplo/demo.js

Verificación estática:

    node --check src/ejemplo/demo.js

No es un servidor real: no acepta conexiones de socket.io. Para eso hace falta un worker
y `GestorSalas` (ver `server/server.js`).
