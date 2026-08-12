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
