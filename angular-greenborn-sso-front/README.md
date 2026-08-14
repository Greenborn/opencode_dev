# angular-greenborn-sso-front

Cliente SSO (Single Sign-On) para aplicaciones **Angular 21**. Integra login con Google (OAuth), intercambio de token temporal por bearer token, verificación de sesión, logout, renovación de token (`X-New-Token`), guard de rutas y WebSocket complementario (`socket.io`). Compatible con `express-greenborn-sso-back`.

## Instalación

```bash
npm install angular-greenborn-sso-front
```

Peer dependencies: `@angular/common`, `@angular/core`, `@angular/router` (`^21.0.0`) y `rxjs` (`^7.5.0`).

## Configuración

Define la configuración SSO con las claves de `SSOConfig`:

| Clave | Tipo | Requerido | Descripción |
|---|---|---|---|
| `ssoBaseUrl` | `string` | sí | Base del servidor SSO, ej. `https://auth.greenborn.com.ar` |
| `ssoRedirect` | `string` | sí | Ruta que procesa el callback, ej. `/#/login-redirect` (hash) o `/login-redirect` |
| `nodeApiBaseUrl` | `string` | no | Base del API Node local (para `user/sso-profile`). **También se usa como prefijo para el interceptor de axios.** |
| `appName` | `string` | no | Prefijo de clave de token local, ej. `app_gfc_prod-` (default `''`) |
| `tokenKey` | `string` | no | Override directo de la clave de token local (default `appName + 'token'`) |
| `wsUrl` | `string` | no | Base del servidor WebSocket (opcional) |
| `wsPath` | `string` | no | Ruta del socket (default `/socket.io`) |
| `onSessionExpired` | `() => void` | no | Callback al expirar la sesión (`require_reauth`) |

## Errores comunes / anti-patterns

> **Objetivo:** evitar que se repitan bugs por **configuración vacía** o por **acceder al
> SSO fuera de la inyección de dependencias**. Regla de oro: **la config vive en el provider
> `SSO_CONFIG` y el servicio se obtiene SOLO por inyección de dependencias (constructor)**.
> Nunca se crea una config "al vuelo" dentro de un método ni se instancia el servicio a mano.

### 1. Olvidar `provideSso(...)` → config vacía

`SSOAuthService` está `providedIn: 'root'`, así que **siempre** es inyectable. Pero su config
proviene del *InjectionToken* `SSO_CONFIG`, que **solo tiene valor si registras `provideSso()`**
en los providers del bootstrap o del módulo:

```ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes, withHashLocation()), provideSso(SSO_CONFIG)],
});
```

Si olvidas `provideSso(...)`, el constructor recibe `config = null` y cae en
`normalizeConfig({})` → **`ssoBaseUrl` y `nodeApiBaseUrl` quedan vacíos**. Consecuencias:
`login()` navega a `/auth/google` roto, `handleCallback` no verifica el perfil local y el
interceptor de axios no agrega `Authorization`/`unique_id` (errores `unique_id requerido`).
Es el equivalente Angular de un error del tipo "Login local requiere nodeApiBaseUrl".

### 2. NO instanciar `SSOAuthService` a mano ni en métodos

Nunca hagas `new SSOAuthService(...)` ni intentes construir la config en el punto de uso.
Eso **pierde el provider** y genera una instancia/conexión distinta a la registrada.
El servicio debe llegar SIEMPRE por inyección en el `constructor`:

```ts
export class HomeComponent {
  constructor(private ssoAuth: SSOAuthService) {}   // ✅ provider + config
  // ❌ mal: const sso = new SSOAuthService(...) dentro de un método
}
```

> **Regla:** si un componente/servicio necesita SSO, inyéctalo en su `constructor`. Nunca lo
> crees dentro de un handler/método, porque ahí no tienes acceso garantizado al `SSO_CONFIG`
> del provider (mismo error de "config vacía" que ocurrió en el frontend Vue con
> `useSsoAuth()` llamado fuera de `setup()`).

### 3. `normalizeConfig` / `SSO_CONFIG` son para el provider, no para uso puntual

`provideSso(SSO_CONFIG)` y `normalizeConfig(...)` ya aplican los defaults (`appName`,
`tokenKey`, `ssoRedirect`, `wsPath`). No los vuelvas a invocar en cada consumo para
"reconstruir" la config; usa la inyectada vía `ssoAuth.config`.

### Checklist rápido

