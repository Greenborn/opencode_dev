# express-greenborn-sso-back

Autenticación **SSO (Single Sign-On)** para backends **Express/Node.js** que se integra con el servidor de autenticación de Greenborn (`https://auth.greenborn.com.ar`).

Generaliza el código de autenticación del backend de referencia (`GFC-Back`) y lo expone como un paquete reutilizable, con **inyección de dependencias** (knex, logger, caché) y **agnóstico del esquema de base de datos**. Funciona como contraparte de backend de [`vue-greenborn-sso-front`](https://github.com/Greenborn/opencode_dev/tree/main/vue-greenborn-sso-front).

Incluye:

- **`authMiddleware`** — valida tokens locales y SSO, sincroniza el usuario y maneja reautenticación/renovación.
- **`authMiddlewareOptional`** — variante que nunca falla si falta el token.
- **`router`** — router Express con `GET /me`, `GET /sso-profile` y `POST /register` (rama SSO).
- **Rate limiting por IP** — protege el login local y la validación de tokens contra fuerza bruta (3 intentos fallidos cada 5 minutos por defecto).
- Helpers expuestos: `syncSsoUser`, `resolveSsoRole`, `verifySsoToken`, `extendSsoSession`, `normalizeUniqueId`.

---

## Instalación

```bash
npm install express-greenborn-sso-back
```

Requisitos: Node.js ≥ 18, Express `^4`, y una instancia de **Knex** configurada.

## Uso básico

```js
import { createSsoAuth } from 'express-greenborn-sso-back';
import express from 'express';
import knex from 'knex';

const db = knex({ /* conexión a tu base de datos */ });

const sso = createSsoAuth({
  knex: db,                                   // obligatorio (inyectado, no usa global.knex)
  ssoBaseUrl: process.env.URL_AUTH_SERVICE,   // default: https://auth.greenborn.com.ar
  ssoRoleMap: process.env.SSO_ROLE_MAP,       // default: env SSO_ROLE_MAP
  defaultRoleId: 3,                           // rol por defecto (Concursante)
  rbac: true,                                 // opcional: esquema de roles/permisos M2M
  logger: console,
});

const app = express();
app.use(express.json());

// Router SSO completo: /me, /sso-profile, /register
app.use('/api/user', sso.router);

// Protege tus propias rutas
app.get('/api/protected', sso.authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000);
```

## Opciones de `createSsoAuth`

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `knex` | object | **obligatorio** | Instancia de Knex. Reemplaza `global.knex`. |
| `ssoBaseUrl` | string | `https://auth.greenborn.com.ar` | Base del servidor SSO (antes `URL_AUTH_SERVICE`). |
| `ssoRoleMap` | object \| string | env `SSO_ROLE_MAP` | Mapa `{email: role_id, "*@dominio": role_id}`. |
| `defaultRoleId` | number | `3` | Rol asignado cuando no hay match en el mapa. |
| `ssoTimeoutMs` | number | `5000` | Timeout de llamadas al SSO. |
| `cache` | object | `new MemoryCache()` | Caché de tokens (inyectable, API `get/set/delete`). |
| `cacheTtlMs` | number | `12h` | TTL de la caché de tokens. |
| `logger` | object | `console` | `{ error, warn, log }`. Reemplaza `LogOperacion`. |
| `tables` | object | ver abajo | Nombres de tablas/columnas. |
| `sensitiveFields` | string[] | ver abajo | Campos a filtrar en respuestas. |
| `findLocalUserByToken` | fn | interna | Valida un token local. Reemplazable. |
| `createUserFromSso` | fn | interna | Hook de mapeo SSO → DB. |
| `sendReauthHeader` | boolean | `true` | Emite header `X-New-Token` al renovar sesión. |
| `ssoClient` | object | interno | Cliente HTTP SSO (`{ verifyToken, extendSession }`), útil para testear. |
| `rbac` | boolean \| object | `false` | Habilita el modo RBAC M2M (esquema de roles/permisos). Ver abajo. |
| `localLogin` | boolean \| object | `null` | Habilita el **login local** (usuario/contraseña) como alternativa a Google. Ver abajo. |
| `activityLog` | boolean \| object | `false` | Habilita el **registro de actividad** en todas las rutas autenticadas. Ver abajo. |
| `rateLimit` | boolean \| object | `true` | Rate limit por IP de intentos fallidos de login y de tokens. Ver abajo. |

### `tables` por defecto

```js
{
  user: 'user',
  userTokens: 'user_tokens',
  profile: 'profile',
  accessTokenField: 'access_token',   // fallback legacy
  activeTokensField: 'is_active',
  lastUsedAtField: 'last_used_at',
  tokenField: 'token',
  expiresAtField: 'expires_at',
}
```

### `sensitiveFields` por defecto

```js
['password_hash', 'access_token', 'password_reset_token', 'sign_up_verif_code', 'sign_up_verif_token', 'updated_at']
```

## Middlewares

### `authMiddleware`
1. Extrae el `Bearer` token (401 si falta).
2. **Token local**: valida contra la tabla de tokens (o fallback `access_token`) y carga el usuario.
3. **Caché**: si el token SSO ya fue validado, reutiliza el resultado.
4. **SSO verify**: `GET {ssoBaseUrl}/auth/verify?unique_id=...` con el bearer token.
5. **Errores**:
   - sin `unique_id` → `400`.
   - `TOKEN_EXPIRED` / `INVALID_TOKEN` / `401` / `require_reauth` → intenta renovar con `POST /auth/extend`; si falla, responde `401 { require_reauth: true }`.
   - SSO no disponible → `500`.
6. En reautenticación exitosa emite el header `X-New-Token` con el nuevo bearer.

> Cuando el token SSO es válido y el usuario **no existe** localmente, se crea automáticamente (perfil + usuario) con el rol del mapa.

### `authMiddlewareOptional`
Igual que `authMiddleware` pero nunca responde con error por falta de token o `unique_id`; solo autentica si puede.

## Router (`sso.router`)

Monta un router Express con:

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/me` | `authMiddleware` | Devuelve el usuario autenticado (filtra campos sensibles). |
| GET | `/sso-profile` | manual | Verifica el token SSO y busca el usuario local por email (`{ success, exists, user }`). |
| POST | `/register` | manual | Registro SSO: valida token + `unique_id` y crea el usuario. |
| POST | `/logout` | `authMiddleware` | Cierra la sesión. Si la sesión es SSO revoca tokens de Google vía `/auth/logout` del servicio SSO; además desactiva el token local en `user_tokens`. Requiere `unique_id` en query param cuando la sesión es SSO. Responde `{ success, message, data: { local, sso } }`. |

> `/sso-profile` y `/register` están cubiertos por el rate limit de tokens (ver [Rate limiting](#rate-limiting-anti-fuerza-bruta)). Si el SSO rechaza el token (`401`/`403`) responden `401 { success: false, message: 'Token SSO inválido' }`.

Ejemplo de respuesta `/me`:

```json
{
  "success": true,
  "user": { "id": 4, "username": "lucho.2012.tandil", "email": "lucho@...", "role_id": 3, "profile_id": 31, "status": 1 }
}
```

## Mapeo de roles (`SSO_ROLE_MAP`)

```env
# .env
# 1=Administrador, 2=Delegado, 3=Concursante
SSO_ROLE_MAP={"admin@greenborn.com.ar":1,"*@delegados.greenborn.com.ar":2}
```

Reglas:
1. **Match exacto**: `admin@greenborn.com.ar` → role `1`.
2. **Match por dominio** (prefijo `*`): `*@delegados...` → cualquier email que termine en ese dominio obtiene ese role.
3. **Sin match** → `defaultRoleId` (por defecto `3`).
4. **Variable ausente/inválida** → `defaultRoleId`.

## Integración con `vue-greenborn-sso-front`

Los endpoints que consume el frontend son justamente los que expone este router:

| Frontend (`useSsoAuth`) | Backend (este paquete) |
|--------------------------|-------------------------|
| `user/sso-profile?unique_id=...` | `GET /sso-profile` |
| `user/me` | `GET /me` |
| `user/logout?unique_id=...` | `POST /logout` |

## Modo RBAC (roles y permisos M2M)

Por defecto el paquete usa el modelo *legacy* de un solo rol por usuario (columna `user.role_id`), como en `GFC-Back`. Para usar el **mismo esquema de roles y permisos** de `sistema-gestion-interno`, activa la opción `rbac`:

```js
const sso = createSsoAuth({
  knex: db,
  rbac: true, // usa el esquema M2M de roles/permisos
});
```

Con `rbac: true` el paquete espera (y sincroniza) estas tablas, coincidiendo con el esquema de sgi:

```
usuarios  (id, ...)
roles     (id, nombre, ...)
permisos  (id, nombre, ...)
usuarios_roles  (usuario_id, rol_id)          -- M2M usuario <-> rol
roles_permisos  (rol_id, permiso_id)          -- M2M rol <-> permiso
```

Los nombres de tablas/columnas son configurables:

```js
rbac: {
  rolesTable: 'roles',
  permissionsTable: 'permisos',
  userRolesTable: 'usuarios_roles',
  rolePermissionsTable: 'roles_permisos',
  userIdCol: 'usuario_id',
  roleIdCol: 'rol_id',
  permissionIdCol: 'permiso_id',
  roleNameCol: 'nombre',
  permissionNameCol: 'nombre',
  userPk: 'id',
}
```

### Comportamiento con `rbac`
- Al sincronizar un usuario SSO (nuevo o existente) se enlaza al rol resuelto por `SSO_ROLE_MAP` vía `usuarios_roles` (sin tocar un `role_id` único).
- `GET /me` y `GET /sso-profile` devuelven `roles[]` y `permisos[]` (arrays de nombres) además del usuario, el mismo contrato que consume el frontend de sgi.

### Autorización por permiso y rol

```js
// Requiere todos los permisos listados (modo RBAC: lee usuarios_roles/roles_permisos)
app.get('/api/projects', sso.authMiddleware, sso.requirePermission('proyectos.ver', 'proyectos.editar'), handler);

// Requiere al menos uno de los roles
app.get('/api/admin', sso.authMiddleware, sso.requireRole('ADMIN'), handler);
```

> Sin `rbac`, `requireRole` compara contra `role_id` y `requirePermission` falla (no existen permisos en el esquema legacy); por eso `requirePermission` se recomienda únicamente con `rbac`.

### Gestión administrativa de usuarios (`deleteUser` / `updateUser`)

Con `rbac` configurado, `sso` expone dos funciones para borrar o modificar usuarios desde los propios endpoints del consumidor, reutilizando la limpieza de relaciones RBAC (`usuarios_roles`) para no dejar FKs huérfanas:

```js
const sso = createSsoAuth({
  knex,
  tables: { user: 'usuarios' },
  rbac: true,
  adminRoles: ['administrador'], // o: isUserAdmin: async (actorId, ctx) => { ... }
});

app.delete('/user/delete_one', requireLogin, requirePermission('usuarios.eliminar'), async (req, res) => {
  const actorId = req.session.u_data.id;
  await sso.deleteUser(req.body.id, { actorId });
  res.json({ ok: true });
});
```

Ambas funciones **exigen `actorId`** y verifican que sea administrador antes de tocar la base: por `adminRoles` (array de nombres de rol, resuelto vía `resolveUserRoles`) o por una función custom `isUserAdmin(actorId, ctx)`. Si no se configura ninguno de los dos, las funciones **fallan cerrado** (lanzan error), nunca dejan pasar por defecto. Esto hace que adoptar la función sea explícito: si no las llamás, actualizar la versión del paquete no cambia nada en tu proyecto.

Este chequeo es una **defensa adicional**, no sustituye el control de acceso a nivel de ruta (`requirePermission`/middleware propio del consumidor): seguí protegiendo la ruta igual que antes.

- `deleteUser(userId, { actorId, allowSelfDelete })`: borra las filas de `usuarios_roles` del usuario y luego el usuario. Lanza error si `userId` no existe (`USER_NOT_FOUND`), o si `actorId === userId` y no se pasó `allowSelfDelete: true` (`SELF_DELETE_NOT_ALLOWED`).
- `updateUser(userId, data, { actorId })`: actualiza los campos simples de `data` en la tabla de usuarios; si `data.roles` es un array, reemplaza por completo las filas de `usuarios_roles` de ese usuario. Devuelve el usuario actualizado.

Ninguna de las dos funciones toca la tabla de tokens (`userTokens`): queda fuera de alcance porque no hay una convención de columna FK confiable para esa tabla en el esquema genérico del paquete. Tampoco son atómicas (no usan una transacción entre el borrado/alta de relaciones y la escritura del usuario) — mejora pendiente.

Códigos de error (`err.code`): `MISSING_ACTOR_ID`, `ADMIN_CHECK_NOT_CONFIGURED`, `FORBIDDEN_NOT_ADMIN`, `USER_NOT_FOUND`, `SELF_DELETE_NOT_ALLOWED`, `RBAC_NOT_CONFIGURED`, `INVALID_ROLES`.

### Mapeo de usuario SSO → sgi
La tabla `usuarios` de sgi **no tiene email** y su auth es JWT local. Para integrar, proporciona el hook `createUserFromSso` en el proyecto consumidor (por ejemplo, mapeando `ssoUser.email` a `username` y asignando el rol por mapa), sin modificar el esquema de sgi:

```js
createUserFromSso: async (ssoUser, ctx) => {
  // ... crear/actualizar el usuario en tu tabla y enlazar rol en usuarios_roles
}
```

## Login local (usuario/contraseña) — opcional

El login **SSO con Google es opcional**. Puedes usarlo solo como autenticador de tokens, o bien habilitar un **login local** (`POST {endpoint}`) que valida usuario/contraseña contra tu tabla y emite un bearer token local (el mismo que acepta `authMiddleware` vía `findLocalUserByToken`).

```js
const sso = createSsoAuth({
  knex: db,
  localLogin: {
    endpoint: '/login',              // default
    passwordField: 'password_hash',  // columna con el hash de la contraseña
    tokenTtlMs: 8 * 60 * 60 * 1000,  // opcional: expiración del token local
    verifyPassword: async (password, hash) => bcrypt.compare(password, hash),
  },
});
```

- Con `localLogin: true` se usan los defaults (columna `password_hash`) — necesitarás proveer `verifyPassword`.
- Para lógica de validación personalizada (buscar por otro campo, hashing propio, etc.) usa `handler(username, password, ctx)`:

```js
localLogin: {
  handler: async (username, password, ctx) => {
    const user = await ctx.knex('usuarios').where({ username }).first();
    if (!user || !(await checkPassword(password, user.password))) return null;
    return user;
  },
}
```

- El endpoint responde `{ success: true, data: { token, user } }` (filtra campos sensibles). Si en modo RBAC, `user` incluye `roles[]`/`permisos[]`.
- El token emitido se guarda en la tabla de tokens (`user_tokens` por defecto), por lo que `authMiddleware` lo acepta igual que un token local.

> Sin `localLogin` no se expone la ruta `/login` y el paquete solo valida tokens (SSO y/o locales).

## Rate limiting (anti fuerza bruta)

Por defecto el paquete limita por IP los intentos **fallidos** de autenticación:

- **Login** (`POST /login`): hasta **3 intentos fallidos cada 5 minutos**; el 4.º intento (y los siguientes hasta vencer el bloqueo) responde `429`.
- **Tokens** (rutas protegidas con `authMiddleware`, `GET /sso-profile`, `POST /register` y el handshake de socket.io): mismo límite, para frenar el sondeo de tokens al azar.
- Un login/autenticación **exitosa resetea** los fallos de esa IP.
- Los intentos bloqueados **no** extienden el bloqueo.
- Solo cuentan fallos reales de autenticación (`401`). No cuentan: token ausente, `400`, `403`, ni `500`.

La respuesta al bloquear es:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 300
```

```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Demasiados intentos de login fallidos. Intente nuevamente más tarde.",
  "retry_after_ms": 300000
}
```

### Configuración

```js
const sso = createSsoAuth({
  knex: db,
  rateLimit: {
    maxAttempts: 3,        // intentos fallidos permitidos por ventana
    windowMs: 5 * 60 * 1000, // ventana deslizante (5 min)
    blockMs: 5 * 60 * 1000,  // duración del bloqueo (default = windowMs)
    trustProxy: 1,         // cantidad de proxies confiables (lee X-Forwarded-For)
    maxEntries: 10000,     // tope de IPs en memoria
    onBlocked: ({ kind, key, retryAfterMs }) => { /* log opcional */ },
  },
});
```

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Activa/desactiva el limiter. |
| `maxAttempts` | number | `3` | Fallos permitidos antes de bloquear. |
| `windowMs` | number | `300000` | Ventana deslizante de conteo (ms). |
| `blockMs` | number | `windowMs` | Duración del bloqueo (ms). |
| `trustProxy` | boolean \| number | `false` | Si es `true`/número, lee `X-Forwarded-For` contando esa cantidad de saltos desde la derecha. |
| `maxEntries` | number | `10000` | Máximo de IPs guardadas (evita crecimiento de memoria). |
| `keyGenerator` | fn | — | Sobrescribe la clave (`req` → string). |
| `onBlocked` | fn | — | Callback al bloquear una request. |

Para desactivarlo por completo:

```js
const sso = createSsoAuth({ knex: db, rateLimit: false });
```

### Proteger endpoints propios

El limiter se aplica automáticamente a `authMiddleware`, `sso-profile`, `register`, `/login` y socket.io. Para rutas propias que validan credenciales o tokens a mano:

```js
// Login propio
app.post('/api/mi-login', sso.loginRateLimit, async (req, res) => { /* ... */ });

// Ruta que valida un token sin authMiddleware
app.get('/api/mi-ruta', sso.tokenRateLimit, async (req, res) => { /* ... */ });
```

`tokenRateLimit` es idempotente: montarlo junto a `authMiddleware` no duplica el conteo.

También se expone `sso.rateLimiter` para control manual:

```js
sso.rateLimiter.check('login', req);         // { blocked, retryAfterMs }
sso.rateLimiter.recordFailure('token', req);
sso.rateLimiter.reset('login', req);         // desbloquea una IP
sso.rateLimiter.clear();                     // limpia todo
```

### IP real detrás de un proxy

- Si configurás `app.set('trust proxy', ...)` en Express, `req.ip` ya refleja la IP real.
- El limiter por su parte puede leer `X-Forwarded-For` con `rateLimit.trustProxy` (útil también para el handshake de socket.io, que no pasa por Express). Ajustalo a la cantidad de proxies confiables delante de la app (nginx delante del backend = `1`).
- **No** habilites `trustProxy` si la app recibe tráfico directo sin proxy: un cliente podría falsificar `X-Forwarded-For` y evadir el límite.

> **Alcance**: el rate limiter es **en memoria y por proceso**. Con múltiples instancias/PM2 en cluster cada proceso lleva su propio contador; para un límite global hace falta un store compartido (Redis), fuera del alcance del paquete.

## Registro de actividad (`activityLog`)

Registra una fila por cada request autenticado (todas las rutas protegidas con `authMiddleware` o `authMiddlewareOptional` con sesión) en la tabla `gb_sso_log_actividad` (prefijo abreviado del paquete).

Se activa con la opción `activityLog`:

```js
const sso = createSsoAuth({
  knex: db,
  activityLog: true, // o un objeto de configuración
});
```

### Configuración

```js
activityLog: {
  table: 'gb_sso_log_actividad', // nombre de la tabla
  maxStringLen: 4096,            // strings más largos se excluyen
  captureBody: true,             // incluir req.body en datos de entrada
  captureQuery: true,            // incluir req.query en datos de entrada
}
```

### Campos de la tabla

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | bigint PK | Autoincremental. |
| `fecha_hora` | timestamp | Fecha y hora del request (default `NOW()`). |
| `endpoint` | varchar(512) | Ruta del request (`req.originalUrl`). |
| `id_usuario` | bigint nullable | ID del usuario autenticado (`req.user.id` o `userPk`). |
| `metodo` | varchar(10) | Método HTTP (`GET`, `POST`, ...). |
| `ipv4` | varchar(45) nullable | Dirección IPv4 del cliente. |
| `ipv6` | varchar(45) nullable | Dirección IPv6 del cliente. |
| `datos_entrada` | json nullable | Body + query serializados (solo si hay). |

> **Datos de entrada**: se excluyen automáticamente los campos cuyo valor sea una cadena **base64** o una cadena de **más de 4096 caracteres**. Los strings excesivos en posiciones anidadas se reemplazan por `[excluido: ...]`.

### Migración y creación automática

- Se incluye el archivo de migración `migrations/20260816000000_create_gb_sso_log_actividad.js` (ejecutalo con `knex migrate:latest`).
- Además, al inicializar con `activityLog` activo la librería ejecuta `CREATE TABLE IF NOT EXISTS` de forma no bloqueante (auto-provisioning).

> **IP / proxy**: la IP se obtiene de `req.ip`, por lo que si la app corre detrás de un proxy reverso debes configurar `app.set('trust proxy', true)` (o el valor adecuado) para obtener la IP real del cliente. Las direcciones IPv4 mapeadas a IPv6 (`::ffff:x.x.x.x`) se normalizan a IPv4.

## WebSocket complementario (socket.io)

Añade una conexión persistente y autenticada sobre el **mismo** `http.Server` de Express para transmitir mensajes genéricos con callbacks por función (Pub/Sub + ACK).

```js
const server = app.listen(3000);

const socket = sso.attachSocket(server, {
  path: '/socket.io',        // default
  corsOrigin: '*',           // string | string[]
});

// Handler por función: el cliente invoca emit('echo', payload, ack)
socket.onFunction('echo', ({ payload, ack, user }) => {
  ack({ success: true, echo: payload, user: user?.id });
});

// Push back→front
socket.emitToUser(userId, 'notificacion', { texto: 'hola' });
socket.broadcast('ping', { ts: Date.now() });
```

- **Autenticación**: cada conexión envía el bearer token en el handshake (`auth: { token, unique_id }`). Se valida primero como token local (`findLocalUserByToken`) y luego contra el SSO (`verifySsoToken`), sincronizando el usuario. Fallo → rechazo de conexión.
- **Rate limit**: el handshake usa el mismo contador de tokens por IP; tras `maxAttempts` fallos la conexión se rechaza con `unauthorized: demasiados intentos fallidos, reintente más tarde` hasta vencer el bloqueo.
- Cada socket autenticado se une a las rooms `user:{id}` y `user:{email}`.
- API del manager: `onFunction`, `onConnection`, `emitToUser`, `emitToRoom`, `broadcast`, `close`, y `io`.
- Contraparte de frontend: `vue-greenborn-sso-front` → `useSsoSocket` / `createSocketClient`.

## Scripts

```bash
npm run build          # genera dist/ (ESM + CJS + .d.ts) con esbuild
npm test               # ejecuta la suite con node:test
npm run verify:publish # verifica que la versión de package.json esté publicada
npm run release        # build + npm publish (postpublish corre verify:publish)
npm run demo           # levanta el servidor de demostración en el puerto 5175
```

### Verificación de publicación (anti caché)

`npm publish` marca la versión como `latest`, pero el registry/CDN de npm puede seguir sirviendo metadatos cacheados por unos minutos. Para confirmar la publicación sin caer en ese caché, `scripts/verify-publish.mjs` consulta el registry con cache-busting (`?<timestamp>` + `Cache-Control: no-cache`) y reintenta:

- Se ejecuta solo, como `postpublish`, después de cada `npm publish`.
- Manualmente: `npm run verify:publish`.
- Salidas: código `0` si la versión aparece en `versions` y en `dist-tags.latest`; `1` si tras los reintentos no aparece.
- Overrides por entorno: `REGISTRY_URL`, `VERIFY_ATTEMPTS` (default `30`), `VERIFY_DELAY_MS` (default `5000`).

> En los proyectos consumidores, si `npm install` no ve la versión nueva por caché local, forzá el refresco con `npm install express-greenborn-sso-back@<version> --prefer-online` (o `npm cache clean --force` antes de instalar).

## Demo

```bash
cp demo/env.example .env   # ajusta credenciales
npm run demo
```

Corre en el puerto **5175**.

## Licencia

MIT
