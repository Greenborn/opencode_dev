# @greenborn/express-greenborn-notificaciones

Web Push (VAPID) reutilizable para backends Express/Node: router de suscripción/desuscripción, envío a un usuario o a todos, y migración Knex idempotente de `push_subscriptions`.

**No reimplementa autenticación.** Recibe el `authMiddleware` por inyección de dependencias — pensado para usarse junto a [`express-greenborn-sso-back`](../express-greenborn-sso-back), pero no depende de él ni lo importa.

## Instalación

```bash
npm install @greenborn/express-greenborn-notificaciones
```

Requiere `express` y `knex` ya instalados en el proyecto consumidor (son `peerDependencies` opcionales).

## Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

Guardar `publicKey`/`privateKey` como variables de entorno (ej. `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:soporte@tudominio.com`).

## Migración

El paquete expone una **factory** de migración (no un archivo de migración Knex con timestamp fijo, porque el timestamp y el nombre de archivo los decide cada proyecto):

```js
// migrations/20261104000000_create_push_subscriptions.js
import { createPushSubscriptionsMigration } from '@greenborn/express-greenborn-notificaciones';

export const { up, down } = createPushSubscriptionsMigration({
  table: 'push_subscriptions',   // default
  userColumn: 'usuario_id',      // default
  userTable: 'usuarios',         // default — tabla de usuarios del proyecto consumidor
  userTablePk: 'id',              // default
});
```

Es **idempotente** (`hasTable` guard): ejecutarla más de una vez no rompe el esquema.

## Inicialización

```js
import express from 'express';
import knex from 'knex';
import { createNotificaciones } from '@greenborn/express-greenborn-notificaciones';
import { createSsoAuth } from 'express-greenborn-sso-back';

const app = express();
app.use(express.json());

const db = knex({ /* config de tu proyecto */ });

// Auth real del proyecto (ejemplo con express-greenborn-sso-back)
const sso = createSsoAuth({ knex: db, /* ... */ });

const notificaciones = createNotificaciones({
  knex: db,
  table: 'push_subscriptions',       // opcional, default mostrado
  userColumn: 'usuario_id',          // opcional, default mostrado
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
  },
  authMiddleware: sso.authMiddleware,
  userField: 'user',   // IMPORTANTE, ver sección "Contrato de autenticación"
  logger: console,
});

app.use('/api/notificaciones/push', notificaciones.router);
```

## Rutas que expone `notificaciones.router`

Montado en, por ejemplo, `/api/notificaciones/push`:

| Método | Ruta            | Descripción                                              |
|--------|-----------------|-----------------------------------------------------------|
| GET    | `/vapid-public-key` | Devuelve `{ status, data: { publicKey, configurado } }` |
| POST   | `/suscripcion`  | Body `{ endpoint, keys: { p256dh, auth } }` — upsert por `endpoint` |
| DELETE | `/suscripcion`  | Body `{ endpoint }` — borra la suscripción del usuario autenticado |
| POST   | `/prueba`       | Envía un push de prueba a **todas** las suscripciones registradas (protegela con un permiso admin en tu propio sistema de rutas si la montás) |

Todas las rutas pasan por el `authMiddleware` inyectado.

## Contrato de autenticación (`userField`)

Las rutas de suscripción/desuscripción necesitan `req.<userField>.id` para saber a qué usuario pertenece la suscripción. El nombre exacto del campo que tu `authMiddleware` deja en `req` **varía según el sistema de auth**:

- `express-greenborn-sso-back` (tal cual, sin adaptar) deja al usuario en **`req.user`** → pasar `userField: 'user'`.
- Si tu backend tiene un `authMiddleware` propio que adapta/renombra el usuario a `req.usuario` (como hace `sgi-backend`), dejá el default: `userField: 'usuario'`.

**No adivines**: revisá qué campo setea tu middleware (`console.log(req)` en una ruta de prueba) y configurá `userField` en consecuencia. Si está mal configurado, las rutas de suscripción devuelven `{ status: false, error: 'req.<userField>.id no está presente...' }` en vez de fallar silenciosamente.

## Seguridad

> ⚠️ **Este paquete NO valida permisos ni autenticación por sí mismo.** Si no pasás `authMiddleware`, el router queda **sin protección** (loguea un warning y usa un middleware noop) — esto es solo para desarrollo/demo local, **nunca montar así en producción**.

Siempre pasar un `authMiddleware` real que:
1. Verifique que hay una sesión válida (token SSO, JWT, sesión local, lo que use tu proyecto).
2. Puebla `req[userField]` con, al menos, `{ id }`.

Esto sigue la misma regla que el resto de los proyectos Greenborn: la validación de acceso ocurre siempre en el servidor, nunca solo en el router del frontend.

## API programática

```js
const {
  router,              // Express Router
  vapidPublicKey,       // () => string | null
  estaConfigurado,      // () => boolean
  enviarPushAUsuario,   // (usuarioId, payload) => Promise<{ enviados, fallidos }>
  enviarPushATodos,     // (payload) => Promise<{ enviados, fallidos }>
} = notificaciones;
```

`payload` es cualquier objeto serializable a JSON; el frontend (service worker) decide cómo mostrarlo — ver [`vue-greenborn-notificaciones`](../vue-greenborn-notificaciones), que espera `{ titulo, mensaje }` por convención (no es un requisito del backend, es la convención del paquete front).

Ejemplo de uso desde un controlador propio del proyecto (ej. al crear una notificación interna):

```js
await db('mis_notificaciones').insert({ usuario_id, mensaje });
notificaciones.enviarPushAUsuario(usuario_id, { titulo: 'Nueva notificación', mensaje }).catch(() => {});
```

Si `estaConfigurado()` es `false` (faltan claves VAPID), `enviarPushAUsuario`/`enviarPushATodos` devuelven `{ enviados: 0, fallidos: 0 }` sin lanzar excepción — es seguro llamarlos siempre, con o sin VAPID configurado.

Las suscripciones a endpoints caídos (push responde `404`/`410`) se borran automáticamente de la tabla.

## Demo

```bash
npm install
npm run demo
```

Levanta un servidor Express con SQLite en memoria en `http://localhost:5175` (ver `demo/server.js`), con un `authMiddleware` falso que simula un usuario fijo logueado — reemplazar por el auth real del proyecto.

## Build / tests

```bash
npm run build   # esbuild → dist/index.js (ESM) + dist/index.cjs + dist/index.d.ts
npm test        # node --test
```
