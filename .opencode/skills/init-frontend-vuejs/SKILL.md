---
name: init-frontend-vuejs
description: Inicializar un frontend Vue.js 3 con Vite, Bootstrap, Pinia, Axios, layout responsive y sesiones SSO (vue-greenborn-sso-front)
requires: []
---

# Skill: Inicializar frontend Vue.js con Vite, Bootstrap y Pinia + SSO

Usar cuando el usuario pida **crear un frontend Vue 3 desde cero** con Vite, Bootstrap, Pinia, Axios y layout responsive, con **sistema de sesiones SSO** (integrado con `vue-greenborn-sso-front`).

> **Sesiones**: cuando el proyecto requiere autenticación/sesiones, se usa el paquete `vue-greenborn-sso-front@1.1.0`. Proporciona login con Google, callback de autenticación, verificación de sesión, logout y una **conexión WebSocket complementaria** (opcional). No se escribe un store de auth JWT propio.

---

## 0. Preguntar nombre, PWA y websockets

Usar la herramienta `question` para preguntar el nombre del proyecto (`<nombre-proyecto>`), si habilita PWA (`<pwa-habilitado>`) y **siempre** si habilita **WebSocket** (`<ws-habilitado>`) — conexión complementaria sobre socket.io con mensajes genéricos y callbacks por función.

```
<question>
Pregunta: ¿Qué nombre deseas para el paquete del frontend?
Header: Nombre del frontend
```

```
<question>
Pregunta: ¿Quieres habilitar soporte WebSocket (socket.io) en este frontend?
Header: WebSocket
Opciones:
- Sí (Recomendado): conexión complementaria autenticada para mensajes genéricos con callbacks por función (useSsoSocket).
- No: solo HTTP.
```

> Los marcadores `<nombre-proyecto>`, `<pwa-habilitado>` y `<ws-habilitado>` se reemplazan en el resto de la receta.

## Componentes UI obligatorios

Todos los botones deben seguir el **patrón de colores por severidad** del sitio (ver sección "Patrón de colores para botones"). Asegurarse de que el proyecto genere un `AGENTS.md` en la raíz con la sección `## Convenciones` documentando estas reglas.

### Patron de colores para botones — regla general del sitio

- **Primary** → `btn-dark`
- **Success** → `btn-success`
- **Danger** → `btn-danger`
- **Warning** → `btn-warning`
- **Info** → `btn-info`
- **Secondary** → `btn-secondary`

Regla: los botones que **guardan/crean** son `btn-dark`; los que **eliminan** son `btn-danger`; las **acciones informativas** son `btn-info`; las **cancelaciones** son `btn-secondary`.

## 1. Crear el proyecto con Vite

```bash
npm create vite@latest <nombre-proyecto> -- --template vue
cd <nombre-proyecto>
npm install
```

Fijar la versión inicial en `package.json` a `1.0.0`:

```json
{
  "name": "<nombre-proyecto>",
  "version": "1.0.0",
  ...
}
```

## 2. Instalar dependencias

```bash
npm install bootstrap @popperjs/core bootstrap-icons pinia axios vue-router vue-greenborn-sso-front@1.1.0
npm install vue-table-editor
```

Si `<ws-habilitado>` es `true`, instalar además el cliente socket.io (peer del paquete SSO):

```bash
npm install socket.io-client
```

Si `<pwa-habilitado>` es `true`, instalar ademas:

```bash
npm install -D vite-plugin-pwa
```

## 3. Configurar Bootstrap global y SSO — `src/main.js`

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap'
import { installSso } from 'vue-greenborn-sso-front'
import { usePwaStore } from './stores/pwa'

// --- PWA install prompt listener ---
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  usePwaStore().capturarPrompt(e)
})

window.addEventListener('appinstalled', () => {
  usePwaStore().isInstalled = true
})
// -----------------------------------

const app = createApp(App)