- [ ] `provideSso(SSO_CONFIG)` presente en `main.ts` **antes** de `bootstrapApplication`.
- [ ] `installSsoAxiosInterceptors(SSO_CONFIG).install()` llamado **una vez** (`.install()` obligatorio).
- [ ] `nodeApiBaseUrl` definido si usas perfil local / interceptor.
- [ ] El servicio se inyecta en el `constructor`; nunca `new ...` ni construir config en métodos.

## Uso / Instalación de interceptores

> **Importante:** `installSsoAxiosInterceptors(...)` **NO** registra los interceptores por sí sola.
> Retorna un objeto con métodos `install()`, `isInstalled()` y `clearSession()`, y los interceptores
> de axios solo se registran al llamar a **`.install()`**.

El interceptor de request agrega automáticamente a las llamadas al API local (las URLs que empiezan con
`nodeApiBaseUrl`, ej. `user/{id}?expand=...`):

- el header `Authorization: Bearer <token>`, y
- el query param `unique_id`.

Sin esto, el backend rechaza las peticiones con un **HTTP 400** del estilo
`{"success":false,"message":"unique_id requerido en query param"}`.

### Ejemplo mínimo completo

En `main.ts`, llama a `.install()` una sola vez, **antes** de `bootstrapApplication`:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideSso, installSsoAxiosInterceptors } from 'angular-greenborn-sso-front';
import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';

const SSO_CONFIG = {
  ssoBaseUrl: 'https://auth.greenborn.com.ar',
  ssoRedirect: '/#/login-redirect',
  nodeApiBaseUrl: 'https://mi-app.api2.greenborn.com.ar/api/',
  appName: 'app_gfc_prod-',
};

// Registra los interceptores de axios (¡no olvidar .install()!)
installSsoAxiosInterceptors(SSO_CONFIG).install();

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideSso(SSO_CONFIG),
  ],
}).catch((err) => console.error(err));
```

### Firma y opciones

```ts
installSsoAxiosInterceptors(
  config: Partial<SSOConfig>,
  instance?: AxiosInstance // por defecto `axios`
): SsoAxiosInterceptors;
```

El objeto retornado expone:

| Método | Descripción |
|---|---|
| `install()` | Registra los interceptores de request/response/error en la instancia. Llamar una vez (idempotente: no duplica si ya está instalado). |
| `isInstalled()` | Devuelve `boolean` indicando si los interceptores ya fueron registrados. |
| `clearSession()` | Limpia el token, el usuario y el `unique_id` del `localStorage`. |

Puedes pasarte tu propia instancia de axios (p. ej. con un `baseURL` distinto) en `instance`.

## Proveedor SSO

Registra el servicio en la inyección de dependencias de Angular:

```ts
provideSso(SSO_CONFIG)
```

## Login con Google

```ts
import { SSOAuthService } from 'angular-greenborn-sso-front';

export class HomeComponent {
  constructor(private ssoAuth: SSOAuthService) {}

  login() {
    this.ssoAuth.login(); // redirige al servidor SSO (/auth/google)
  }
}
```

## Callback

El paquete incluye `SsoCallbackComponent` (selector `gb-sso-callback`) para procesar el retorno del SSO.
Maneja el token temporal, intercambia por bearer token, verifica el perfil local y redirige.

```ts
import { Component } from '@angular/core';
import { SsoCallbackComponent, SSOCallbackResult } from 'angular-greenborn-sso-front';

@Component({
  standalone: true,
  imports: [SsoCallbackComponent],
  selector: 'app-callback',
  template: `
    <gb-sso-callback
      registerPath="/registro"
      fallbackPath="/"
      (success)="onSuccess($event)"
      (error)="onError($event)"
    ></gb-sso-callback>
  `,
})
export class CallbackComponent {
  onSuccess(result: SSOCallbackResult) { console.log('SSO ok', result); }
  onError(err: Error) { console.error('SSO error', err); }
}
```

Inputs: `registerPath` (default `/registro`), `fallbackPath` (default `/`), `autoRedirect` (default `true`).
Outputs: `success`, `error`, `noParams`.

## Servicios

- **`SSOAuthService`** — `login()`, `handleCallback(token, uniqueId)`, `verifySession()`, `logout()`,
  `getToken()`, `getUser()`, `isSSOSession()`, `getUniqueId()`, `getAndClearRedirectUrl()`,
  `getLocalToken()`/`setLocalToken()`.
- **`SSOSocketService`** — WebSocket complementario (socket.io); expone `connected$`.
- **`RoleService`** — utilidad para nombres de rol (`roleName(role_id)`).

## Conexión WebSocket (socket.io) y CORS

`SSOSocketService` expone un WebSocket complementario (socket.io) sobre `wsUrl`/`wsPath`.
El servicio envía el bearer token (SSO o local) y el `unique_id` en el `handshake`; el backend
los valida y autentica la conexión.

### En el frontend

Configura `wsUrl` y `wsPath` en `SSO_CONFIG`, y conecta **solo si hay sesión iniciada**:

```ts
import { SSOSocketService, SSOAuthService } from 'angular-greenborn-sso-front';

