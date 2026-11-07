# @greenborn/vue-greenborn-notificaciones

Cliente Web Push (VAPID) reutilizable para proyectos Vue 3 / PWA: suscripción/desuscripción desde el front, un composable opcional (`usePush`) y un módulo separado (**`@greenborn/vue-greenborn-notificaciones/sw`**) para registrar los listeners `push`/`notificationclick` dentro del service worker propio del proyecto.

Pensado para usarse junto al backend [`express-greenborn-notificaciones`](../express-greenborn-notificaciones), pero solo depende de una interfaz HTTP mínima, no de axios ni de ningún backend concreto.

## Instalación

```bash
npm install @greenborn/vue-greenborn-notificaciones
```

`vue` es una `peerDependency` **opcional**: solo es necesaria si usás el composable `usePush`. Las funciones planas (`suscribirPush`/`desuscribirPush`) no requieren Vue.

## ⚠️ El punto más importante: el service worker

Este paquete **no puede inyectar un service worker completo**. Cada proyecto compila su propio `sw.js` (típicamente con `vite-plugin-pwa` en modo `injectManifest`, como hace `sgi-frontend`). Lo que el paquete ofrece es una función que ese `sw.js` del proyecto consumidor debe **llamar explícitamente**:

```js
// src/sw.js del proyecto consumidor (el que compila vite-plugin-pwa)
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { registrarPushListener } from '@greenborn/vue-greenborn-notificaciones/sw'

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache' })
)

// Registra los listeners 'push' y 'notificationclick'.
registrarPushListener(self, {
  tituloPorDefecto: 'Notificación',   // opcional
  icon: '/pwa-192x192.svg',            // opcional
  badge: '/pwa-192x192.svg',           // opcional
  vibrate: [200, 100, 200],            // opcional
  urlAlEnfocar: '/',                   // opcional — a dónde abrir si no hay ventana abierta
})
```

El listener `push` espera un payload JSON `{ titulo, mensaje }` enviado por el backend (convención compartida con `express-greenborn-notificaciones`, no un requisito técnico — podés ajustarlo copiando/extendiendo `registrarPushListener` si tu backend manda otro formato).

> Nota sobre sonido/vibración en Android: el valor de `vibrate` es solo una sugerencia al navegador. Chrome en Android delega sonido y vibración reales al **canal de notificación del sistema**; si el usuario desactivó sonido/vibración para ese canal (Ajustes del teléfono → Apps → \[Chrome o la PWA instalada\] → Notificaciones), `vibrate` se ignora. Esto no se puede forzar desde el código.

## Flujo completo en el frontend

```js
// api/push.js del proyecto consumidor
import { suscribirPush, desuscribirPush } from '@greenborn/vue-greenborn-notificaciones'
import api from './axios' // tu cliente axios ya configurado con baseURL /api/...

export const suscribir = () => suscribirPush({
  http: api,
  vapidKeyEndpoint: '/notificaciones/push/vapid-public-key',
  subscribeEndpoint: '/notificaciones/push/suscripcion',
})

export const desuscribir = () => desuscribirPush({
  http: api,
  unsubscribeEndpoint: '/notificaciones/push/suscripcion',
})
```

`http` solo necesita exponer `get(url)`, `post(url, body)` y `delete(url, { data })` devolviendo algo con `.data` — una instancia de axios cumple esta interfaz tal cual. Si usás `fetch` directo, hay que envolverlo en un objeto con esa forma.

Disparar la suscripción típicamente al loguearse (ej. en `App.vue`, después de confirmar sesión):

```js
import { suscribirPush } from '@greenborn/vue-greenborn-notificaciones'
await suscribirPush({ http: api, vapidKeyEndpoint: '...', subscribeEndpoint: '...' })
```

## Composable opcional `usePush`

```vue
<script setup>
import { usePush } from '@greenborn/vue-greenborn-notificaciones'
import api from '@/api/axios'

const { soportado, suscripto, cargando, suscribir, desuscribir } = usePush({
  http: api,
  vapidKeyEndpoint: '/notificaciones/push/vapid-public-key',
  subscribeEndpoint: '/notificaciones/push/suscripcion',
  unsubscribeEndpoint: '/notificaciones/push/suscripcion',
})
</script>

<template>
  <button v-if="soportado" :disabled="cargando" @click="suscripto ? desuscribir() : suscribir()">
    {{ suscripto ? 'Desactivar notificaciones' : 'Activar notificaciones' }}
  </button>
</template>
```

## Probar el flujo de punta a punta

1. Backend: generar claves VAPID (`npx web-push generate-vapid-keys`) e inicializar `express-greenborn-notificaciones` con ellas (ver su README).
2. Front: llamar `suscribirPush(...)` una vez logueado — esto pide permiso de notificaciones al navegador y registra el endpoint en el backend.
3. Backend: `POST /notificaciones/push/prueba` (ruta que expone `express-greenborn-notificaciones`) o `enviarPushAUsuario(usuarioId, { titulo, mensaje })` desde tu propio código.
4. El `sw.js` del proyecto (con `registrarPushListener` ya llamado) debe mostrar la notificación del sistema.

## API

```js
import {
  suscribirPush,            // ({ http, vapidKeyEndpoint?, subscribeEndpoint? }) => Promise<boolean>
  desuscribirPush,          // ({ http, unsubscribeEndpoint? }) => Promise<void>
  urlBase64ToUint8Array,    // (base64: string) => Uint8Array
  arrayBufferToBase64Url,   // (buffer: ArrayBuffer) => string
  usePush,                  // composable Vue opcional
} from '@greenborn/vue-greenborn-notificaciones'

import { registrarPushListener } from '@greenborn/vue-greenborn-notificaciones/sw'
```

## Seguridad

Este paquete no valida nada por sí mismo: la autenticación de las rutas que consume (`vapidKeyEndpoint`, `subscribeEndpoint`, `unsubscribeEndpoint`) depende enteramente del backend al que apuntás. Asegurate de que esas rutas estén protegidas con un `authMiddleware` real del lado del servidor (ver README de `express-greenborn-notificaciones`, sección Seguridad) — este paquete front no puede ni debe compensar un backend desprotegido.

## Demo

```bash
npm install
npm run dev
```

Levanta la demo Vue en `http://localhost:5175` (puerto fijo por convención del monorepo). Para probar el flujo completo, correr en paralelo el demo de `express-greenborn-notificaciones` (ajustar el puerto en `demo/main.js` si hace falta, ya que ambos paquetes usan 5175 por defecto para su propio modo demo).

## Build / tests

```bash
npm run build   # vite build → dist/@greenborn/vue-greenborn-notificaciones.{js,cjs} + dist/sw.{js,cjs}
npm test        # node --test (funciones puras, sin DOM)
```