// Sesiones SSO (vue-greenborn-sso-front). Config global disponible vía useSsoAuth().
installSso(app, {
  ssoBaseUrl: import.meta.env.VITE_SSO_BASE_URL || 'https://auth.greenborn.com.ar',
  ssoRedirect: '/login-redirect',
  nodeApiBaseUrl: import.meta.env.VITE_NODE_API_BASE_URL || '',
  wsUrl: import.meta.env.VITE_WS_URL || '',   // solo si <ws-habilitado>
  wsPath: import.meta.env.VITE_WS_PATH || '/socket.io',
})

app.use(createPinia())
app.use(router)
app.mount('#app')
```

> `installSso` se conecta/desconecta automáticamente del WebSocket al autenticarse/cerrar sesión (si `wsUrl` está definido).

## 3B. Configurar PWA (solo si habilitado) — `vite.config.js`

Si `<pwa-habilitado>` es `true`, modificar `vite.config.js` para incluir el plugin PWA:

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: '<nombre-proyecto>',
        short_name: '<nombre-proyecto>',
        description: 'Aplicacion instalable',
        theme_color: '#212529',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
```

Generar los iconos PWA manualmente o descargarlos desde https://favicon.io. Colocarlos en `public/`:
- `public/favicon.ico`
- `public/apple-touch-icon.png`
- `public/icon-192x192.png`
- `public/icon-512x512.png`
- `public/mask-icon.svg`

> El service worker se registra automaticamente gracias a `registerType: 'autoUpdate'`. No es necesario codigo manual en `main.js`.

### Store PWA — `src/stores/pwa.js`

```javascript
import { defineStore } from 'pinia'

export const usePwaStore = defineStore('pwa', {
  state: () => ({
    installPrompt: null,
    isInstalled: false,
  }),
  getters: {
    puedeInstalar(state) {
      return state.installPrompt !== null && !state.isInstalled
    },
  },
  actions: {
    capturarPrompt(evento) {
      this.installPrompt = evento
    },
    async install() {
      if (!this.installPrompt) return
      this.installPrompt.prompt()
      await this.installPrompt.userChoice
      this.installPrompt = null
    },
  },
})
```