// SSO_CONFIG con:
//   wsUrl: 'https://mi-app.api2.greenborn.com.ar',
//   wsPath: '/socket.io',
```

```ts
// En AppComponent (o un servicio root):
constructor(
  private ssoAuth: SSOAuthService,
  private ssoSocket: SSOSocketService,
) {}

ngOnInit() {
  // Solo intentar conectar si hay sesión (SSO o token local)
  if (!this.ssoAuth.isSSOSession() && !localStorage.getItem('token')) return;

  this.ssoSocket.connected$.subscribe(connected => {
    if (connected) console.log('[WebSocket] Conexión establecida');
  });

  this.ssoSocket.connect();
}
```

> La reconexión automática la maneja el cliente (`reconnection: true`), no es necesario
> implementarla manualmente.

### En el backend

> **Importante:** el header `Access-Control-Allow-Origin` del `/socket.io` lo emite el propio
> servidor socket.io (no nginx). Su valor se controla con `CORS_ORIGIN`.

El backend compatible (`express-greenborn-sso-back` → `createSsoSocket`) configura el CORS del
socket con `cors: { origin: corsOrigin }`. Si el **origen del frontend no está en `CORS_ORIGIN`**,
el navegador bloquea la lectura de la respuesta: el servidor responde `200` (con el `sid`) pero
**sin** el header `Access-Control-Allow-Origin`, y aparece un error del tipo:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource
at https://.../socket.io/?EIO=4&transport=polling...
(Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 200.
```

Para corregirlo, en el `.env` del backend agrega el origen del frontend a `CORS_ORIGIN`
(separado por espacios) y reinicia el proceso:

```env
CORS_ORIGIN=http://localhost:3000 http://localhost:4200 https://mi-app.greenborn.com.ar
```

### En nginx

nginx **no** agrega el header CORS del socket, pero **debe** proxear la ruta `/socket.io` y
forwardear los headers de upgrade para que el transporte **websocket** funcione tras el
*handshake* inicial (polling):

```nginx
location / {
    proxy_pass http://127.0.0.1:<BACKEND_PORT>;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

Sin el forward de `Upgrade`/`Connection`, el *handshake* polling funciona pero el upgrade a
websocket falla.

## Guard de rutas

```ts
import { SSOAuthGuard } from 'angular-greenborn-sso-front';

// routes: { path: 'perfil', canActivate: [SSOAuthGuard], loadChildren: ... }
```

Redirige a `/login` si no hay sesión SSO activa.

## API pública

```ts
export {
  SSOConfig, SSO_CONFIG, provideSso, normalizeConfig,        // config
  SSO_TOKEN_KEY, SSO_USER_KEY, SSO_REDIRECT_URL_KEY,          // keys
  SSO_CLIENT_UNIQUE_ID, generateUniqueId, safeGet, safeSet, safeRemove,
  createSocketClient, SocketClient, SocketClientOptions,      // socket
  SocketError, SocketEvent, EventHandler,
  SSOAuthService, SSOSocketService, RoleService,              // services
  SSOAuthGuard,                                              // guard
  installSsoAxiosInterceptors, SsoAxiosInterceptors,          // interceptor axios
  SSOCallbackParams, SSOUser, SSOLoginResponse,               // modelos
  SSOVerifyResponse, SSOProfileResponse, SSOCallbackResult,
  SSOVerifyResult, SSOSessionState,
  SsoCallbackComponent,                                      // componente
};
```

## Repositorio

- Código fuente: <https://github.com/Greenborn/opencode_dev/tree/main/angular-greenborn-sso-front>
- Backend compatible: `express-greenborn-sso-back`

## Licencia

MIT
