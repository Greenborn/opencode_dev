# vue-greenborn-sso-front

Cliente de **SSO (Single Sign-On)** para aplicaciones **Vue 3** que se integra con el servidor de autenticación de Greenborn (`https://auth.greenborn.com.ar`).

Replica el flujo de autenticación SSO del frontend de referencia (`GFC-Front`, Angular) y lo expone de forma idiomática para Vue:

- **Login con Google (OAuth)**
- Intercambio de token temporal por **bearer token**
- Verificación de sesión activa (`verify`)
- Cierre de sesión (`logout`)
- Componente **callback** reutilizable para `vue-router`
- **WebSocket complementario** (socket.io) con mensajes genéricos y callbacks por función

Sin dependencias de UI. JS plano (sin TypeScript), estados reactivos con `ref`/`computed`.

---

## Instalación

```bash
npm install vue-greenborn-sso-front
```

Requiere `vue@^3.3` y, si usas el componente `SsoCallback`, también `vue-router@^4`.

## Configuración

Crea un cliente y exponlo a la app mediante `installSso` (un solo punto de configuración):

```js
// main.js
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { installSso } from 'vue-greenborn-sso-front'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login-redirect', component: SsoCallbackPage },
  ],
})

const app = createApp(App)

installSso(app, {
  ssoBaseUrl: 'https://auth.greenborn.com.ar',
  ssoRedirect: '/login-redirect',
  nodeApiBaseUrl: 'https://gfc.api2.greenborn.com.ar/api/',
  wsUrl: 'http://localhost:5175',   // opcional: base del servidor para WebSocket
  wsPath: '/socket.io',             // opcional
})

app.use(router)
app.mount('#app')
```

| Opción            | Tipo   | Obligatoria | Descripción                                                            |
| ----------------- | ------ | ----------- | ---------------------------------------------------------------------- |
| `ssoBaseUrl`      | string | sí          | Base del servidor SSO, ej. `https://auth.greenborn.com.ar`              |
| `ssoRedirect`     | string | sí          | Ruta de la app que procesa el callback, ej. `/login-redirect`           |
| `nodeApiBaseUrl`  | string | no          | Base del API Node local, para verificar el perfil local (`user/sso-profile`) |
| `wsUrl`           | string | no          | Base del servidor WebSocket (solo si se quiere la conexión complementaria) |
| `wsPath`          | string | no          | Ruta del socket, default `/socket.io`                                    |

## Uso básico

### Iniciar sesión (login con Google)

```js
import { useSsoAuth } from 'vue-greenborn-sso-front'

const sso = useSsoAuth()

function loginWithGoogle() {
  sso.login()
}
```

`login()` guarda la URL actual para redirigir de vuelta tras el callback y envía al usuario a `{ssoBaseUrl}/auth/google?...`.

### Página callback

`SsoCallback` lee automáticamente `token` y `unique_id` de la query, intercambia el token temporal por el bearer token y verifica el perfil local. Emite `success`, `error` y `no-params`.

```vue
<template>
  <SsoCallback @success="onSuccess" @error="onError" />
</template>

<script setup>
import { SsoCallback } from 'vue-greenborn-sso-front'

function onSuccess(result) {
  // result.exists: boolean
  // result.localUser / result.ssoEmail / result.bearer_token
  // Si exists es false, el usuario debe registrarse (se redirige a registerPath).
}
</script>
```

Propiedades del componente:

| Prop             | Tipo    | Default       | Descripción                                                        |
| ---------------- | ------- | ------------- | ------------------------------------------------------------------ |
| `registerPath`   | string  | `/registro`   | Ruta a la que ir si el usuario no existe localmente (usuario nuevo) |
| `fallbackPath`   | string  | `/`           | Ruta por defecto tras un callback exitoso                           |
| `autoRedirect`   | boolean | `true`        | Si `false`, no redirige y deja que tu código maneje el resultado     |
| `config`         | object  | `{}`          | Config local (si no se usó `installSso`)                            |

### Verificar sesión

```js
const result = await sso.verifySession()
// result: { authenticated, user?, extended?, requireReauth? }
```

Si el token es inválido o requiere reautenticación, se limpia la sesión.

### Cerrar sesión

```js
await sso.logout()
```

### Estado reactivo

```js
const sso = useSsoAuth()

sso.isAuthenticated.value // booleano reactivo
sso.currentUser.value     // objeto usuario reactivo (o null)
sso.accessToken.value     // bearer token reactivo (o null)
```

## Helpers

```js
sso.getToken()                // string | null
sso.getUser()                 // object | null
sso.isSSOSession()            // boolean
sso.getUniqueId()             // id de cliente persistido en localStorage
sso.getAndClearRedirectUrl()  // URL guardada antes del login (y la limpia)
```

## WebSocket complementario (socket.io)

Conexión persistente y autenticada con el bearer token SSO, con mensajes genéricos y callbacks por función (Pub/Sub + ACK). Es **opcional**: si no se define `wsUrl`, no se establece ninguna conexión.

### Uso

```js
const sso = useSsoAuth();
// o, más directo:
import { useSsoSocket } from 'vue-greenborn-sso-front';
const socket = useSsoSocket();
```

- **Auto conectar/desconectar**: se conecta al autenticarse y se desconecta al hacer logout/expirar sesión. También puedes llamar `connectSocket()` / `disconnectSocket()` manualmente.
- Estado reactivo: `socket.connected` (ref booleana) y `socket.socketError`.
- **Emitir con ack** (invoca una función en el back y espera respuesta):

```js
const res = await sso.socket.emit('echo', { hola: 'mundo' });
// con callback explícito:
sso.socket.emit('echo', { hola: 'mundo' }, (res) => console.log(res));
```

- **Recibir** (handler por función):

```js
sso.socket.on('ping', (data) => console.log('ping', data));
```

- API del composable: `emit`, `on`, `off`, `once`, `connect`, `disconnect`, `client`.
- Contraparte de backend: `express-greenborn-sso-back` → `sso.attachSocket(server)`.

## Exports

| Export              | Descripción                                     |
| ------------------- | ----------------------------------------------- |
| `useSsoAuth`        | Composable con estado reactivo + acciones       |
| `installSso(app, c)`| Provee la config y el store a toda la app        |
| `useSsoSocket`      | Composable de la conexión WebSocket complementaria |
| `createSsoClient(c)`| Cliente SSO puro (framework-agnostic)           |
| `createSocketClient(c)`| Cliente socket.io puro (framework-agnostic)  |
| `SsoCallback`       | Componente callback para `vue-router`            |
| `SSO_TOKEN_KEY` …   | Constantes de claves de `localStorage`           |

## Demo

```bash
npm install
npm run dev
```

La demo corre en el puerto **5175** (`http://localhost:5175`).

## Build

```bash
npm run build
```

Genera `dist/` con los formatos ES y UMD (listo para publicar en npm; `prepublishOnly` compila automáticamente).

## Licencia

MIT