## 4. Router con guard de sesión SSO — `src/router/index.js`

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { useSsoAuth } from 'vue-greenborn-sso-front'
import DashboardView from '../views/DashboardView.vue'
import ProfileView from '../views/ProfileView.vue'
import PreferenciasView from '../views/PreferenciasView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import SsoCallbackPage from '../views/SsoCallbackPage.vue'
import LoginView from '../views/LoginView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { requiereAuth: false } },
  {
    path: '/login-redirect',
    name: 'login-redirect',
    component: SsoCallbackPage,
    meta: { requiereAuth: false },
  },
  { path: '/', name: 'dashboard', component: DashboardView, meta: { requiereAuth: true } },
  { path: '/perfil', name: 'perfil', component: ProfileView, meta: { requiereAuth: true } },
  { path: '/preferencias', name: 'preferencias', component: PreferenciasView, meta: { requiereAuth: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const sso = useSsoAuth()

  if (to.meta.requiereAuth !== false && !sso.isAuthenticated.value) {
    return next({ name: 'login' })
  }

  if ((to.name === 'login' || to.name === 'login-redirect') && sso.isAuthenticated.value) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
```

> `SsoCallback` es el componente del paquete `vue-greenborn-sso-front` que procesa el callback de autenticación. La vista `SsoCallbackPage.vue` lo envuelve para redirigir según `result.exists` (usuario local nuevo → registro).

## 5. Layout principal — `src/App.vue`

```vue
<template>
  <div id="app">
    <template v-if="sso.isAuthenticated.value">
      <Topbar @toggle-sidebar="toggleSidebar" />
      <div class="d-flex" style="margin-top: 56px; min-height: calc(100vh - 56px);">
        <Sidebar :visible="sidebarVisible" @close="sidebarVisible = false" />
        <main class="flex-grow-1 p-3" style="padding-top: 56px;">
          <router-view />
        </main>
      </div>
    </template>
    <template v-else>
      <router-view />
    </template>
    <ModalDialog />
  </div>
</template>

<script>
import Topbar from './components/layout/Topbar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import ModalDialog from './components/ModalDialog.vue'
import { useSsoAuth } from 'vue-greenborn-sso-front'

export default {
  name: 'App',
  components: { Topbar, Sidebar, ModalDialog },
  data() {
    return {
      sidebarVisible: window.innerWidth >= 768,
    }
  },
  computed: {
    sso() {
      return useSsoAuth()
    },
  },
  methods: {
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible
    },
  },
}
</script>
```

## 6. Topbar — `src/components/layout/Topbar.vue`

```vue
<template>
  <nav class="navbar navbar-dark bg-dark fixed-top px-3">
    <div class="d-flex align-items-center w-100">
      <button class="navbar-toggler border-0" type="button" @click="$emit('toggle-sidebar')" aria-label="Toggle sidebar">
        <span class="navbar-toggler-icon"></span>
      </button>
      <span class="navbar-brand mb-0 ms-2">Mi App</span>
      <div class="ms-auto d-flex align-items-center gap-2">
        <span class="text-light small">{{ sso.currentUser.value?.username }}</span>
        <button class="btn btn-outline-light btn-sm" @click="logout">Salir</button>
      </div>
    </div>
  </nav>
</template>

<script>
import { useSsoAuth } from 'vue-greenborn-sso-front'

export default {
  name: 'Topbar',
  computed: {
    sso() {
      return useSsoAuth()
    },
  },
  methods: {
    async logout() {
      await this.sso.logout()
      this.$router.push({ name: 'login' })
    },
  },
}
</script>
```

## 7. Sidebar — `src/components/layout/Sidebar.vue`

Usa **Offcanvas** de Bootstrap 5 para móvil y sidebar estático en desktop dentro del flujo flex. Los items se renderizan con `v-for` desde un array, con iconos Bootstrap y resaltado de ruta activa.

```vue
<template>
  <div>
    <!-- Offcanvas para móvil (se oculta en desktop con d-md-none) -->
    <div class="offcanvas offcanvas-start bg-dark text-white d-md-none"
      :class="{ show: visible && isMobile }"
      tabindex="-1"
      aria-labelledby="sidebarLabel">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title text-white" id="sidebarLabel">Menú</h5>
        <button type="button" class="btn-close btn-close-white" @click="close" aria-label="Cerrar"></button>
      </div>
      <div class="offcanvas-body p-0">
        <ul class="nav flex-column">
          <li class="nav-item" v-for="item in navItems" :key="item.to">
            <router-link :to="item.to" class="nav-link text-white nav-link-sidebar"
              :class="{ active: rutaActiva(item.to) }"
              @click="closeOnMobile">
              <i :class="['bi', item.icon, 'me-2']"></i>{{ item.label }}
            </router-link>
          </li>
          <li class="nav-item" v-if="pwa.puedeInstalar">
            <a href="#" class="nav-link text-white nav-link-sidebar" @click.prevent="instalarPwa">
              <i class="bi bi-download me-2"></i>Instalar App
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- Sidebar estático para desktop -->
    <div class="d-none d-md-block bg-dark text-white sidebar-desktop">
      <div class="p-3">
        <h5 class="text-center mb-4">Menú</h5>
        <ul class="nav flex-column">
          <li class="nav-item" v-for="item in navItems" :key="item.to">
            <router-link :to="item.to" class="nav-link text-white nav-link-sidebar"
              :class="{ active: rutaActiva(item.to) }">
              <i :class="['bi', item.icon, 'me-2']"></i>{{ item.label }}
            </router-link>
          </li>
          <li class="nav-item" v-if="pwa.puedeInstalar">
            <a href="#" class="nav-link text-white nav-link-sidebar" @click.prevent="instalarPwa">
              <i class="bi bi-download me-2"></i>Instalar App
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- Backdrop estilo Bootstrap para móvil -->
    <div v-if="visible && isMobile" class="offcanvas-backdrop fade show" @click="close"></div>
  </div>
</template>

<script>
import { usePwaStore } from '../../stores/pwa'

export default {
  name: 'Sidebar',
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['close'],
  data() {
    return {
      pwa: usePwaStore(),
      isMobile: false,
      navItems: [
        { to: '/', label: 'Dashboard', icon: 'bi-speedometer2' },
        { to: '/perfil', label: 'Mi Perfil', icon: 'bi-person' },
        { to: '/preferencias', label: 'Preferencias', icon: 'bi-sliders' },
      ],
    }
  },
  mounted() {
    this.isMobile = window.innerWidth < 768
  },
  methods: {
    close() {
      this.$emit('close')
    },
    closeOnMobile() {
      if (this.isMobile) this.$emit('close')
    },
    rutaActiva(to) {
      return this.$route.path === to
    },
    async instalarPwa() {
      await this.pwa.install()
    },
  },
}
</script>
```

## 8. Sesiones SSO — sin store de auth propio

La autenticación se maneja con `vue-greenborn-sso-front` (sin escribir un store JWT). Se consume así en cualquier componente:

```javascript
import { useSsoAuth } from 'vue-greenborn-sso-front'

const sso = useSsoAuth()

sso.isAuthenticated.value  // booleano reactivo
sso.currentUser.value      // usuario reactivo (o null)
sso.accessToken.value      // bearer token reactivo
sso.getToken()             // string | null
sso.login()                // redirige a Google SSO
sso.verifySession()        // verifica la sesión con el backend
sso.logout()               // cierra sesión
```

Si `<ws-habilitado>` es `true`, además está disponible la conexión complementaria:

```javascript
import { useSsoSocket } from 'vue-greenborn-sso-front'
const socket = useSsoSocket()

socket.connected.value            // booleano reactivo
socket.emit('echo', { hola: 1 }, (res) => console.log(res))  // con ack
socket.emit('ping', {})           // promesa
socket.on('notificacion', (data) => console.log(data))       // handler por función
```

## 9. Store Pinia de ejemplo — `src/stores/ejemplo.js`

```javascript
import { defineStore } from 'pinia'

export const useEjemploStore = defineStore('ejemplo', {
  state: () => ({
    contador: 0,
  }),
  getters: {
    doble: (state) => state.contador * 2,
  },
  actions: {
    incrementar() {
      this.contador++
    },
  },
})
```

## 9B. Store de preferencias — `src/stores/preferencias.js`

```javascript
import { defineStore } from 'pinia'
import api from '../api/axios'

export const usePreferenciasStore = defineStore('preferencias', {
  state: () => ({
    definiciones: [],
    misPreferencias: {},
    cargando: false,
  }),
  getters: {
    valor(state) {
      return (clave) => state.misPreferencias[clave]
    },
  },
  actions: {
    async cargarDefiniciones() {
      const { data: body } = await api.get('/preferencias/definiciones')
      if (body.status) this.definiciones = body.data
    },
    async cargarMisPreferencias() {
      const { data: body } = await api.get('/preferencias/mias')
      if (body.status) {
        this.misPreferencias = body.data.reduce((acc, p) => {
          acc[p.preferencia_id] = p.valor
          return acc
        }, {})
      }
    },
    async guardarPreferencia(preferenciaId, valor) {
      await api.post('/preferencias/mias', { preferencia_id: preferenciaId, valor })
      this.misPreferencias[preferenciaId] = valor
    },
  },
})
```

## 10. Instancia de Axios — `src/api/axios.js`

Inyecta el bearer token SSO en cada petición. Al obtener un `X-New-Token` (renovación), lo persiste.

```javascript
import axios from 'axios'
import { useSsoAuth } from 'vue-greenborn-sso-front'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const sso = useSsoAuth()
    const token = sso.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    const nuevo = response.headers['x-new-token']
    if (nuevo) {
      // Persistir el token renovado (la clave la define vue-greenborn-sso-front)
      localStorage.setItem('sso_bearer_token', nuevo)
      useSsoAuth().socket.setToken(nuevo)
    }
    return response
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      useSsoAuth().logout()
      window.location.href = '/login'
    }
    console.error('[API Error]', error.message)
    return Promise.reject(error)
  }
)

