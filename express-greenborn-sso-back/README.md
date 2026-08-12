# express-greenborn-sso-back

Autenticación **SSO (Single Sign-On)** para backends **Express/Node.js** que se integra con el servidor de autenticación de Greenborn (`https://auth.greenborn.com.ar`).

Generaliza el código de autenticación del backend de referencia (`GFC-Back`) y lo expone como un paquete reutilizable, con **inyección de dependencias** (knex, logger, caché) y **agnóstico del esquema de base de datos**. Funciona como contraparte de backend de [`vue-greenborn-sso-front`](https://github.com/Greenborn/opencode_dev/tree/main/vue-greenborn-sso-front).

Incluye:

- **`authMiddleware`** — valida tokens locales y SSO, sincroniza el usuario y maneja reautenticación/renovación.
- **`authMiddlewareOptional`** — variante que nunca falla si falta el token.
- **`router`** — router Express con `GET /me`, `GET /sso-profile` y `POST /register` (rama SSO).
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
- Cada socket autenticado se une a las rooms `user:{id}` y `user:{email}`.
- API del manager: `onFunction`, `onConnection`, `emitToUser`, `emitToRoom`, `broadcast`, `close`, y `io`.
- Contraparte de frontend: `vue-greenborn-sso-front` → `useSsoSocket` / `createSocketClient`.

## Scripts

```bash
npm run build   # genera dist/ (ESM + CJS + .d.ts) con esbuild
npm test        # ejecuta la suite con node:test
npm run demo    # levanta el servidor de demostración en el puerto 5175
```

## Demo

```bash
cp demo/env.example .env   # ajusta credenciales
npm run demo
```

Corre en el puerto **5175**.

## Licencia

MIT
