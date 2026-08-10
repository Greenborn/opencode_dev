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