export default api
```

## 11. Vista de Login — `src/views/LoginView.vue`

Botón que inicia sesión con Google SSO (redirige al servidor de autenticación).

```vue
<template>
  <div class="d-flex align-items-center justify-content-center" style="min-height: 100vh; background: #f5f5f5;">
    <div class="card shadow-sm" style="width: 100%; max-width: 400px;">
      <div class="card-body p-4 text-center">
        <h3 class="mb-4">Iniciar Sesión</h3>
        <p class="text-muted mb-4">Accede con tu cuenta Google.</p>
        <button class="btn btn-dark w-100" @click="iniciar">
          <i class="bi bi-google me-2"></i>Iniciar sesión con Google
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useSsoAuth } from 'vue-greenborn-sso-front'

export default {
  name: 'LoginView',
  methods: {
    iniciar() {
      useSsoAuth().login()
    },
  },
}
</script>
```

## 11B. Página callback — `src/views/SsoCallbackPage.vue`

Envuelve el componente `SsoCallback` del paquete para redirigir tras autenticar (y al registro si el usuario no existe localmente).

```vue
<template>
  <SsoCallback
    register-path="/registro"
    fallback-path="/"
    @success="onSuccess"
    @error="onError"
  />
</template>

<script>
import { SsoCallback } from 'vue-greenborn-sso-front'

export default {
  name: 'SsoCallbackPage',
  components: { SsoCallback },
  methods: {
    onSuccess(result) {
      // result.exists, result.localUser, result.ssoEmail
      if (result.exists) this.$router.push(result.redirectUrl || '/')
    },
    onError(err) {
      console.error('Error SSO:', err)
    },
  },
}
</script>
```

> Si el proyecto necesita un registro propio para usuarios que no existen localmente, crear `src/views/RegistroView.vue` en la ruta `/registro`.

## 12. Vista Dashboard — `src/views/DashboardView.vue`

```vue
<template>
  <div class="container py-4">
    <h1 class="mb-4">Dashboard</h1>
    <div class="alert alert-info">
      Bienvenido, <strong>{{ sso.currentUser.value?.username }}</strong>.
      <span class="ms-2 badge bg-secondary">rol {{ sso.currentUser.value?.role_id }}</span>
    </div>
    <p class="text-muted">Hoy es {{ new Date().toLocaleDateString() }}.</p>
  </div>
</template>

<script>
import { useSsoAuth } from 'vue-greenborn-sso-front'

export default {
  name: 'DashboardView',
  computed: {
    sso() {
      return useSsoAuth()
    },
  },
}
</script>
```

## 13. Vista de Perfil — `src/views/ProfileView.vue`

```vue
<template>
  <div class="container py-4">
    <h1 class="mb-4">Mi Perfil</h1>
    <div class="card" style="max-width: 500px;">
      <div class="card-body">
        <p><strong>Username:</strong> {{ sso.currentUser.value?.username }}</p>
        <p><strong>Email:</strong> {{ sso.currentUser.value?.email }}</p>
        <p><strong>Rol:</strong> {{ sso.currentUser.value?.role_id }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { useSsoAuth } from 'vue-greenborn-sso-front'

export default {
  name: 'ProfileView',
  computed: {
    sso() {
      return useSsoAuth()
    },
  },
}
</script>
```

## 13B. Vista 404 — `src/views/NotFoundView.vue`

```vue
<template>
  <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 60vh;">
    <h1 class="display-1">404</h1>
    <p class="text-muted">La página que buscas no existe.</p>
    <router-link to="/" class="btn btn-dark">Volver al inicio</router-link>
  </div>
</template>

<script>
export default { name: 'NotFoundView' }
</script>
```

## 13C. Vista Preferencias de Usuario — `src/views/PreferenciasView.vue`

```vue
<template>
  <div class="container py-4">
    <h1 class="mb-4">Preferencias</h1>
    <div v-if="prefs.definiciones.length === 0" class="alert alert-info">Cargando preferencias…</div>
    <div v-for="def in prefs.definiciones" :key="def.id" class="card mb-2">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <strong>{{ def.nombre }}</strong>
          <div class="text-muted small">{{ def.descripcion }}</div>
        </div>
        <div v-if="def.tipo === 'select'">
          <select class="form-select" :value="prefs.valor(def.id)" @change="guardar(def, $event.target.value)">
            <option v-for="op in (def.opciones || [])" :key="op" :value="op">{{ op }}</option>
          </select>
        </div>
        <div v-else-if="def.tipo === 'boolean'">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox"
              :checked="prefs.valor(def.id) === 'true'"
              @change="guardar(def, $event.target.checked ? 'true' : 'false')" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { usePreferenciasStore } from '../stores/preferencias'

export default {
  name: 'PreferenciasView',
  data() {
    return { prefs: usePreferenciasStore() }
  },
  async created() {
    await this.prefs.cargarDefiniciones()
    await this.prefs.cargarMisPreferencias()
  },
  methods: {
    async guardar(def, valor) {
      await this.prefs.guardarPreferencia(def.id, valor)
    },
  },
}
</script>
```

## 13D. Tabla reutilizable — librería `vue-table-editor`

Para listados/tablas server-side se usa `vue-table-editor`.

### Instalación

```bash
npm install vue-table-editor
```

### Importar y registrar el componente

```vue
<script>
import TableEditor from 'vue-table-editor'
import 'vue-table-editor/dist/vue-table-editor.css'
export default { components: { TableEditor } }
</script>
```

### Uso en template

```vue
<TableEditor
  :columns="columns"
  :data="rows"
  lazy
  :total="total"
  :config="config"
  :actions="actions"
  @load="onLoad"
  @action="onAction"
/>
```

### API (carga server-side / lazy)

- `lazy` (boolean): habilita paginación server-side. Emite `@load` con `{ page, pageSize, sortField, sortDir, search }`.
- `total` (number): total de registros para paginar.
- `@load` → debe devolver `{ rows, total }`.

### Cliente-side (sin backend)

- `data` (array): filas completas; se pagina/filtra localmente.

### Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `columns` | array | Definición de columnas (label, field, sortable, width, ...) |
| `data` | array | Filas (modo cliente) |
| `lazy` | boolean | Carga server-side |
| `total` | number | Total para paginación |
| `config` | object | Preferencias de columnas, paginación, etc. |
| `actions` | array | Acciones por fila (editar/eliminar/...) |

### Eventos

| Evento | Descripción |
|--------|-------------|
| `@load` | Solicitud de página/filtro/orden (server-side) |
| `@action` | Click en una acción de fila (`{ action, row }`) |

### Métodos (vía `ref`)

- `reload()` — recarga datos
- `getSelected()` — filas seleccionadas

### Iconos

Usa Bootstrap Icons.

### Severity de botones

Las acciones siguen el patrón de colores: editar = `btn-dark`, eliminar = `btn-danger`, informativo = `btn-info`.

### Preferencias de columnas

El `config` puede persistir columnas visibles/ancho/orden por usuario.

## 13H. Store de modals anidados — `src/stores/modal.js`

```javascript
import { defineStore } from 'pinia'

export const useModalStore = defineStore('modal', {
  state: () => ({
    abiertos: [],
  }),
  getters: {
    superior(state) {
      return state.abiertos[state.abiertos.length - 1] || null
    },
  },
  actions: {
    abrir(config) {
      this.abiertos.push(config)
    },
    cerrar(id) {
      const idx = this.abiertos.findIndex((m) => m.id === id)
      if (idx !== -1) this.abiertos.splice(idx, 1)
    },
  },
})
```

## 13I. Componente Modal arrastrable — `src/components/ModalDialog.vue`

Modal genérico arrastrable que renderiza el modal superior del store `modal`.

```vue
<template>
  <div v-if="modal.superior" class="modal-backdrop" @click.self="cerrar">
    <div class="modal-dialog" style="position: fixed; left: 0; top: 0;" :style="posicion">
      <div class="modal-content">
        <div class="modal-header" @mousedown="iniciarArrastre">
          <h5 class="modal-title">{{ modal.superior.titulo }}</h5>
          <button type="button" class="btn-close" @click="cerrar"></button>
        </div>
        <div class="modal-body">
          <component :is="modal.superior.componente" v-bind="modal.superior.props"
            @ok="cerrar" @cancelar="cerrar" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useModalStore } from '../stores/modal'

export default {
  name: 'ModalDialog',
  data() {
    return {
      modal: useModalStore(),
      posicion: { left: '20%', top: '12%' },
      arrastre: null,
    }
  },
  methods: {
    cerrar() {
      if (this.modal.superior) this.modal.cerrar(this.modal.superior.id)
    },
    iniciarArrastre(e) {
      const m = this.$el
      this.arrastre = { dx: e.clientX - m.offsetLeft, dy: e.clientY - m.offsetTop }
      window.addEventListener('mousemove', this.mover)
      window.addEventListener('mouseup', this.soltar)
    },
    mover(e) {
      if (!this.arrastre) return
      this.posicion.left = `${e.clientX - this.arrastre.dx}px`
      this.posicion.top = `${e.clientY - this.arrastre.dy}px`
    },
    soltar() {
      this.arrastre = null
      window.removeEventListener('mousemove', this.mover)
      window.removeEventListener('mouseup', this.soltar)
    },
  },
}
</script>
```

## 14. Archivo `.env` y `.env.example`

```
VITE_API_URL=http://localhost:4000
VITE_SSO_BASE_URL=https://auth.greenborn.com.ar
VITE_NODE_API_BASE_URL=http://localhost:4000/api/
VITE_WS_URL=http://localhost:4000
VITE_WS_PATH=/socket.io
```

Crear `.env.example` con el mismo contenido y agregar `.env` al `.gitignore`.

## 15. Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 16. `.gitignore`

```
node_modules/
.env
dist/
```

## 17. Estructura final

```
<proyecto>/
├── .env
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── public/                         (si PWA habilitado)
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   └── mask-icon.svg
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── api/
│   │   └── axios.js
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Topbar.vue
│   │   │   └── Sidebar.vue
│   │   └── ModalDialog.vue
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   ├── ejemplo.js
│   │   ├── modal.js
│   │   ├── preferencias.js
│   │   └── pwa.js                     (si PWA habilitado)
│   └── views/
│       ├── DashboardView.vue
│       ├── LoginView.vue
│       ├── NotFoundView.vue
│       ├── PreferenciasView.vue
│       ├── ProfileView.vue
│       └── SsoCallbackPage.vue
└── node_modules/
```

> Nota: las sesiones se manejan con `vue-greenborn-sso-front` (no hay `stores/auth.js` ni vistas admin de RBAC manual).

## 18. Verificación obligatoria

Ejecutar los siguientes comandos en orden y **confirmar que cada uno devuelva el resultado esperado**. Si algún comando falla, abortar y notificar el error.

| # | Comando | Resultado esperado |
|---|---------|-------------------|
| 1 | `npm run dev` (dejar correr 3s, luego Ctrl+C) | Vite imprime `http://localhost:5175` sin errores de compilación |
| 2 | `npm run build` | `✓ built in Xs` sin errores. Se genera `dist/` |
| 3 | Verificar `AGENTS.md` en raíz del proyecto | Existe con la sección `## Convenciones` |
| 4 | Verificar `.env` | Contiene `VITE_API_URL`, `VITE_SSO_BASE_URL`, `VITE_NODE_API_BASE_URL`, `VITE_WS_URL` |
| 5 | Verificar `.gitignore` | Contiene `node_modules/`, `.env`, `dist/` |
| 6 | Verificar estructura de directorios | Existen: `src/views/`, `src/components/layout/`, `src/stores/`, `src/api/`, `src/router/` |
| 7 | Verificar integración SSO | `src/main.js` usa `installSso` de `vue-greenborn-sso-front@1.1.0`; router tiene la ruta `/login-redirect` |
| 8 | Leer `DOCUMENTACION.md` | Existe con todas las secciones completas |

**Validación cruzada con backend (si el backend ya está operativo):**

```bash
# Iniciar frontend
npm run dev &
FRONTEND_PID=$!

# Iniciar backend (desde el directorio del backend)
cd ../<backend-directorio> && node src/index.js &
BACKEND_PID=$!

sleep 2

# Health check del backend
curl -s http://localhost:4000/health
# → {"status":true,"data":{"timestamp":"..."}}

# Detener procesos
kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
```

> El front corre en el puerto **5175** (convención del proyecto). El flujo completo de login solo puede validarse con un servidor SSO real (Google).

## 19. Documentación básica — `DOCUMENTACION.md`

```markdown
# <nombre-proyecto>

Frontend Vue 3 + Vite + Bootstrap + Pinia + SSO (vue-greenborn-sso-front).

## REQUISITOS

- Node.js ≥ 18
- Backend con sesiones SSO (express-greenborn-sso-back)
- Cuenta SSO Greenborn

## CONFIGURACION

1. Copiar `.env.example` a `.env` y completar variables.
2. `npm install`
3. `npm run dev`

## VARIABLES DE ENTORNO

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | Base del API backend |
| `VITE_SSO_BASE_URL` | Servidor SSO Greenborn |
| `VITE_NODE_API_BASE_URL` | Base del API local para verificar perfil |
| `VITE_WS_URL` | Base del WebSocket (si habilitado) |
| `VITE_WS_PATH` | Ruta del socket |

## SCRIPTS

- `npm run dev` / `build` / `preview`

## RUTAS

| Ruta | Vista | Guard |
|------|-------|-------|
| `/login` | LoginView | No |
| `/login-redirect` | SsoCallbackPage | No |
| `/` | DashboardView | Auth |
| `/perfil` | ProfileView | Auth |
| `/preferencias` | PreferenciasView | Auth |

## ESTRUCTURA

- `src/main.js` — Bootstrap + installSso
- `src/router/` — rutas con guard de sesión SSO
- `src/api/axios.js` — instancia Axios con token SSO
- `src/views/` — vistas
- `src/stores/` — Pinia (preferencias, modal, pwa)
- `src/components/layout/` — Topbar, Sidebar

## DEPENDENCIAS

- `vue`, `vue-router`, `pinia`, `axios`, `bootstrap`, `bootstrap-icons`
- `vue-greenborn-sso-front@1.1.0`
- `vue-table-editor`
- `socket.io-client` (si `ws-habilitado`)
- `vite-plugin-pwa` (si PWA)
```

## Reglas obligatorias

- **Sesiones**: siempre usar `vue-greenborn-sso-front@1.1.0`. No escribir store de auth JWT propio.
- El callback de autenticación se maneja con el componente `SsoCallback` del paquete.
- Preguntar siempre por WebSocket en el paso 0 si no se proporciona.
- Si `ws-habilitado` es `true`, usar `useSsoSocket` y definir `VITE_WS_URL`.
- La demo corre en el puerto **5175**.
