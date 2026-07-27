---
name: init-frontend-vuejs
description: Inicializar un frontend Vue.js 3 con Vite, Bootstrap, Pinia, Axios y layout responsive
requires: [init-backend-nodejs]
---

# Skill: Inicializar frontend Vue.js con Vite, Bootstrap y Pinia

Usar cuando el usuario pida **crear un frontend desde cero** con Vue.js 3, Vite, Bootstrap, Pinia, Axios, barra superior y menú lateral (hamburguesa en móvil). **Prohibido usar TypeScript** — todo el código debe ser JavaScript. El TableEditor usa Composition API con `<script setup>`; el resto de componentes puede usar Options API.

---

## 0. Preguntar nombre del proyecto

Usar la herramienta `question` para preguntar al usuario qué nombre desea para el paquete del frontend. La respuesta se usará como `<nombre-proyecto>` en todos los pasos siguientes.

Ejemplo de pregunta:

```
<question>
Pregunta: ¿Qué nombre deseas para el paquete del frontend?
Header: Nombre del frontend
```

> El valor ingresado reemplaza `<nombre-proyecto>` en el resto de la receta (nombre del directorio, carpeta del proyecto, package.json, etc.).

### Preguntar si habilita PWA

Usar la herramienta `question` para preguntar al usuario si desea habilitar soporte PWA (Progressive Web App). La respuesta determina si se usa `<pwa-habilitado>` como `true` o `false` en los pasos siguientes.

Ejemplo de pregunta:

```
<question>
Pregunta: ¿Deseas habilitar soporte PWA (Progressive Web App) para que la app sea descargable e instalable?
Header: Habilitar PWA
Options:
  - Si (Recommended)
  - No
```

> Si se habilita PWA, se agregara `vite-plugin-pwa`, se configurara el service worker, y se generaran los iconos necesarios. En caso contrario se omite todo lo relacionado a PWA.

## Componentes UI obligatorios

- **Modals**: Usar siempre el sistema de modals genérico (`ModalDialog.vue` + `useModalStore`) para cualquier ventana modal. El contenido del modal debe estar en un componente separado (ej. `*Modal.vue`) que se pasa por referencia al gestor via `modal.open({ component, props, title, size })`. No crear modals con HTML directo, no usar `v-if` para mostrar modals inline, y no definir el contenido del modal dentro del mismo archivo de la vista.
   - **Tablas**: Usar siempre `TableEditor.vue` para listar datos en vistas de tabla. No crear tablas HTML manualmente. El TableEditor soporta columnas redimensionables, reordenables, selección de visibilidad, edición inline, ordenamiento server-side, paginación, scroll infinito, y preferencias persistentes de columna (orden/ancho/visibilidad). Pasar `:id` para habilitar persistencia y `:api` para carga server-side. Usar `@rowDoubleClick` para acciones al hacer doble clic.

### Patron de colores para botones — regla general del sitio

Este patron debe agregarse como regla general en `AGENTS.md` (raiz del proyecto) y aplicarse en todo el frontend:

| Accion | Clase Bootstrap | Color |
|---|---|---|
| Eliminar / Deshabilitar | `btn-danger` | Rojo |
| Agregar / Confirmar / Habilitar | `btn-success` | Verde |
| Editar / Modificar | `btn-warning` | Amarillo |
| Cancelar / Volver atras | `btn-secondary` | Gris |
| Informacion / Detalles | `btn-info` | Azul |

**Pasos obligatorios:**

1. Crear o actualizar `AGENTS.md` en la raiz del proyecto agregando estas reglas bajo la seccion `## Convenciones`:

   ```markdown
   ### Componentes UI obligatorios
   - **Modals**: Usar siempre el sistema de modals genérico (`ModalDialog.vue` + `useModalStore`) para cualquier ventana modal. El contenido del modal debe estar en un componente separado (ej. `*Modal.vue`) que se pasa por referencia al gestor via `modal.open({ component, props, title, size })`. No crear modals con HTML directo, no usar `v-if` para mostrar modals inline, y no definir el contenido del modal dentro del mismo archivo de la vista.
- **Tablas**: Usar siempre `TableEditor.vue` para listar datos en vistas de tabla. No crear tablas HTML manualmente. El TableEditor soporta columnas redimensionables, reordenables, selección de visibilidad, edición inline, ordenamiento server-side, paginación, scroll infinito, y preferencias persistentes de columna (orden/ancho/visibilidad). Pasar `:id` para habilitar persistencia y `:api` para carga server-side. Usar `@rowDoubleClick` para acciones al hacer doble clic.
   ### Patron de colores para botones
   - **Patron de colores para botones:** usar estas clases Bootstrap de forma consistente en todo el sitio:
     - `btn-danger` (rojo) — Eliminar, deshabilitar, acciones destructivas
     - `btn-success` (verde) — Agregar, confirmar, habilitar, crear
     - `btn-warning` (amarillo) — Editar, modificar
     - `btn-secondary` (gris) — Cancelar, volver atras, cerrar
     - `btn-info` (azul) — Informacion, detalles, ver
   ```

2. Aplicar el mismo criterio en todos los botones y componentes del frontend:
   - En toolbar de `TableEditor.vue`: `severity: 'btn-success'` para crear, `severity: 'btn-danger'` para eliminar, etc.
   - En `rowActions`: mismo criterio por accion
   - En cualquier otro boton del sitio: mantener consistencia

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
npm install bootstrap @popperjs/core bootstrap-icons pinia axios vue-router
```

Si `<pwa-habilitado>` es `true`, instalar ademas:

```bash
npm install -D vite-plugin-pwa
```

## 3. Configurar Bootstrap global — `src/main.js`

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap'
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
app.use(createPinia())
app.use(router)
app.mount('#app')
```

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

> El service worker se registra automaticamente gracias a `registerType: 'autoUpdate'` de `vite-plugin-pwa`. No es necesario agregar codigo manual en `main.js`.

### Store PWA — `src/stores/pwa.js`

Crear el store que captura el evento `beforeinstallprompt` y expone el metodo `install()`:

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
    capturarPrompt(event) {
      event.preventDefault()
      this.installPrompt = event
    },
    async install() {
      if (!this.installPrompt) return
      this.installPrompt.prompt()
      const { outcome } = await this.installPrompt.userChoice
      if (outcome === 'accepted') {
        this.isInstalled = true
      }
      this.installPrompt = null
    },
  },
})
```

En `src/main.js`, agregar el listener global antes de montar la app:

```javascript
import { usePwaStore } from './stores/pwa'

window.addEventListener('beforeinstallprompt', (e) => {
  const pwa = usePwaStore()
  pwa.capturarPrompt(e)
})

window.addEventListener('appinstalled', () => {
  const pwa = usePwaStore()
  pwa.isInstalled = true
})
```

## 4. Router con vista por defecto — `src/router/index.js`

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import ProfileView from '../views/ProfileView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import UsuariosView from '../views/UsuariosView.vue'
import RolesView from '../views/RolesView.vue'
import PreferenciasView from '../views/PreferenciasView.vue'
import AdminPreferenciasView from '../views/AdminPreferenciasView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiereAuth: false },
  },
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiereAuth: true },
  },
  {
    path: '/perfil',
    name: 'perfil',
    component: ProfileView,
    meta: { requiereAuth: true },
  },
  {
    path: '/preferencias',
    name: 'preferencias',
    component: PreferenciasView,
    meta: { requiereAuth: true },
  },
  {
    path: '/admin/usuarios',
    name: 'usuarios',
    component: UsuariosView,
    meta: { requiereAuth: true, permisos: ['usuarios.ver'] },
  },
  {
    path: '/admin/roles',
    name: 'roles',
    component: RolesView,
    meta: { requiereAuth: true, permisos: ['roles.ver'] },
  },
  {
    path: '/admin/preferencias',
    name: 'admin-preferencias',
    component: AdminPreferenciasView,
    meta: { requiereAuth: true, permisos: ['preferencias.ver'] },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  
  if (to.meta.requiereAuth !== false && !auth.token) {
    return next({ name: 'login' })
  }
  
  if (to.name === 'login' && auth.token) {
    return next({ name: 'dashboard' })
  }

  if (to.meta.permisos) {
    const permisosRequeridos = to.meta.permisos
    const tienePermisos = permisosRequeridos.every((p) => auth.tienePermiso(p))
    if (!tienePermisos) {
      return next({ name: 'dashboard' })
    }
  }

  next()
})

export default router
```

## 5. Layout principal — `src/App.vue`

```javascript
<template>
  <div id="app">
    <template v-if="logueado">
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
import { useAuthStore } from './stores/auth'

export default {
  name: 'App',
  components: { Topbar, Sidebar, ModalDialog },
  data() {
    return {
      sidebarVisible: window.innerWidth >= 768,
    }
  },
  computed: {
    logueado() {
      return useAuthStore().token
    },
  },
  methods: {
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible
    },
    handleResize() {
      if (window.innerWidth >= 768) {
        this.sidebarVisible = true
      }
    },
  },
  mounted() {
    const auth = useAuthStore()
    if (auth.token) {
      auth.fetchPerfil()
    }
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
}
</script>

<style>
html, body, #app { height: 100%; margin: 0; }
</style>
```

## 6. Topbar — `src/components/layout/Topbar.vue`

```javascript
<template>
  <nav class="navbar navbar-dark bg-dark fixed-top px-3">
    <div class="d-flex align-items-center w-100">
      <button class="navbar-toggler border-0" type="button" @click="$emit('toggle-sidebar')" aria-label="Toggle sidebar">
        <span class="navbar-toggler-icon"></span>
      </button>
      <span class="navbar-brand mb-0 ms-2">Mi App</span>
      <div class="ms-auto d-flex align-items-center gap-2">
        <span class="text-light small">{{ auth.usuario?.username }}</span>
        <button class="btn btn-outline-light btn-sm" @click="logout">Salir</button>
      </div>
    </div>
  </nav>
</template>
```

## 7. Sidebar — `src/components/layout/Sidebar.vue`

Usa **Offcanvas** de Bootstrap 5 para móvil (overlay con backdrop) y sidebar estático en desktop dentro del flujo flex. Los items se renderizan con `v-for` desde un array, con iconos Bootstrap y resaltado de ruta activa.

```javascript
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
import { useAuthStore } from '../../stores/auth'
import { usePwaStore } from '../../stores/pwa'

export default {
  name: 'Sidebar',
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['close'],
  data() {
    return {
      auth: useAuthStore(),
      pwa: usePwaStore(),
    }
  },
  computed: {
    isMobile() {
      return window.innerWidth < 768
    },
    navItems() {
      const items = [
        { to: '/', label: 'Dashboard', icon: 'bi-speedometer2', permiso: null },
        { to: '/perfil', label: 'Mi Perfil', icon: 'bi-person', permiso: null },
        { to: '/preferencias', label: 'Preferencias', icon: 'bi-gear', permiso: null },
        { to: '/admin/usuarios', label: 'Usuarios', icon: 'bi-people', permiso: 'usuarios.ver' },
        { to: '/admin/roles', label: 'Roles', icon: 'bi-shield', permiso: 'roles.ver' },
        { to: '/admin/preferencias', label: 'Admin Preferencias', icon: 'bi-sliders', permiso: 'preferencias.ver' },
      ]
      return items.filter(item => !item.permiso || this.auth.tienePermiso(item.permiso))
    },
  },
  methods: {
    rutaActiva(path) {
      return this.$route.path === path
    },
    close() {
      this.$emit('close')
    },
    closeOnMobile() {
      if (this.isMobile) this.close()
    },
    async instalarPwa() {
      await this.pwa.install()
      this.closeOnMobile()
    },
  },
}
</script>

<style scoped>
.sidebar-desktop {
  width: 250px;
  flex-shrink: 0;
  overflow-y: auto;
}
.nav-link-sidebar {
  border-radius: 0;
  padding: 0.65rem 1rem;
  border-left: 3px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.nav-link-sidebar:hover {
  background-color: rgba(255, 255, 255, 0.08);
}
.nav-link-sidebar.active {
  background-color: rgba(13, 110, 253, 0.15);
  border-left-color: #0d6efd;
}
</style>
```

## 8. Store de autenticación — `src/stores/auth.js`

```javascript
import { defineStore } from 'pinia'
import api from '../api/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  }),
  getters: {
    roles() {
      return this.usuario?.roles || []
    },
    permisos() {
      return this.usuario?.permisos || []
    },
    esAdmin() {
      return this.roles.includes('ADMIN')
    },
    tienePermiso() {
      return (permiso) => this.permisos.includes(permiso)
    },
  },
  actions: {
    async login(username, password) {
      const { data: body } = await api.post('/auth/login', { username, password })
      if (!body.status) throw new Error(body.error)
      this.token = body.data.token
      this.usuario = body.data.usuario
      localStorage.setItem('token', body.data.token)
      localStorage.setItem('usuario', JSON.stringify(body.data.usuario))
    },
    logout() {
      this.token = null
      this.usuario = null
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
    },
    async fetchPerfil() {
      const { data: body } = await api.get('/auth/perfil')
      if (!body.status) throw new Error(body.error)
      this.usuario = body.data
      localStorage.setItem('usuario', JSON.stringify(body.data))
    },
    async actualizarPerfil(datos) {
      const { data: body } = await api.put('/auth/perfil', datos)
      if (!body.status) throw new Error(body.error)
      if (datos.username) {
        this.usuario = { ...this.usuario, username: datos.username }
        localStorage.setItem('usuario', JSON.stringify(this.usuario))
      }
    },
  },
})
```

## 9. Store Pinia de ejemplo — `src/stores/ejemplo.js`

```javascript
import { defineStore } from 'pinia'
import api from '../api/axios'

export const useEjemploStore = defineStore('ejemplo', {
  state: () => ({
    items: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchItems() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/items')
        this.items = data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
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
    misValores: {},
    loading: false,
    error: null,
  }),
  getters: {
    valor(state) {
      return (clave) => state.misValores[clave] || null
    },
  },
  actions: {
    async fetchDefiniciones() {
      this.loading = true
      this.error = null
      try {
        const { data: body } = await api.get('/preferencias')
        if (body.status) this.definiciones = body.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },
    async fetchMisPreferencias() {
      this.loading = true
      this.error = null
      try {
        const { data: body } = await api.get('/preferencias/usuario')
        if (body.status) {
          this.definiciones = body.data.definiciones
          this.misValores = body.data.valores
        }
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },
    async guardarMisPreferencias(valores) {
      this.error = null
      try {
        const { data: body } = await api.put('/preferencias/usuario', valores)
        if (body.status) {
          this.misValores = { ...this.misValores, ...valores }
        }
        return body
      } catch (err) {
        this.error = err.message
        throw err
      }
    },
    async crearDefinicion(data) {
      const { data: body } = await api.post('/preferencias', data)
      if (body.status) await this.fetchDefiniciones()
      return body
    },
    async actualizarDefinicion(id, data) {
      const { data: body } = await api.put(`/preferencias/${id}`, data)
      if (body.status) await this.fetchDefiniciones()
      return body
    },
    async eliminarDefinicion(id) {
      const { data: body } = await api.delete(`/preferencias/${id}`)
      if (body.status) await this.fetchDefiniciones()
      return body
    },
  },
})
```

## 10. Instancia de Axios — `src/api/axios.js`

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const body = error.response.data
      if (body && body.status === false && (body.error === 'Token requerido' || body.error === 'Token invalido o expirado')) {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        window.location.href = '/login'
      }
    }
    console.error('[API Error]', error.message)
    return Promise.reject(error)
  }
)

export default api
```

## 11. Vista de Login — `src/views/LoginView.vue`

```javascript
<template>
  <div class="d-flex align-items-center justify-content-center" style="min-height: 100vh; background: #f5f5f5;">
    <div class="card shadow-sm" style="width: 100%; max-width: 400px;">
      <div class="card-body p-4">
        <h3 class="text-center mb-4">Iniciar Sesión</h3>

        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label class="form-label">Usuario</label>
            <input v-model="username" type="text" class="form-control" required autocomplete="username" />
          </div>
          <div class="mb-3">
            <label class="form-label">Contraseña</label>
            <input v-model="password" type="password" class="form-control" required autocomplete="current-password" />
          </div>
          <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
          <button type="submit" class="btn btn-dark w-100" :disabled="cargando">
            {{ cargando ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'

export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      error: '',
      cargando: false,
    }
  },
  methods: {
    async handleLogin() {
      this.error = ''
      this.cargando = true
      try {
        await useAuthStore().login(this.username, this.password)
        await useAuthStore().fetchPerfil()
        this.$router.push({ name: 'dashboard' })
      } catch (err) {
        this.error = err.response?.data?.error || 'Error al iniciar sesión'
      } finally {
        this.cargando = false
      }
    },
  },
}
</script>
```

## 12. Vista Dashboard — `src/views/DashboardView.vue`

```javascript
<template>
  <div class="container py-4">
    <h1 class="mb-4">Dashboard</h1>
    <div class="alert alert-info">
      Bienvenido, <strong>{{ auth.usuario?.username }}</strong>.
      <span class="ms-2 badge bg-secondary">{{ roles.join(', ') }}</span>
    </div>
    <p class="text-muted">Hoy es {{ new Date().toLocaleDateString() }}.</p>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'

export default {
  name: 'DashboardView',
  data() {
    return { auth: useAuthStore() }
  },
  computed: {
    roles() {
      return this.auth.roles || []
    },
  },
}
</script>
```

## 13. Vista de Perfil — `src/views/ProfileView.vue`

```javascript
<template>
  <div class="container py-4">
    <h1 class="mb-4">Mi Perfil</h1>

    <form @submit.prevent="guardar" class="row g-3" style="max-width: 500px;">
      <div class="col-12">
        <label class="form-label">Nombre de usuario</label>
        <input v-model="form.username" type="text" class="form-control" required />
      </div>

      <hr class="my-2" />
      <p class="text-muted small mb-0">Cambiar contraseña (dejar en blanco para mantenerla)</p>

      <div class="col-12">
        <label class="form-label">Contraseña actual</label>
        <input v-model="form.passwordActual" type="password" class="form-control" autocomplete="current-password" />
      </div>
      <div class="col-12">
        <label class="form-label">Nueva contraseña</label>
        <input v-model="form.passwordNuevo" type="password" class="form-control" autocomplete="new-password" />
      </div>
      <div class="col-12">
        <label class="form-label">Confirmar nueva contraseña</label>
        <input v-model="form.confirmarPassword" type="password" class="form-control" autocomplete="new-password" />
      </div>

      <div v-if="mensaje" class="alert" :class="mensajeTipo" role="alert">{{ mensaje }}</div>

      <div class="col-12">
        <button type="submit" class="btn btn-primary" :disabled="cargando">
          {{ cargando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'

export default {
  name: 'ProfileView',
  data() {
    const auth = useAuthStore()
    return {
      auth,
      form: {
        username: auth.usuario?.username || '',
        passwordActual: '',
        passwordNuevo: '',
        confirmarPassword: '',
      },
      mensaje: '',
      mensajeTipo: '',
      cargando: false,
    }
  },
  methods: {
    async guardar() {
      this.mensaje = ''
      if (this.form.passwordNuevo && this.form.passwordNuevo !== this.form.confirmarPassword) {
        this.mensaje = 'Las contrasenas no coinciden'
        this.mensajeTipo = 'alert-danger'
        this.cargando = false
        return
      }
      this.cargando = true
      try {
        await this.auth.actualizarPerfil({
          username: this.form.username,
          passwordActual: this.form.passwordActual || undefined,
          passwordNuevo: this.form.passwordNuevo || undefined,
        })
        this.form.passwordActual = ''
        this.form.passwordNuevo = ''
        this.form.confirmarPassword = ''
        this.mensaje = 'Perfil actualizado correctamente'
        this.mensajeTipo = 'alert-success'
      } catch (err) {
        this.mensaje = err.response?.data?.error || 'Error al actualizar'
        this.mensajeTipo = 'alert-danger'
      } finally {
        this.cargando = false
      }
    },
  },
}
</script>
```

## 13B. Vista 404 — `src/views/NotFoundView.vue`

```javascript
<template>
  <div class="d-flex align-items-center justify-content-center" style="min-height: 100vh; background: #f5f5f5;">
    <div class="text-center">
      <h1 class="display-1 fw-bold text-muted">404</h1>
      <p class="fs-4">Pagina no encontrada</p>
      <router-link to="/" class="btn btn-dark">Volver al inicio</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFoundView',
}
</script>
```

## 13C. Vista Preferencias de Usuario — `src/views/PreferenciasView.vue`

Vista donde cada usuario configura sus propias preferencias. Renderiza un formulario dinámico basado en las definiciones de `preferencias_permitidas`.

```javascript
<template>
  <div class="container py-4">
    <h1 class="mb-4">Mis Preferencias</h1>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border" role="status"></div>
    </div>

    <form v-else @submit.prevent="guardar" style="max-width: 600px;">
      <div v-for="def in store.definiciones" :key="def.id" class="mb-3">
        <label class="form-label fw-medium">{{ def.nombre }}</label>
        <p v-if="def.descripcion" class="text-muted small mb-1">{{ def.descripcion }}</p>

        <!-- Boolean -->
        <div v-if="def.tipo === 'boolean'" class="form-check form-switch">
          <input type="checkbox" class="form-check-input" :id="'pref-' + def.id"
            v-model="form[def.clave]" :true-value="'true'" :false-value="'false'" />
          <label class="form-check-label" :for="'pref-' + def.id">{{ form[def.clave] === 'true' ? 'Activado' : 'Desactivado' }}</label>
        </div>

        <!-- Select -->
        <select v-else-if="def.tipo === 'select' && def.opciones" class="form-select" v-model="form[def.clave]">
          <option v-for="opt in parseOpciones(def.opciones)" :key="opt" :value="opt">{{ opt }}</option>
        </select>

        <!-- Number -->
        <input v-else-if="def.tipo === 'number'" type="number" class="form-control" v-model.number="form[def.clave]" />

        <!-- JSON -->
        <textarea v-else-if="def.tipo === 'json'" class="form-control" rows="3" v-model="form[def.clave]"></textarea>

        <!-- String (default) -->
        <input v-else type="text" class="form-control" v-model="form[def.clave]" />
      </div>

      <div v-if="mensaje" class="alert" :class="mensajeTipo" role="alert">{{ mensaje }}</div>

      <button type="submit" class="btn btn-success" :disabled="guardando">
        {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
      </button>
    </form>
  </div>
</template>

<script>
import { usePreferenciasStore } from '../stores/preferencias'

export default {
  name: 'PreferenciasView',
  data() {
    return {
      store: usePreferenciasStore(),
      form: {},
      mensaje: '',
      mensajeTipo: '',
      guardando: false,
    }
  },
  computed: {
    loading() {
      return this.store.loading
    },
  },
  methods: {
    parseOpciones(json) {
      try { return JSON.parse(json) } catch { return [] }
    },
    async guardar() {
      this.mensaje = ''
      this.guardando = true
      try {
        await this.store.guardarMisPreferencias(this.form)
        this.mensaje = 'Preferencias guardadas correctamente'
        this.mensajeTipo = 'alert-success'
      } catch (err) {
        this.mensaje = err.response?.data?.error || 'Error al guardar preferencias'
        this.mensajeTipo = 'alert-danger'
      } finally {
        this.guardando = false
      }
    },
  },
  async mounted() {
    await this.store.fetchMisPreferencias()
    this.form = {}
    for (const def of this.store.definiciones) {
      this.form[def.clave] = this.store.misValores[def.clave] ?? def.valor_defecto
    }
  },
}
</script>
```

## 13D. Componente de tabla reutilizable — `src/components/TableEditor.vue`

Componente de tabla Bootstrap 5 completo con toolbar, selección de columnas (dropdown), reordenar columnas (drag & drop nativo), redimensionar columnas (pointer events), edición inline (doble click), ordenamiento, búsqueda global y filtro por columna, paginación server-side/client-side, scroll infinito (IntersectionObserver), selección single/multiple, preferencias persistentes (orden, ancho, visibilidad vía `usePreferenciasStore`), grupos de columnas y acciones por fila.

**Props principales:**
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `api` | Object | `null` | `{ list, create, edit, delete }` — métodos CRUD |
| `permisos` | Object | `{}` | `{ ver, crear, editar, eliminar }` — permisos |
| `config` | Object | `{}` | Configuración (ver abajo) |
| `data` | Array | `null` | Datos directos (alternativa a `api.list`) |
| `id` | String | `null` | Clave para persistencia de preferencias |

**Config (`config`):**
| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `lazy` | Boolean | `false` | Carga server-side vía `api.list` |
| `selectionMode` | String | `'single'` | `'single'`, `'multiple'`, o `null` |
| `infiniteScroll` | Boolean | `false` | Scroll infinito (por defecto true si lazy) |
| `elementName` | Object | — | `{ singular, gender }` para labels CRUD |
| `columnGroups` | Array | — | `[{ headerName, fields }]` para grupos |
| `inlineEditing` | Object | — | `{ campos: { [field]: cfg }, api, debounce_ms }` |
| `valueFormatters` | Object | — | `{ [field]: (row) => html }` |
| `showFilterRow` | Boolean | `false` | Fila de filtros por columna |
| `scrollHeight` | String | `null` | Altura máxima del scroll |
| `pageSize` | Number | `25` | Filas por página |
| `hideToolbar` | Boolean | `false` | Oculta toolbar completo |
| `hideRefresh` | Boolean | `false` | Oculta botón refresh |
| `hideCsvExport` | Boolean | `false` | Oculta botón CSV |
| `buttons` | Object | — | `{ toolbar: BtnConfig[], rowActions: BtnConfig[] }` |

**Eventos:**
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `loaded` | `Boolean` | Datos cargados |
| `rowSelected` | `Object\|null` | Fila seleccionada (single) o `null` |
| `rowDoubleClick` | `Object` | Fila sobre la que se hizo doble click |

**Métodos expuestos (`ref`):**
| Método | Descripción |
|--------|-------------|
| `loadData(data?)` | Recarga datos desde `api.list` o datos pasados |
| `applyConfig()` | Re-aplica configuración desde props |
| `refresh()` | Recarga datos y resetea selección |

**BtnConfig:**
```javascript
new BtnConfig({
  key: 'mi-boton',
  icon: 'bi bi-star',
  severity: 'btn-info',
  label: 'Mi Botón',
  getLabel: () => string,       // label dinámico
  isVisible: () => boolean,      // visibilidad dinámica
  isDisabled: () => boolean,     // disabled dinámico
  onClick: () => void,           // manejador
  helpKey: 'mi-ayuda',          // opcional
})
```

**Tecnologías:**
- Bootstrap 5 + Bootstrap Icons (sin PrimeVue)
- Composition API (`<script setup>`)
- Drag & Drop nativo (HTML5)
- Pointer Events para resize
- IntersectionObserver para scroll infinito
- `usePreferenciasStore` para persistencia

```javascript
<template>
  <div class="te-wrapper">
    <!-- Toolbar -->
    <div v-if="!config?.hideToolbar" class="te-toolbar">
      <div class="te-toolbar-start">
        <button v-for="btn in toolbarButtons" :key="btn.key"
          :class="['btn', 'btn-sm', btn.severity, btn.class]"
          :disabled="btn.isDisabled()"
          @click="btn.onClick"
          :title="btn.label">
          <i v-if="btn.icon" :class="btn.icon + ' me-1'"></i>{{ btn.label }}
        </button>
      </div>
      <div class="te-toolbar-end">
        <!-- Dropdown visibilidad de columnas -->
        <div class="dropdown d-inline-block me-2">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" title="Columnas">
            <i class="bi bi-layout-three-columns me-1"></i>Columnas
          </button>
          <div class="dropdown-menu p-2" style="min-width:220px">
            <div v-for="col in availableColumns" :key="col.field" class="dropdown-item form-check px-2 py-1">
              <input type="checkbox" :id="'te-cols-'+col.field" :value="col"
                v-model="selectedColumns" class="form-check-input" @change="onColumnsChangeDebounced" />
              <label :for="'te-cols-'+col.field" class="form-check-label ms-1">{{ col.headerName }}</label>
            </div>
          </div>
        </div>
        <!-- Búsqueda global -->
        <div class="input-group input-group-sm" style="width:200px">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="text" class="form-control" v-model="globalFilterValue"
            @input="onGlobalFilterDebounced" placeholder="Buscar..." />
        </div>
      </div>
    </div>

    <!-- Scroll wrap -->
    <div class="te-scroll-wrap" :style="scrollHeight ? { height: scrollHeight, minHeight: scrollHeight } : {}"
      ref="scrollWrapRef">
      <!-- Loading overlay -->
      <div v-if="loading" class="te-loading-overlay">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>

      <table class="te-table" :class="{ 'te-striped': striped }">
        <colgroup>
          <col v-if="selectionMode !== null" :style="{ width: selectionColWidth }" />
          <col v-if="rowActionButtons.length" :style="{ width: actionColWidth }" />
          <col v-for="col of visibleColumns" :key="col.field"
            :style="{ width: columnWidths[col.field] || '15rem' }" :data-field="col.field" />
          <col class="te-col-filler" />
        </colgroup>

        <thead>
          <!-- Grupos de columnas -->
          <tr v-if="hasColumnGroups" class="te-header-group-row">
            <th v-if="selectionMode !== null" class="te-th te-th-sel" :rowspan="2">
              <input v-if="selectionMode === 'multiple'" type="checkbox"
                :checked="isAllSelected" @change="toggleSelectAll" />
            </th>
            <th v-if="rowActionButtons.length" class="te-th te-th-acts" :rowspan="2">Acciones</th>
            <template v-for="hcol of columnGroupHeaders" :key="hcol._key">
              <th v-if="hcol._type === 'group'" :colspan="hcol._span" class="te-th te-th-group">
                <span class="te-th-group-label">{{ hcol.headerName }}</span>
              </th>
              <th v-else :rowspan="2" :data-field="hcol._col.field"
                :class="['te-th', hcol._col.css]">
                <div class="te-th-content">
                  <span class="te-th-label" @click="onSortClick(hcol._col.field)">
                    {{ hcol._col.headerName }}
                    <span v-if="hcol._col.sortable !== false" class="te-sort-icon-std">
                      {{ sortField === hcol._col.field ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅' }}
                    </span>
                  </span>
                </div>
                <div class="te-resize-handle" @pointerdown.stop="onResizeStart($event, hcol._col.field)"
                  @dblclick.stop="onResizeDblClick($event, hcol._col.field)" @click.stop />
              </th>
            </template>
            <th class="te-th te-th-filler" :rowspan="2" />
          </tr>
          <tr v-if="hasColumnGroups" class="te-header-row te-has-groups">
            <template v-for="hcol of columnGroupHeaders" :key="'r2-'+hcol._key">
              <template v-if="hcol._type === 'group'">
                <th v-for="col of hcol._cols" :key="col.field" :data-field="col.field"
                  :class="['te-th', col.css]">
                  <div class="te-th-content">
                    <span class="te-th-label" @click="onSortClick(col.field)">
                      {{ col.headerName }}
                      <span v-if="col.sortable !== false" class="te-sort-icon-std">
                        {{ sortField === col.field ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅' }}
                      </span>
                    </span>
                  </div>
                  <div class="te-resize-handle" @pointerdown.stop="onResizeStart($event, col.field)"
                    @dblclick.stop="onResizeDblClick($event, col.field)" @click.stop />
                </th>
              </template>
            </template>
          </tr>

          <!-- Fila header principal (sin grupos) -->
          <tr v-if="!hasColumnGroups" class="te-header-row">
            <th v-if="selectionMode !== null" class="te-th te-th-sel">
              <input v-if="selectionMode === 'multiple'" type="checkbox"
                :checked="isAllSelected" @change="toggleSelectAll" />
            </th>
            <th v-if="rowActionButtons.length" class="te-th te-th-acts">Acciones</th>
            <th v-for="col of visibleColumns" :key="col.field"
              :data-field="col.field"
              :class="['te-th', col.css, {
                'te-th-dragover-left': dragOverField === col.field && dropSide === 'left',
                'te-th-dragover-right': dragOverField === col.field && dropSide === 'right',
                'te-th-dragging': dragField === col.field
              }]"
              :draggable="reorderableColumns"
              @dragstart="onDragStart($event, col.field)"
              @dragenter.prevent="onDragEnter($event, col.field)"
              @dragover.prevent="onDragOver($event, col.field)"
              @dragleave="onDragLeave($event, col.field)"
              @drop.prevent="onDrop($event, col.field)"
              @dragend="onDragEnd">
              <div class="te-th-content">
                <span v-if="reorderableColumns" class="te-th-grip">⠿</span>
                <span class="te-th-label" @click="onSortClick(col.field)">
                  {{ col.headerName }}
                  <span v-if="col.sortable !== false" class="te-sort-icon-std">
                    {{ sortField === col.field ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅' }}
                  </span>
                </span>
              </div>
              <div class="te-resize-handle" :class="{ 'te-resizing-active': resizingField === col.field }"
                draggable="false" @pointerdown.stop="onResizeStart($event, col.field)"
                @dblclick.stop="onResizeDblClick($event, col.field)" @click.stop />
              <div v-if="dragOverField === col.field && dropSide === 'left'" class="te-drop-indicator te-drop-left" />
              <div v-if="dragOverField === col.field && dropSide === 'right'" class="te-drop-indicator te-drop-right" />
            </th>
            <th class="te-th te-th-filler" />
          </tr>

          <!-- Fila de filtros por columna -->
          <tr v-if="showFilterRow" class="te-filter-row">
            <td v-if="selectionMode !== null" class="te-td" />
            <td v-if="rowActionButtons.length" class="te-td" />
            <td v-for="col of visibleColumns" :key="'f-'+col.field" class="te-td">
              <input v-model="columnFilters[col.field]" @input="onColumnFilterDebounced"
                type="text" class="te-filter-input" placeholder="" />
              <div class="te-resize-handle" draggable="false"
                @pointerdown.stop="onResizeStart($event, col.field)"
                @dblclick.stop="onResizeDblClick($event, col.field)" @click.stop />
            </td>
            <td class="te-td te-td-filler" />
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, rIdx) of displayRows" :key="rIdx"
            :class="['te-tr', row.__css_class, {
              'te-tr-selected': isSelected(row),
              'te-tr-highlight': selectedRow === row
            }]"
            :style="row.__style"
            @click="onRowClick(row)"
            @dblclick="onRowDblClick(row)">
            <td v-if="selectionMode !== null" class="te-td te-td-sel" @click.stop>
              <input v-if="selectionMode === 'multiple'" type="checkbox"
                :checked="isSelected(row)" @change="toggleRowSelection(row)" />
              <input v-else type="radio" :checked="selectedRow === row"
                @change="selectSingle(row)" />
            </td>
            <td v-if="rowActionButtons.length" class="te-td te-td-acts">
              <div class="te-actions-wrap">
                <button v-for="btn of rowActionButtons" :key="btn.key"
                  v-if="btn._isVisible()"
                  :class="['btn', 'btn-sm', btn.severity, btn.class]"
                  :disabled="btn.isDisabled()"
                  @click.stop="btn.onClick(row)"
                  :title="btn.getLabel()">
                  <i v-if="btn.icon" :class="btn.icon"></i> {{ btn.getLabel() }}
                </button>
              </div>
            </td>
            <td v-for="col of visibleColumns" :key="col.field"
              :class="['te-td', col.css, {
                'te-td-inline-edit': !!getInlineEditCfg(col)
              }]"
              :style="cellStyle(row, col)">
              <template v-if="isEditingCell(row, col)">
                <input v-model="inlineEditValue" type="text" class="te-editing-input"
                  @blur="confirmInlineEdit(row, col)"
                  @keydown.enter="confirmInlineEdit(row, col)"
                  @keydown.escape="cancelInlineEdit"
                  ref="inlineEditRef" />
              </template>
              <div v-else class="te-cell-wrap">
                <span @dblclick="startInlineEdit($event, row, col)" v-html="formatCell(row, col)" />
                <button v-if="getInlineEditCfg(col)" class="te-inline-edit-btn"
                  @click.stop="startInlineEdit($event, row, col)" title="Editar inline">
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
              <div class="te-resize-handle" draggable="false"
                @pointerdown.stop="onResizeStart($event, col.field)"
                @dblclick.stop="onResizeDblClick($event, col.field)" @click.stop />
            </td>
            <td class="te-td te-td-filler" />
          </tr>
          <tr v-if="!displayRows.length">
            <td :colspan="totalColspan" class="te-td te-empty">Sin registros</td>
          </tr>
        </tbody>
      </table>

      <!-- Sentinel para infinite scroll -->
      <div v-if="infiniteScroll" ref="sentinelRef" class="te-sentinel">
        <span v-if="isLoadingMore" class="te-loading-spinner"></span>
      </div>
    </div>

    <!-- Paginador -->
    <div v-show="!infiniteScroll && showPaginator" class="te-paginator">
      <span class="te-page-info">Mostrando {{ pageStart }} a {{ pageEnd }} de {{ totalRows }}</span>
      <div class="te-page-controls">
        <button class="te-page-btn" :disabled="page <= 1" @click="goToPage(1)">««</button>
        <button class="te-page-btn" :disabled="page <= 1" @click="goToPage(page - 1)">«</button>
        <span class="te-page-current">{{ page }} / {{ totalPages }}</span>
        <button class="te-page-btn" :disabled="page >= totalPages" @click="goToPage(page + 1)">»</button>
        <button class="te-page-btn" :disabled="page >= totalPages" @click="goToPage(totalPages)">»»</button>
      </div>
      <select v-model="pageSize" class="te-page-size form-select form-select-sm" @change="onPageSizeChange">
        <option v-for="s of pageSizeOptions" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { usePreferenciasStore } from '@/stores/preferencias'
import api from '@/api/axios'

const props = defineProps({
  api: { type: Object, default: null },
  permisos: { type: Object, default: () => ({}) },
  config: { type: Object, default: () => ({}) },
  data: { type: Array, default: null },
  id: { type: String, default: null },
})

const emit = defineEmits(['loaded', 'rowSelected', 'rowDoubleClick'])

const prefStore = usePreferenciasStore()
const STORAGE_KEY_PREFIX = 'te_cfg'

function getPrefKey() { return props.id ? `${STORAGE_KEY_PREFIX}_${props.id}` : null }

// ── Persistencia ─────────────────────────────────────
let saveTimer = null
async function loadPersistedConfig() {
  const key = getPrefKey()
  if (!key) return null
  try {
    const val = prefStore.valor(key)
    if (val) return typeof val === 'string' ? JSON.parse(val) : val
    return null
  } catch { return null }
}

async function savePersistedConfig() {
  const key = getPrefKey()
  if (!key) return
  const fields = visibleColumns.value.map(c => c.field)
  const cw = {}
  for (const f of fields) cw[f] = columnWidths.value[f] || '15rem'
  const ord = columnOrder.value.length ? columnOrder.value : fields
  await prefStore.guardarMisPreferencias({ [key]: JSON.stringify({ columnOrder: ord, columnWidths: cw }) })
}

function debouncedPersist() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => savePersistedConfig(), 500)
}

// ── BtnConfig helper ─────────────────────────────────
class BtnConfig {
  constructor(cfg) {
    this.key = cfg.key
    this.icon = cfg.icon
    this.severity = cfg.severity || 'btn-outline-primary'
    this.class = cfg.class || ''
    this.label = cfg.label || ''
    this._getLabel = cfg.getLabel || (() => cfg.label || '')
    this._isVisible = cfg.isVisible || (() => true)
    this._isDisabled = cfg.isDisabled || (() => false)
    this.onClick = cfg.onClick || (() => {})
    this.helpKey = cfg.helpKey || null
  }
  getLabel() { return this._getLabel() }
  isVisible() { return this._isVisible() }
  isDisabled() { return this._isDisabled() }
}

// ── Estado reactivo ──────────────────────────────────
const rows = ref([])
const columnDefs = ref([])
const selectedColumns = ref([])
const availableColumns = ref([])
const isLoaded = ref(false)
const editEnabled = ref(true)
const selectionMode = ref('single')
const selectedRow = ref(null)
const selectedRows = ref(new Map())
const sortField = ref(null)
const sortOrder = ref('asc')
const columnFilters = ref({})
const globalFilterValue = ref('')
const page = ref(1)
const pageSize = ref(25)
const pageSizeOptions = ref([25, 50, 100, 200])
const scrollHeight = ref(null)
const showPaginator = ref(true)
const showFilterRow = ref(false)
const striped = ref(true)
const resizableColumns = ref(true)
const reorderableColumns = ref(true)
const selectionColWidth = ref('3rem')
const actionColWidth = ref('10rem')
const columnWidths = ref({})
const columnOrder = ref([])
const loading = ref(false)
const totalRecords = ref(0)
const lazy = computed(() => props.config?.lazy === true)
const infiniteScroll = computed(() => props.config?.infiniteScroll === true || (props.config?.infiniteScroll !== false && lazy.value))
const isLoadingMore = ref(false)
const hasMorePages = ref(true)
const infinitePage = ref(1)
const sentinelRef = ref(null)
const scrollWrapRef = ref(null)
let infiniteObserver = null

// Drag & drop
const dragField = ref(null)
const dragOverField = ref(null)
const dropSide = ref(null)

// Resize
const resizingField = ref(null)
let resizeStartX = null
let resizeStartWidth = null

// Inline editing
const editingCell = ref(null)
const inlineEditValue = ref('')
const inlineEditRef = ref(null)
let inlineSaveTimer = null
let pendingInlineSave = null

// Filter debounce
let filterTimer = null
let gfTimer = null
let colsTimer = null

// Labels
const elementLabels = ref({
  create: 'Nuevo', edit: 'Editar', delete: 'Borrar',
  article: 'un', deleted: 'eliminado'
})

// ── Computed ─────────────────────────────────────────
const visibleColumns = computed(() => {
  const sel = selectedColumns.value
  if (columnOrder.value.length) {
    const ordered = []
    for (const f of columnOrder.value) {
      const found = sel.find(c => c.field === f)
      if (found) ordered.push(found)
    }
    for (const c of sel) if (!ordered.some(x => x.field === c.field)) ordered.push(c)
    return ordered
  }
  return sel
})

const rowActionButtons = computed(() => buttonGroups.value.rowActions || [])

const totalColspan = computed(() => {
  let n = visibleColumns.value.length + 1
  if (selectionMode.value !== null) n++
  if (rowActionButtons.value.length) n++
  return n
})

const hasColumnGroups = computed(() => {
  return props.config?.columnGroups?.length > 0
})

const inlineEditingConfig = computed(() => props.config?.inlineEditing)
const inlineEditFields = computed(() => inlineEditingConfig.value?.campos || {})

const columnGroupHeaders = computed(() => {
  if (!hasColumnGroups.value) return []
  const groups = props.config.columnGroups || []
  const cols = visibleColumns.value
  const fieldToGroup = {}
  for (let gi = 0; gi < groups.length; gi++) {
    for (const f of groups[gi].fields) fieldToGroup[f] = gi
  }
  const result = []
  let i = 0
  while (i < cols.length) {
    const col = cols[i]
    const gi = fieldToGroup[col.field]
    if (gi !== undefined) {
      const groupCols = []
      while (i < cols.length && fieldToGroup[cols[i].field] === gi) {
        groupCols.push(cols[i])
        i++
      }
      result.push({ _key: 'g-' + gi, _type: 'group', headerName: groups[gi].headerName, _span: groupCols.length, _cols: groupCols })
    } else {
      result.push({ _key: 'c-' + col.field, _type: 'col', _col: col })
      i++
    }
  }
  return result
})

// Data filtering (client-side)
const filteredRows = computed(() => {
  let r = rows.value || []
  const gf = globalFilterValue.value
  if (gf) {
    const q = gf.toLowerCase()
    r = r.filter(row => visibleColumns.value.some(c => {
      const v = row[c.field]
      return v != null && String(v).toLowerCase().includes(q)
    }))
  }
  for (const col of visibleColumns.value) {
    const fv = columnFilters.value[col.field]
    if (fv) {
      const q = fv.toLowerCase()
      r = r.filter(row => {
        const v = row[col.field]
        return v != null && String(v).toLowerCase().includes(q)
      })
    }
  }
  if (sortField.value) {
    r = [...r].sort((a, b) => {
      let va = a[sortField.value], vb = b[sortField.value]
      if (va == null) va = ''
      if (vb == null) vb = ''
      if (typeof va === 'number' && typeof vb === 'number')
        return sortOrder.value === 'asc' ? va - vb : vb - va
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
      return sortOrder.value === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }
  return r
})

const totalRows = computed(() => lazy.value ? totalRecords.value : filteredRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))

const displayRows = computed(() => {
  if (infiniteScroll.value) return rows.value || []
  if (lazy.value) return rows.value || []
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const pageStart = computed(() => (page.value - 1) * pageSize.value + 1)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, totalRows.value))

const isAllSelected = computed(() => {
  return displayRows.value.length > 0 && displayRows.value.every(r => isSelected(r))
})

// ── Toolbar buttons ──────────────────────────────────
const buttonGroups = ref({
  toolbar: [
    new BtnConfig({ key: 'refresh', icon: 'bi bi-arrow-clockwise', class: 'me-1', severity: 'btn-outline-info',
      isVisible: () => !props.config?.hideRefresh,
      onClick: () => refresh() }),
    new BtnConfig({ key: 'csv', icon: 'bi bi-download', class: 'me-1', severity: 'btn-outline-info', label: 'CSV',
      isVisible: () => !props.config?.hideCsvExport,
      onClick: () => exportCsv() }),
    new BtnConfig({ key: 'create', icon: 'bi bi-plus-lg', class: 'me-1', severity: 'btn-success',
      isVisible: () => props.api?.create != null,
      getLabel: () => elementLabels.value.create,
      onClick: () => createRecord() }),
    new BtnConfig({ key: 'edit', icon: 'bi bi-pencil', class: 'me-1', severity: 'btn-warning',
      isVisible: () => props.api?.edit != null,
      getLabel: () => elementLabels.value.edit,
      isDisabled: () => editEnabled.value,
      onClick: () => editRecord() }),
    new BtnConfig({ key: 'delete', icon: 'bi bi-trash', class: 'me-1', severity: 'btn-danger',
      isVisible: () => props.api?.delete != null,
      getLabel: () => elementLabels.value.delete,
      isDisabled: () => editEnabled.value,
      onClick: () => deleteRecord() }),
  ],
  rowActions: []
})

const toolbarButtons = computed(() => {
  const btns = []
  for (const b of buttonGroups.value.toolbar) {
    if (b.isVisible()) btns.push(b)
  }
  if (props.config?.buttons?.toolbar) {
    for (const b of props.config.buttons.toolbar) {
      btns.push(b instanceof BtnConfig ? b : new BtnConfig(b))
    }
  }
  return btns
})

// ── Config ───────────────────────────────────────────
function applyConfig() {
  if (props.config?.selectionMode != null) selectionMode.value = props.config.selectionMode
  if (props.config?.elementName?.gender === 'F') {
    elementLabels.value = { create: 'Nueva', edit: 'Editar', delete: 'Borrar', article: 'una', deleted: 'eliminada' }
  }
  if (props.config?.pageSize != null) pageSize.value = props.config.pageSize
  if (props.config?.pageSizeOptions != null) pageSizeOptions.value = props.config.pageSizeOptions
  if (props.config?.scrollHeight != null) scrollHeight.value = props.config.scrollHeight
  if (props.config?.showPaginator != null) showPaginator.value = props.config.showPaginator
  if (props.config?.showFilterRow != null) showFilterRow.value = props.config.showFilterRow
  if (props.config?.buttons?.rowActions) {
    for (const b of props.config.buttons.rowActions) {
      buttonGroups.value.rowActions.push(b instanceof BtnConfig ? b : new BtnConfig(b))
    }
  }
}

// ── Format helpers ───────────────────────────────────
function invertHexColor(h) {
  if (h.length !== 7) return null
  return '#' + (255 - parseInt(h.slice(1, 3), 16)).toString(16).padStart(2, '0') +
    (255 - parseInt(h.slice(3, 5), 16)).toString(16).padStart(2, '0') +
    (255 - parseInt(h.slice(5, 7), 16)).toString(16).padStart(2, '0')
}

function unwrapCell(row, col) {
  if (row == null) return { value: null, style: null }
  const v = row[col?.field]
  if (v != null && typeof v === 'object' && '__style' in v) return { value: v.value, style: v.__style }
  if (row.__field_styles?.[col?.field]) return { value: v, style: row.__field_styles[col?.field] }
  return { value: v, style: null }
}

function cellStyle(row, col) {
  return unwrapCell(row, col).style
}

function formatCell(row, col) {
  let { value: data } = unwrapCell(row, col)
  if (data == null || data === '') return '-'
  const formatter = props.config?.valueFormatters?.[col?.field]
  // Color badge
  if (col?.form_type === 'color') {
    const bg = '#' + (data || '000000')
    const fg = invertHexColor(bg) || '#ffffff'
    return `<span class="te-color-badge" style="background:${bg};color:${fg}">${data}</span>`
  }
  if (col?.form_type === 'json') return JSON.stringify(data)
  // Date formatting
  if (col?.type === 'date' || col?.field?.endsWith('_at') || col?.field?.endsWith('At')) {
    try { return new Date(data).toLocaleDateString() } catch { return data }
  }
  if (col?.type === 'datetime') {
    try { return new Date(data).toLocaleString() } catch { return data }
  }
  if (col?.type === 'boolean' || col?.type === 'bool') return data ? 'Sí' : 'No'
  return typeof formatter === 'function' ? formatter(row) : String(data)
}

// ── Selection ────────────────────────────────────────
function isSelected(row) {
  if (selectionMode.value === 'single') return selectedRow.value === row
  return selectedRows.value.has(row)
}

function selectSingle(row) {
  selectedRow.value = row
  editEnabled.value = false
  emit('rowSelected', row)
}

function toggleRowSelection(row) {
  if (selectedRows.value.has(row)) selectedRows.value.delete(row)
  else selectedRows.value.set(row, true)
  editEnabled.value = selectedRows.value.size === 0
  emit('rowSelected', [...selectedRows.value.keys()])
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedRows.value = new Map()
    editEnabled.value = true
    emit('rowSelected', [])
  } else {
    const m = new Map()
    for (const r of displayRows.value) m.set(r, true)
    selectedRows.value = m
    editEnabled.value = false
    emit('rowSelected', [...m.keys()])
  }
}

function onRowClick(row) {
  if (resizingField.value || dragField.value) return
  if (selectionMode.value === 'multiple') toggleRowSelection(row)
  else selectSingle(row)
}

function onRowDblClick(row) {
  if (resizingField.value || dragField.value) return
  emit('rowDoubleClick', row)
}

// ── Sort ─────────────────────────────────────────────
function onSortClick(field) {
  if (resizingField.value || dragField.value) return
  const col = visibleColumns.value.find(c => c.field === field)
  if (col?.sortable === false) return
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  page.value = 1
  if (lazy.value) {
    if (infiniteScroll.value) { infinitePage.value = 1; hasMorePages.value = true; rows.value = [] }
    loadLazyData()
  }
}

// ── Filter ───────────────────────────────────────────
function onGlobalFilterDebounced() {
  if (gfTimer) clearTimeout(gfTimer)
  gfTimer = setTimeout(() => {
    page.value = 1
    if (lazy.value) {
      if (infiniteScroll.value) { infinitePage.value = 1; hasMorePages.value = true; rows.value = [] }
      loadLazyData()
    }
  }, 300)
}

function onColumnFilterDebounced() {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    page.value = 1
    if (lazy.value) {
      if (infiniteScroll.value) { infinitePage.value = 1; hasMorePages.value = true; rows.value = [] }
      loadLazyData()
    }
  }, 400)
}

function onColumnsChangeDebounced() {
  if (colsTimer) clearTimeout(colsTimer)
  colsTimer = setTimeout(() => debouncedPersist(), 300)
}

// ── Pagination ───────────────────────────────────────
function goToPage(p) {
  flushInlineEdit()
  page.value = Math.max(1, Math.min(p, totalPages.value))
  if (lazy.value) loadLazyData()
}

function onPageSizeChange() {
  flushInlineEdit()
  page.value = 1
  if (lazy.value) loadLazyData()
}

// ── Column resize (pointer events) ───────────────────
function onResizeStart(e, field) {
  if (e.button !== 0 || dragField.value) return
  e.preventDefault()
  const el = e.currentTarget.closest('th, td')
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.right - e.clientX > 11) return
  try { el.setPointerCapture(e.pointerId) } catch (_) {}
  resizingField.value = field
  resizeStartX = e.clientX
  resizeStartWidth = el.offsetWidth
  document.body.style.cursor = 'col-resize'
  document.body.classList.add('te-resizing')
  document.addEventListener('pointermove', onResizeMove)
  document.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e) {
  if (!resizingField.value || resizeStartX == null || resizeStartWidth == null) return
  const nw = Math.max(100, resizeStartWidth + (e.clientX - resizeStartX))
  columnWidths.value = { ...columnWidths.value, [resizingField.value]: nw + 'px' }
}

function onResizeEnd() {
  document.removeEventListener('pointermove', onResizeMove)
  document.removeEventListener('pointerup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.classList.remove('te-resizing')
  if (resizingField.value) debouncedPersist()
  resizeStartX = null
  resizeStartWidth = null
  resizingField.value = null
}

function onResizeDblClick(e, field) {
  onResizeStart(e, field)
}

// ── Column reorder (drag & drop) ─────────────────────
function onDragStart(e, field) {
  if (resizingField.value) { e.preventDefault(); return }
  dragField.value = field
  dragOverField.value = null
  dropSide.value = null
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', field)
}

function onDragEnter(e, field) {
  if (dragField.value === field || (e.relatedTarget && e.currentTarget.contains(e.relatedTarget))) return
  dragOverField.value = field
}

function onDragOver(e, field) {
  if (dragField.value === field) return
  e.dataTransfer.dropEffect = 'move'
  const rect = e.currentTarget.getBoundingClientRect()
  dropSide.value = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right'
}

function onDragLeave(e, field) {
  if (e.currentTarget.contains(e.relatedTarget)) return
  if (dragOverField.value === field) { dragOverField.value = null; dropSide.value = null }
}

function onDrop(e, field) {
  if (!dragField.value || dragField.value === field) { onDragEnd(); return }
  const order = columnOrder.value.length ? [...columnOrder.value] : selectedColumns.value.map(c => c.field)
  const from = order.indexOf(dragField.value)
  const to = order.indexOf(field)
  if (from < 0 || to < 0) { onDragEnd(); return }
  const [m] = order.splice(from, 1)
  const at = from < to
    ? (dropSide.value === 'right' ? to : to - 1)
    : (dropSide.value === 'left' ? to : to + 1)
  order.splice(Math.max(0, Math.min(order.length, at)), 0, m)
  columnOrder.value = order
  debouncedPersist()
  onDragEnd()
}

function onDragEnd() {
  dragField.value = null
  dragOverField.value = null
  dropSide.value = null
}

// ── Inline editing ───────────────────────────────────
function getInlineEditCfg(col) {
  return inlineEditFields.value[col?.field] || null
}

function isEditingCell(row, col) {
  if (!editingCell.value) return false
  return editingCell.value.row === row && editingCell.value.field === col.field
}

function startInlineEdit(event, row, col) {
  const cfg = getInlineEditCfg(col)
  if (!cfg) return
  event?.stopPropagation?.()
  const val = row[col.field] ?? ''
  editingCell.value = { row, field: col.field }
  inlineEditValue.value = val
  nextTick(() => {
    const el = inlineEditRef.value
    if (el && typeof el.focus === 'function') { el.focus(); el.select() }
  })
}

function confirmInlineEdit(row, col) {
  if (!editingCell.value) return
  const cfg = getInlineEditCfg(col)
  if (!cfg) { cancelInlineEdit(); return }
  let val = inlineEditValue.value
  if (cfg.type === 'integer') {
    val = parseInt(val, 10)
    if (isNaN(val) || (cfg.min !== undefined && val < cfg.min)) { cancelInlineEdit(); return }
  } else if (cfg.type === 'number') {
    val = parseFloat(val)
    if (isNaN(val) || (cfg.min !== undefined && val < cfg.min)) { cancelInlineEdit(); return }
  }
  row[col.field] = val
  if (!row.__raw) row.__raw = {}
  row.__raw[col.field] = val
  if (cfg.afterEdit) cfg.afterEdit(row, col.field, val)
  editingCell.value = null
  debouncedInlineSave(row, col.field, val)
}

function cancelInlineEdit() {
  editingCell.value = null
  inlineEditValue.value = ''
}

function debouncedInlineSave(row, field, value) {
  const cfg = inlineEditingConfig.value
  if (!cfg?.api) return
  const id = row.id
  if (!id) return
  if (inlineSaveTimer) { clearTimeout(inlineSaveTimer); inlineSaveTimer = null }
  if (pendingInlineSave) { pendingInlineSave.api(pendingInlineSave.data); pendingInlineSave = null }
  pendingInlineSave = { api: cfg.api, data: { id, field, value } }
  inlineSaveTimer = setTimeout(async () => {
    const res = await cfg.api({ id, field, value })
    pendingInlineSave = null
    if (res?.stat && cfg.onSave) cfg.onSave()
  }, cfg.debounce_ms ?? 1000)
}

function flushInlineEdit() {
  editingCell.value = null
  inlineEditValue.value = ''
  if (inlineSaveTimer) { clearTimeout(inlineSaveTimer); inlineSaveTimer = null }
  if (pendingInlineSave) { pendingInlineSave.api(pendingInlineSave.data); pendingInlineSave = null }
}

// ── CRUD ─────────────────────────────────────────────
async function createRecord() {
  console.log('[TableEditor] createRecord - implementar via api.create')
}

async function editRecord() {
  console.log('[TableEditor] editRecord - implementar via api.edit')
}

async function deleteRecord() {
  console.log('[TableEditor] deleteRecord - implementar via api.delete')
}

// ── CSV Export ───────────────────────────────────────
async function exportCsv() {
  let data = rows.value || []
  if (!data.length) return
  const cols = visibleColumns.value
  let csv = cols.map(c => csvEscape(c.headerName)).join(',') + '\n'
  for (const r of data) {
    csv += cols.map(c => csvEscape(r[c.field] != null ? String(r[c.field]) : '')).join(',') + '\n'
  }
  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csv)
  a.download = 'datos.csv'
  a.click()
}

function csvEscape(v) {
  v = String(v).replace(/"/g, '""')
  return v.includes(',') || v.includes('"') || v.includes('\n') ? '"' + v + '"' : v
}

// ── Data loading ─────────────────────────────────────
function refresh() {
  flushInlineEdit()
  selectedRow.value = null
  selectedRows.value = new Map()
  editEnabled.value = true
  if (infiniteScroll.value) { infinitePage.value = 1; hasMorePages.value = true; rows.value = [] }
  loadData()
}

async function loadLazyData() {
  flushInlineEdit()
  loading.value = true
  const p = {
    page: infiniteScroll.value ? infinitePage.value : page.value,
    pageSize: pageSize.value,
    sortField: sortField.value || '',
    sortOrder: sortOrder.value,
    search: globalFilterValue.value || '',
  }
  // Add column filters if any
  const cf = {}
  for (const k of Object.keys(columnFilters.value)) {
    if (columnFilters.value[k]) cf[k] = columnFilters.value[k]
  }
  if (Object.keys(cf).length) p.filters = JSON.stringify(cf)
  try {
    const res = await props.api.list(p)
    if (res?.stat) {
      totalRecords.value = res.data.totalRecords || res.data.total || 0
      processData(res.data)
    }
  } catch (err) {
    console.error('[TableEditor] load error:', err)
  } finally {
    loading.value = false
  }
}

async function loadData(dataOverride) {
  const src = dataOverride || props.data
  if (src != null) return processData(src)
  if (props.api?.list) {
    if (lazy.value) return loadLazyData()
    loading.value = true
    try {
      const res = await props.api.list()
      if (res?.stat) processData(res.data)
    } catch (err) {
      console.error('[TableEditor] load error:', err)
    } finally {
      loading.value = false
    }
  }
  emit('rowSelected', selectionMode.value === 'single' ? null : [])
  selectedRow.value = null
  selectedRows.value = new Map()
}

function processData(data) {
  rows.value = data.rows || []
  let fields_def = data.fields_def
  if (fields_def) {
    columnDefs.value = [...fields_def]
    selectedColumns.value = [...fields_def]
    availableColumns.value = [...fields_def]
    if (props.config?.defaultColumnProps) {
      for (let c = 0; c < selectedColumns.value.length; c++) {
        selectedColumns.value[c] = { ...selectedColumns.value[c], ...props.config.defaultColumnProps }
      }
    }
    if (props.config?.columnOrder) {
      const ordered = []
      for (const f of props.config.columnOrder) {
        const found = selectedColumns.value.find(c => c.field === f)
        if (found) ordered.push(found)
      }
      for (const c of selectedColumns.value) {
        if (!ordered.some(x => x.field === c.field)) ordered.push(c)
      }
      selectedColumns.value = ordered
    }
    // Apply saved widths + order
    loadPersistedConfig().then(saved => {
      if (saved?.columnWidths) {
        for (const [f, w] of Object.entries(saved.columnWidths)) {
          columnWidths.value[f] = w
        }
      }
      columnOrder.value = saved?.columnOrder || []
    })
  }
  isLoaded.value = true
  emit('loaded', true)
}

// ── Infinite scroll ──────────────────────────────────
function setupInfiniteScroll() {
  if (!infiniteScroll.value) return
  const wrap = scrollWrapRef.value
  if (!wrap || !sentinelRef.value) return
  infiniteObserver?.disconnect()
  infiniteObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && hasMorePages.value && !isLoadingMore.value) {
      loadMoreInfinite()
    }
  }, { root: wrap, rootMargin: '0px 0px 200px 0px', threshold: 0 })
  infiniteObserver.observe(sentinelRef.value)
}

async function loadMoreInfinite() {
  isLoadingMore.value = true
  if (lazy.value) {
    infinitePage.value++
    const p = {
      page: infinitePage.value,
      pageSize: pageSize.value,
      sortField: sortField.value || '',
      sortOrder: sortOrder.value,
      search: globalFilterValue.value || '',
    }
    try {
      const res = await props.api.list(p)
      if (res?.stat) {
        const newRows = res.data.rows || []
        rows.value = [...rows.value, ...newRows]
        totalRecords.value = res.data.totalRecords || res.data.total || 0
      }
      hasMorePages.value = rows.value.length < totalRecords.value
    } catch { hasMorePages.value = false }
  } else {
    const total = filteredRows.value.length
    const shown = rows.value.length
    const next = Math.min(shown + pageSize.value, total)
    if (next > shown) rows.value = [...filteredRows.value.slice(0, next)]
    hasMorePages.value = rows.value.length < total
  }
  isLoadingMore.value = false
}

// ── Watchers ─────────────────────────────────────────
watch(() => props.data, (nd) => {
  if (nd?.rows !== undefined) loadData(nd)
})

// ── Lifecycle ────────────────────────────────────────
onMounted(async () => {
  applyConfig()
  // Ensure preferencias are loaded
  if (!prefStore.misValores || !Object.keys(prefStore.misValores).length) {
    await prefStore.fetchMisPreferencias()
  }
  await loadData()
  nextTick(() => setupInfiniteScroll())
})

onUnmounted(() => {
  document.removeEventListener('pointermove', onResizeMove)
  document.removeEventListener('pointerup', onResizeEnd)
  infiniteObserver?.disconnect()
  if (inlineSaveTimer) { clearTimeout(inlineSaveTimer); inlineSaveTimer = null }
  if (pendingInlineSave) { pendingInlineSave.api(pendingInlineSave.data); pendingInlineSave = null }
  if (saveTimer) clearTimeout(saveTimer)
  if (filterTimer) clearTimeout(filterTimer)
  if (gfTimer) clearTimeout(gfTimer)
  if (colsTimer) clearTimeout(colsTimer)
})

defineExpose({ loadData, applyConfig, refresh })
</script>

<style scoped>
.te-wrapper { display: grid; grid-template-rows: auto 1fr auto; height: 100%; font-size: 0.875rem; }

/* Toolbar */
.te-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: #fff; border: 1px solid #dee2e6; border-radius: 0.375rem 0.375rem 0 0; padding: 0.5rem 1rem; flex-wrap: wrap; }
.te-toolbar-start { display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap; }
.te-toolbar-end { display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; }

/* Scroll wrap */
.te-scroll-wrap { overflow: auto; border: 1px solid #dee2e6; border-top: 0; border-bottom: 0; background: #fff; position: relative; }
.te-scroll-wrap::-webkit-scrollbar { width: 8px; height: 8px; }
.te-scroll-wrap::-webkit-scrollbar-track { background: #f1f1f1; }
.te-scroll-wrap::-webkit-scrollbar-thumb { background: #c1c7cd; border-radius: 4px; }
.te-scroll-wrap::-webkit-scrollbar-thumb:hover { background: #a0a7ae; }

/* Table */
.te-table { width: 1px; min-width: 100%; border-collapse: collapse; table-layout: fixed; }
.te-col-filler { padding: 0; }
.te-striped .te-tr:nth-child(even) { background: #fafbfc; }
.te-tr { transition: background 0.12s ease; }
.te-tr:hover { background: #e8ecf4 !important; }
.te-tr.te-tr-highlight { background: #c7d9f5 !important; color: #1a202c; }
.te-tr.te-tr-selected td { background: #dce8f5; }

/* Header */
.te-header-row .te-th { position: sticky; top: 0; z-index: 2; background: #f0f2f5; font-weight: 600; font-size: 0.85rem; padding: 0 10px 0 0; color: #2c3e50; border-bottom: 2px solid #d0d5dd; white-space: nowrap; user-select: none; border-right: 1px solid #dce0e6; }
.te-header-row .te-th:last-child { border-right: none; }
.te-header-row.te-has-groups .te-th { top: 2.5rem; background: #e2e8f0; }
.te-header-group-row .te-th { position: sticky; top: 0; z-index: 3; background: #e2e8f0; font-weight: 700; font-size: 0.85rem; padding: 0 10px 0 0; color: #1e293b; text-align: center; white-space: nowrap; user-select: none; border-right: 1px solid #dce0e6; }
.te-th-content { padding: 0.55rem 0; padding-left: 0.75rem; overflow: hidden; text-overflow: ellipsis; min-height: 2.2rem; max-width: 100%; }
.te-th-grip { font-size: 1rem; color: #9ca3af; cursor: grab; padding: 0 0.15rem; }
.te-th-grip:active { cursor: grabbing; }
.te-th-label { overflow: hidden; text-overflow: ellipsis; cursor: pointer; white-space: nowrap; }
.te-th-label:hover { color: #1a56db; }
.te-th-group-label { font-weight: 700; }
.te-sort-icon-std { font-size: 0.7rem; color: #adb5bd; margin-left: 0.3rem; }
.te-th-label:hover .te-sort-icon-std { color: #3b82f6; }
.te-th[draggable='true'] { cursor: grab; }
.te-th:active { cursor: grabbing; }
.te-th-dragging { opacity: 0.35; background: #e5e7eb !important; }
.te-th-dragover-left { background: #eff6ff !important; box-shadow: inset 3px 0 0 0 #3b82f6; }
.te-th-dragover-right { background: #eff6ff !important; box-shadow: inset -3px 0 0 0 #3b82f6; }

/* Drop indicators */
.te-drop-indicator { position: absolute; top: 0; bottom: 0; width: 3px; z-index: 5; background: #3b82f6; pointer-events: none; }
.te-drop-indicator::after { content: ''; position: absolute; top: -4px; width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; left: -2.5px; }
.te-drop-left { left: -1.5px; }
.te-drop-right { right: -4px; }

/* Resize handle */
.te-resize-handle { position: absolute; right: 0; top: 0; bottom: 0; width: 10px; cursor: col-resize; z-index: 3; background: transparent; touch-action: none; }
.te-resize-handle::before { content: ''; position: absolute; right: 4px; top: 15%; bottom: 15%; width: 2px; background: #e2e8f0; border-radius: 1px; transition: background 0.12s; }
.te-resize-handle:hover::before, .te-resize-handle:active::before { background: #3b82f6; }
.te-resizing { user-select: none !important; }

/* Resizing body state */
body.te-resizing { user-select: none !important; }

/* Filter row */
.te-filter-row .te-td { padding: 0.2rem 10px 0.2rem 0.4rem; background: #f8f9fa; }
.te-filter-input { width: 100%; font-size: 0.8rem; padding: 0.2rem 0.4rem; border: 1px solid #dee2e6; border-radius: 3px; }
.te-filter-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }

/* Cells */
.te-td { position: relative; box-sizing: border-box; padding: 0.4rem 10px 0.4rem 0.75rem; font-size: 0.875rem; line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-bottom: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; }
.te-td:last-child { border-right: none; }
.te-th { position: relative; box-sizing: border-box; overflow: hidden; }
.te-td-sel, .te-th-sel { text-align: center; min-width: 2rem; }
.te-actions-wrap { display: flex; gap: 0.25rem; }

/* Empty state */
.te-empty { text-align: center; color: #999; padding: 2rem; }

/* Color badge */
.te-color-badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 4px; border: 1px solid rgba(0,0,0,0.15); font-weight: 600; font-size: 0.75rem; }

/* Paginator */
.te-paginator { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px; padding: 0.4rem 0.75rem; font-size: 0.85rem; flex-wrap: wrap; }
.te-page-info { color: #6c757d; font-size: 0.85rem; }
.te-page-controls { display: flex; align-items: center; gap: 0.15rem; }
.te-page-btn { background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.8rem; color: #495057; transition: background 0.12s; }
.te-page-btn:hover:not(:disabled) { background: #e9ecef; }
.te-page-btn:disabled { opacity: 0.4; cursor: default; }
.te-page-current { padding: 0 0.5rem; font-weight: 600; font-size: 0.85rem; }
.te-page-size { width: auto; min-width: 70px; }

/* Loading overlay */
.te-loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; z-index: 10; }

/* Sentinel / infinite scroll */
.te-sentinel { text-align: center; padding: 1rem; min-height: 3rem; }
.te-loading-spinner { display: inline-block; width: 1.5rem; height: 1.5rem; border: 2px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: te-spin 0.6s linear infinite; }
@keyframes te-spin { to { transform: rotate(360deg); } }

/* Inline editing */
.te-editing-input { width: 100%; border: 1px solid #3b82f6; border-radius: 4px; padding: 0.2rem 0.4rem; font-size: inherit; font-family: inherit; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.25); box-sizing: border-box; }
.te-cell-wrap { display: flex; align-items: center; justify-content: space-between; gap: 0.25rem; width: 100%; overflow: hidden; }
.te-cell-wrap > span { overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.te-inline-edit-btn { flex-shrink: 0; opacity: 0; width: 1.5rem; height: 1.5rem; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: 4px; background: #e8ecf4; color: #4b5563; cursor: pointer; transition: opacity 0.15s, background 0.15s; font-size: 0.7rem; padding: 0; line-height: 1; }
.te-td-inline-edit:hover .te-inline-edit-btn { opacity: 1; }
.te-inline-edit-btn:hover { background: #3b82f6; color: #fff; }
.te-td { position: relative; }
.te-th { position: relative; }
</style>
```

## 13E. Vista Usuarios — `src/views/UsuariosView.vue`

Vista que utiliza `TableEditor` con server-side (lazy) y modal propio para crear/editar usuarios. Se pasa `:api` con el método `list` para carga de datos, y botones personalizados en `config.buttons` para crear/editar/eliminar.

```javascript
<template>
  <div class="container py-4">
    <h1 class="mb-4">Usuarios</h1>
    <TableEditor
      ref="table"
      id="usuarios"
      :api="apiUsuarios"
      :config="tableConfig"
      @rowSelected="onRowSelected"
      @rowDoubleClick="onRowDblClick"
    />

    <!-- Modal -->
    <div class="modal fade" tabindex="-1" ref="modal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar Usuario' : 'Nuevo Usuario' }}</h5>
            <button type="button" class="btn-close" @click="cerrarModal"></button>
          </div>
          <form @submit.prevent="guardar">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Username</label>
                <input v-model="form.username" type="text" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">{{ editando ? 'Nueva contrasena (dejar vacio para mantener)' : 'Contrasena' }}</label>
                <input v-model="form.password" type="password" class="form-control" :required="!editando" />
              </div>
              <div class="mb-3">
                <label class="form-label">Roles</label>
                <div v-for="rol in rolesDisponibles" :key="rol.id" class="form-check">
                  <input type="checkbox" :value="rol.id" v-model="form.rolIds" class="form-check-input" :id="'rol-' + rol.id" />
                  <label class="form-check-label" :for="'rol-' + rol.id">{{ rol.nombre }}</label>
                </div>
              </div>
              <div v-if="errorModal" class="alert alert-danger py-2">{{ errorModal }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn btn-primary" :disabled="cargando">{{ cargando ? 'Guardando...' : 'Guardar' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'
import api from '../api/axios'
import TableEditor from '../components/TableEditor.vue'

export default {
  name: 'UsuariosView',
  components: { TableEditor },
  data() {
    return {
      rolesDisponibles: [],
      selectedRow: null,
      editando: null,
      form: { username: '', password: '', rolIds: [] },
      errorModal: '',
      cargando: false,
      modalInstance: null,
      apiUsuarios: {
        list: (params) => api.get('/admin/usuarios', { params }).then(r => r.data),
        create: (data) => api.post('/admin/usuarios', data).then(r => r.data),
        edit: (data) => api.put(`/admin/usuarios/${data.id}`, data).then(r => r.data),
        delete: (data) => api.delete(`/admin/usuarios/${data.id}`).then(r => r.data),
      },
    }
  },
  computed: {
    tableConfig() {
      return {
        lazy: true,
        selectionMode: 'single',
        elementName: { singular: 'Usuario', gender: 'M' },
        buttons: {
          toolbar: [
            { key: 'create', icon: 'bi bi-plus-lg', severity: 'btn-success', label: 'Nuevo',
              onClick: () => this.abrirModal() },
            { key: 'edit', icon: 'bi bi-pencil', severity: 'btn-warning', label: 'Editar',
              isDisabled: () => !this.selectedRow, onClick: () => this.abrirModal(this.selectedRow) },
            { key: 'delete', icon: 'bi bi-trash', severity: 'btn-danger', label: 'Eliminar',
              isDisabled: () => !this.selectedRow, onClick: () => this.eliminar(this.selectedRow) },
          ],
          rowActions: [
            { key: 'edit', icon: 'bi bi-pencil', severity: 'btn-warning', label: 'Editar',
              onClick: (r) => this.abrirModal(r) },
            { key: 'delete', icon: 'bi bi-trash', severity: 'btn-danger', label: 'Eliminar',
              onClick: (r) => this.eliminar(r) },
          ],
        },
      }
    },
  },
  methods: {
    onRowSelected(row) { this.selectedRow = row },
    onRowDblClick(row) {
      if (row) this.abrirModal(row)
    },
    async fetchRoles() {
      const { data: body } = await api.get('/admin/roles')
      if (body.status) this.rolesDisponibles = body.data
    },
    abrirModal(usuario) {
      this.errorModal = ''
      if (usuario) {
        this.editando = usuario
        this.form = {
          username: usuario.username,
          password: '',
          rolIds: usuario.roles?.map((r) => r.id) || [],
        }
      } else {
        this.editando = null
        this.form = { username: '', password: '', rolIds: [] }
      }
      this.modalInstance.show()
    },
    cerrarModal() { this.modalInstance.hide() },
    async guardar() {
      this.errorModal = ''
      this.cargando = true
      try {
        if (this.editando) {
          const payload = { username: this.form.username, rolIds: this.form.rolIds }
          if (this.form.password) payload.password = this.form.password
          await api.put(`/admin/usuarios/${this.editando.id}`, payload)
        } else {
          await api.post('/admin/usuarios', this.form)
        }
        this.modalInstance.hide()
        this.$refs.table.refresh()
      } catch (err) {
        this.errorModal = err.response?.data?.error || 'Error al guardar'
      } finally { this.cargando = false }
    },
    async eliminar(usuario) {
      if (!usuario || !confirm(`Eliminar usuario "${usuario.username}"?`)) return
      try {
        await api.delete(`/admin/usuarios/${usuario.id}`)
        this.$refs.table.refresh()
      } catch (err) {
        alert(err.response?.data?.error || 'Error al eliminar')
      }
    },
  },
  mounted() {
    this.modalInstance = new Modal(this.$refs.modal)
    this.fetchRoles()
  },
}
</script>
```

## 13F. Vista Roles — `src/views/RolesView.vue`

```javascript
<template>
  <div class="container py-4">
    <h1 class="mb-4">Roles</h1>
    <TableEditor
      ref="table"
      id="roles"
      :api="apiRoles"
      :config="tableConfig"
      @rowSelected="onRowSelected"
      @rowDoubleClick="onRowDblClick"
    />

    <!-- Modal -->
    <div class="modal fade" tabindex="-1" ref="modal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar Rol' : 'Nuevo Rol' }}</h5>
            <button type="button" class="btn-close" @click="cerrarModal"></button>
          </div>
          <form @submit.prevent="guardar">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Nombre</label>
                <input v-model="form.nombre" type="text" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Descripcion</label>
                <input v-model="form.descripcion" type="text" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Permisos</label>
                <div v-for="perm in permisosDisponibles" :key="perm.id" class="form-check">
                  <input type="checkbox" :value="perm.id" v-model="form.permisoIds" class="form-check-input" :id="'perm-' + perm.id" />
                  <label class="form-check-label" :for="'perm-' + perm.id">{{ perm.nombre }}</label>
                </div>
              </div>
              <div v-if="errorModal" class="alert alert-danger py-2">{{ errorModal }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn btn-primary" :disabled="cargando">{{ cargando ? 'Guardando...' : 'Guardar' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'
import api from '../api/axios'
import TableEditor from '../components/TableEditor.vue'

export default {
  name: 'RolesView',
  components: { TableEditor },
  data() {
    return {
      permisosDisponibles: [],
      selectedRow: null,
      editando: null,
      form: { nombre: '', descripcion: '', permisoIds: [] },
      errorModal: '',
      cargando: false,
      modalInstance: null,
      apiRoles: {
        list: (params) => api.get('/admin/roles', { params }).then(r => r.data),
        create: (data) => api.post('/admin/roles', data).then(r => r.data),
        edit: (data) => api.put(`/admin/roles/${data.id}`, data).then(r => r.data),
        delete: (data) => api.delete(`/admin/roles/${data.id}`).then(r => r.data),
      },
    }
  },
  computed: {
    tableConfig() {
      return {
        lazy: true,
        selectionMode: 'single',
        elementName: { singular: 'Rol', gender: 'M' },
        buttons: {
          toolbar: [
            { key: 'create', icon: 'bi bi-plus-lg', severity: 'btn-success', label: 'Nuevo',
              onClick: () => this.abrirModal() },
            { key: 'edit', icon: 'bi bi-pencil', severity: 'btn-warning', label: 'Editar',
              isDisabled: () => !this.selectedRow, onClick: () => this.abrirModal(this.selectedRow) },
            { key: 'delete', icon: 'bi bi-trash', severity: 'btn-danger', label: 'Eliminar',
              isDisabled: () => !this.selectedRow, onClick: () => this.eliminar(this.selectedRow) },
          ],
          rowActions: [
            { key: 'edit', icon: 'bi bi-pencil', severity: 'btn-warning', label: 'Editar',
              onClick: (r) => this.abrirModal(r) },
            { key: 'delete', icon: 'bi bi-trash', severity: 'btn-danger', label: 'Eliminar',
              onClick: (r) => this.eliminar(r) },
          ],
        },
      }
    },
  },
  methods: {
    onRowSelected(row) { this.selectedRow = row },
    onRowDblClick(row) {
      if (row) this.abrirModal(row)
    },
    async fetchPermisos() {
      const { data: body } = await api.get('/admin/permisos')
      if (body.status) this.permisosDisponibles = body.data
    },
    abrirModal(rol) {
      this.errorModal = ''
      if (rol) {
        this.editando = rol
        this.form = {
          nombre: rol.nombre,
          descripcion: rol.descripcion || '',
          permisoIds: rol.permisos?.map((p) => p.id) || [],
        }
      } else {
        this.editando = null
        this.form = { nombre: '', descripcion: '', permisoIds: [] }
      }
      this.modalInstance.show()
    },
    cerrarModal() { this.modalInstance.hide() },
    async guardar() {
      this.errorModal = ''
      this.cargando = true
      try {
        const payload = { nombre: this.form.nombre, descripcion: this.form.descripcion, permisoIds: this.form.permisoIds }
        if (this.editando) {
          await api.put(`/admin/roles/${this.editando.id}`, payload)
        } else {
          await api.post('/admin/roles', payload)
        }
        this.modalInstance.hide()
        this.$refs.table.refresh()
      } catch (err) {
        this.errorModal = err.response?.data?.error || 'Error al guardar'
      } finally { this.cargando = false }
    },
    async eliminar(rol) {
      if (!rol || !confirm(`Eliminar rol "${rol.nombre}"?`)) return
      try {
        await api.delete(`/admin/roles/${rol.id}`)
        this.$refs.table.refresh()
      } catch (err) { alert(err.response?.data?.error || 'Error al eliminar') }
    },
  },
  mounted() {
    this.modalInstance = new Modal(this.$refs.modal)
    this.fetchPermisos()
  },
}
</script>
```


## 13G. Vista Admin Preferencias — `src/views/AdminPreferenciasView.vue`

Vista de administracion del catalogo de preferencias permitidas. Usa `TableEditor` para CRUD completo.

```javascript
<template>
  <div class="container py-4">
    <h1 class="mb-4">Administrar Preferencias</h1>
    <TableEditor ref="table" :columns="columnDefs" :data="definiciones" :config="tableConfig" selectable
      :actions="rowActions" :serverSide="true" :totalRecords="totalRecords" :loading="loading"
      @rowSelected="onRowSelected" @update:serverParams="onServerParams" />

    <div class="modal fade" tabindex="-1" ref="modal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar Preferencia' : 'Nueva Preferencia' }}</h5>
            <button type="button" class="btn-close" @click="cerrarModal"></button>
          </div>
          <form @submit.prevent="guardar">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Clave</label>
                <input v-model="form.clave" type="text" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Nombre</label>
                <input v-model="form.nombre" type="text" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Descripcion</label>
                <input v-model="form.descripcion" type="text" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Tipo</label>
                <select v-model="form.tipo" class="form-select" required>
                  <option value="string">String</option>
                  <option value="boolean">Boolean</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div class="mb-3" v-if="form.tipo === 'select'">
                <label class="form-label">Opciones (separadas por coma)</label>
                <input v-model="opcionesStr" type="text" class="form-control" placeholder="opcion1,opcion2,opcion3" />
              </div>
              <div class="mb-3">
                <label class="form-label">Valor por defecto</label>
                <input v-model="form.valor_defecto" type="text" class="form-control" />
              </div>
              <div v-if="errorModal" class="alert alert-danger py-2">{{ errorModal }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn btn-primary" :disabled="cargando">{{ cargando ? 'Guardando...' : 'Guardar' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'
import api from '../api/axios'
import TableEditor from '../components/TableEditor.vue'
import { usePreferenciasStore } from '../stores/preferencias'

export default {
  name: 'AdminPreferenciasView',
  components: { TableEditor },
  data() {
    return {
      store: usePreferenciasStore(),
      definiciones: [],
      totalRecords: 0,
      loading: false,
      selectedRow: null,
      editando: null,
      form: { clave: '', nombre: '', descripcion: '', tipo: 'string', valor_defecto: '' },
      opcionesStr: '',
      errorModal: '',
      cargando: false,
      modalInstance: null,
      serverParams: { page: 1, pageSize: 25, sortField: null, sortDir: 'asc', search: '' },
    }
  },
  computed: {
    columnDefs() {
      return [
        { field: 'id', headerName: 'ID', width: '70px', sortable: false },
        { field: 'clave', headerName: 'Clave' },
        { field: 'nombre', headerName: 'Nombre' },
        { field: 'tipo', headerName: 'Tipo', width: '100px' },
        { field: 'valor_defecto', headerName: 'Valor defecto' },
      ]
    },
    tableConfig() {
      return {
        toolbar: [
          { key: 'refresh', label: '', icon: 'bi bi-arrow-clockwise', severity: 'btn-outline-info', action: () => this.fetchData() },
          { key: 'crear', label: 'Nuevo', icon: 'bi bi-plus-lg', severity: 'btn-success', action: () => this.abrirModal() },
          { key: 'editar', label: 'Editar', icon: 'bi bi-pencil', severity: 'btn-primary', disabled: () => !this.selectedRow, action: () => this.abrirModal(this.selectedRow) },
          { key: 'eliminar', label: 'Eliminar', icon: 'bi bi-trash', severity: 'btn-danger', disabled: () => !this.selectedRow, action: () => this.eliminar(this.selectedRow) },
        ],
      }
    },
    rowActions() {
      return [
        { key: 'edit', label: 'Editar', severity: 'btn-warning', icon: 'bi bi-pencil', action: (r) => this.abrirModal(r) },
        { key: 'delete', label: 'Eliminar', severity: 'btn-danger', icon: 'bi bi-trash', action: (r) => this.eliminar(r) },
      ]
    },
  },
  methods: {
    onRowSelected(rows) {
      this.selectedRow = Array.isArray(rows) ? rows[0] : rows
    },
    onServerParams(params) {
      this.serverParams = { ...params }
      this.fetchData()
    },
    async fetchData() {
      this.loading = true
      try {
        const query = new URLSearchParams({
          page: this.serverParams.page,
          pageSize: this.serverParams.pageSize,
          sortField: this.serverParams.sortField || '',
          sortDir: this.serverParams.sortDir,
          search: this.serverParams.search,
        }).toString()
        const { data: body } = await api.get(`/preferencias?${query}`)
        if (body.status) {
          this.definiciones = body.data.rows
          this.totalRecords = body.data.total
        }
      } catch (err) {
        console.error('Error al cargar definiciones:', err)
      } finally {
        this.loading = false
      }
    },
    abrirModal(def) {
      this.errorModal = ''
      if (def) {
        this.editando = def
        this.form = {
          clave: def.clave,
          nombre: def.nombre,
          descripcion: def.descripcion || '',
          tipo: def.tipo,
          valor_defecto: def.valor_defecto || '',
        }
        if (def.tipo === 'select' && def.opciones) {
          try { this.opcionesStr = JSON.parse(def.opciones).join(',') } catch { this.opcionesStr = '' }
        } else {
          this.opcionesStr = ''
        }
      } else {
        this.editando = null
        this.form = { clave: '', nombre: '', descripcion: '', tipo: 'string', valor_defecto: '' }
        this.opcionesStr = ''
      }
      this.modalInstance.show()
    },
    cerrarModal() {
      this.modalInstance.hide()
    },
    async guardar() {
      this.errorModal = ''
      this.cargando = true
      try {
        const payload = { ...this.form }
        if (payload.tipo === 'select' && this.opcionesStr) {
          payload.opciones = this.opcionesStr.split(',').map(s => s.trim()).filter(Boolean)
        }
        if (this.editando) {
          await this.store.actualizarDefinicion(this.editando.id, payload)
        } else {
          await this.store.crearDefinicion(payload)
        }
        this.modalInstance.hide()
        await this.fetchData()
        this.$refs.table.clearSelection()
      } catch (err) {
        this.errorModal = err.response?.data?.error || 'Error al guardar'
      } finally {
        this.cargando = false
      }
    },
    async eliminar(def) {
      if (!def || !confirm(`Eliminar preferencia "${def.clave}"?`)) return
      try {
        await this.store.eliminarDefinicion(def.id)
        await this.fetchData()
        this.$refs.table.clearSelection()
      } catch (err) {
        alert(err.response?.data?.error || 'Error al eliminar')
      }
    },
  },
  mounted() {
    this.modalInstance = new Modal(this.$refs.modal)
    this.fetchData()
  },
}
</script>
```

## 13H. Store de modals anidados — `src/stores/modal.js`

Store Pinia que maneja una pila de modals (`stack`). Cada modal guarda:
- `component` — componente a renderizar en el cuerpo (marcado con `markRaw`)
- `props` — parámetros a pasarle al componente
- `title` — título del header
- `size` — clase Bootstrap opcional (`sm`, `lg`, `xl`)
- `closable` — si muestra el botón de cerrar
- `position` — coordenadas `{x, y}` para arrastrar
- `zIndex` — calculado automáticamente para superposición

```javascript
import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import AlertDialog from '../components/AlertDialog.vue'

export const useModalStore = defineStore('modal', {
  state: () => ({
    stack: [],
    zIndexBase: 1050,
  }),
  getters: {
    topModal(state) {
      return state.stack.length > 0 ? state.stack[state.stack.length - 1] : null
    },
    hasModals(state) {
      return state.stack.length > 0
    },
    modalCount(state) {
      return state.stack.length
    },
  },
  actions: {
    open({ component, props = {}, title = '', size = '', closable = true }) {
      const id = Date.now() + Math.random()
      this.stack.push({
        id,
        component: markRaw(component),
        props,
        title,
        size,
        closable,
        zIndex: this.zIndexBase + this.stack.length * 10,
        position: { x: 20 + this.stack.length * 20, y: 20 + this.stack.length * 20 },
      })
      return id
    },
    close(id) {
      if (id) {
        const idx = this.stack.findIndex(m => m.id === id)
        if (idx >= 0) this.stack.splice(idx, 1)
      } else {
        this.stack.pop()
      }
    },
    closeAll() {
      this.stack = []
    },
    confirm({ text, confirmColor = 'btn-primary', confirmText = 'Confirmar', title = 'Confirmar' } = {}) {
      return new Promise((resolve) => {
        this.open({ component: ConfirmDialog, props: { text, confirmColor, confirmText, resolve }, title, size: 'sm', closable: false })
      })
    },
    alert({ message, severity = 'info', title = 'Atención' } = {}) {
      return new Promise((resolve) => {
        this.open({ component: AlertDialog, props: { message, severity, resolve }, title, size: 'sm', closable: false })
      })
    },
    updatePosition(id, x, y) {
      const modal = this.stack.find(m => m.id === id)
      if (modal) {
        modal.position.x = x
        modal.position.y = y
      }
    },
  },
})
```

## 13I. Componente Modal arrastrable — `src/components/ModalDialog.vue`

Renderiza la pila completa del store `useModalStore`. Cada modal:
- Se posiciona con `position: fixed` y coordenadas del store
- El header funciona como asa de arrastre (`@mousedown` + `mousemove`)
- Al hacer clic en un modal detrás del tope, lo trae al frente (`bringToFront`)
- Renderiza el componente dinámico con `<component :is="..." v-bind="..." />`
- Usa clases Bootstrap (`modal-header`, `modal-body`, `modal-content`, `shadow`)

```javascript
<template>
  <div v-for="(modal, index) in modalStore.stack" :key="modal.id"
    class="modal-dialog-overlay"
    :style="{ zIndex: modal.zIndex }"
    @mousedown="bringToFront(modal.id)">

    <div v-if="index === modalStore.stack.length - 1" class="modal-backdrop fade show"></div>

    <div class="modal-dialog modal-dialog-custom"
      :class="[modal.size ? 'modal-' + modal.size : '', 'show', 'd-block']"
      :style="{
        position: 'fixed',
        left: modal.position.x + 'px',
        top: modal.position.y + 'px',
        margin: 0,
        zIndex: modal.zIndex + 1,
      }">
      <div class="modal-content shadow">
        <div class="modal-header modal-header-drag"
          @mousedown.prevent="startDrag($event, modal)">
          <h5 class="modal-title">{{ modal.title }}</h5>
          <button v-if="modal.closable" type="button" class="btn-close" @click="modalStore.close(modal.id)"></button>
        </div>
        <div class="modal-body">
          <component :is="modal.component" v-bind="modal.props" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useModalStore } from '../stores/modal'

export default {
  name: 'ModalDialog',
  setup() {
    return { modalStore: useModalStore() }
  },
  data() {
    return {
      dragging: null,
      dragOffset: { x: 0, y: 0 },
    }
  },
  methods: {
    startDrag(event, modal) {
      this.dragging = modal.id
      this.dragOffset.x = event.clientX - modal.position.x
      this.dragOffset.y = event.clientY - modal.position.y
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.stopDrag)
    },
    onDrag(event) {
      if (!this.dragging) return
      const modal = this.modalStore.stack.find(m => m.id === this.dragging)
      if (modal) {
        const x = event.clientX - this.dragOffset.x
        const y = event.clientY - this.dragOffset.y
        this.modalStore.updatePosition(this.dragging, Math.max(0, x), Math.max(0, y))
      }
    },
    stopDrag() {
      this.dragging = null
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.stopDrag)
    },
    bringToFront(id) {
      const idx = this.modalStore.stack.findIndex(m => m.id === id)
      if (idx >= 0 && idx < this.modalStore.stack.length - 1) {
        const modal = this.modalStore.stack.splice(idx, 1)[0]
        modal.zIndex = this.modalStore.zIndexBase + this.modalStore.stack.length * 10
        modal.position.x = 20 + this.modalStore.stack.length * 20
        modal.position.y = 20 + this.modalStore.stack.length * 20
        this.modalStore.stack.push(modal)
      }
    },
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.onDrag)
    document.removeEventListener('mouseup', this.stopDrag)
  },
}
</script>

<style scoped>
.modal-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}
.modal-dialog-overlay > * {
  pointer-events: auto;
}
.modal-dialog-custom {
  min-width: 320px;
  max-width: 80vw;
  transition: none;
}
.modal-header-drag {
  cursor: move;
  user-select: none;
}
.modal-backdrop {
  pointer-events: auto;
}
</style>
```

## 13J. Confirmación genérica — `src/components/ConfirmDialog.vue`

Componente de confirmación reutilizable que usa el store `useModalStore`. Se invoca mediante `modalStore.confirm()` que retorna una Promise que resuelve a `true` o `false`.

```javascript
<template>
  <div>
    <p class="mb-3">{{ text }}</p>
    <div class="d-flex justify-content-end gap-2">
      <button class="btn btn-secondary" @click="cancel">Cancelar</button>
      <button :class="['btn', confirmColor]" @click="confirm">{{ confirmText }}</button>
    </div>
  </div>
</template>

<script>
import { useModalStore } from '../stores/modal'

export default {
  name: 'ConfirmDialog',
  props: {
    text: { type: String, required: true },
    confirmColor: { type: String, default: 'btn-primary' },
    confirmText: { type: String, default: 'Confirmar' },
    resolve: { type: Function, required: true },
  },
  data() {
    return { modalId: null }
  },
  mounted() {
    this.modalId = useModalStore().topModal?.id
  },
  methods: {
    confirm() {
      this.resolve(true)
      useModalStore().close(this.modalId)
    },
    cancel() {
      this.resolve(false)
      useModalStore().close(this.modalId)
    },
  },
}
</script>
```

## 13K. Alerta genérica — `src/components/AlertDialog.vue`

Componente de alerta reutilizable que usa el store `useModalStore`. Se invoca mediante `modalStore.alert()` que retorna una Promise.

```javascript
<template>
  <div>
    <div class="d-flex align-items-center mb-3">
      <i :class="iconClass" class="fs-4 me-2"></i>
      <span>{{ message }}</span>
    </div>
    <div class="d-flex justify-content-end">
      <button class="btn btn-primary" @click="close">Aceptar</button>
    </div>
  </div>
</template>

<script>
import { useModalStore } from '../stores/modal'

export default {
  name: 'AlertDialog',
  props: {
    message: { type: String, required: true },
    severity: { type: String, default: 'info' },
    resolve: { type: Function, default: () => {} },
  },
  data() {
    return { modalId: null }
  },
  computed: {
    iconClass() {
      const map = {
        error: 'bi bi-exclamation-triangle text-danger',
        atencion: 'bi bi-exclamation-circle text-warning',
        info: 'bi bi-info-circle text-primary',
      }
      return map[this.severity] || map.info
    },
  },
  mounted() {
    this.modalId = useModalStore().topModal?.id
  },
  methods: {
    close() {
      this.resolve()
      useModalStore().close(this.modalId)
    },
  },
}
</script>
```

## 14. Archivo `.env` y `.env.example`

```
VITE_API_URL=http://localhost:4000
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
│   │   ├── ModalDialog.vue
│   │   └── TableEditor.vue
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   ├── auth.js
│   │   ├── ejemplo.js
│   │   ├── modal.js
│   │   ├── preferencias.js
│   │   └── pwa.js                     (si PWA habilitado)
│   └── views/
│       ├── AdminPreferenciasView.vue
│       ├── DashboardView.vue
│       ├── LoginView.vue
│       ├── NotFoundView.vue
│       ├── PreferenciasView.vue
│       ├── ProfileView.vue
│       ├── RolesView.vue
│       └── UsuariosView.vue
└── node_modules/
```

## 18. Verificación obligatoria

Ejecutar los siguientes comandos en orden y **confirmar que cada uno devuelva el resultado esperado**. Si algún comando falla, abortar y notificar el error.

| # | Comando | Resultado esperado |
|---|---------|-------------------|
| 1 | `npm run dev` (dejar correr 3s, luego Ctrl+C) | Vite imprime `http://localhost:5173` sin errores de compilación |
| 2 | `npm run build` | `✓ built in Xs` sin errores. Se genera `dist/` con `index.html` y assets |
| 3 | Verificar `AGENTS.md` en raíz del proyecto | Existe con la sección `## Convenciones` que incluye las reglas de componentes UI obligatorios y el patrón de colores para botones |
| 4 | Verificar `.env` | Contiene `VITE_API_URL=<url>` |
| 5 | Verificar `.gitignore` | Contiene `node_modules/`, `.env`, `dist/` |
| 6 | Verificar estructura de directorios | Existen: `src/views/`, `src/components/layout/`, `src/stores/`, `src/api/`, `src/router/` |
| 7 | Verificar vistas de preferencias | Existen: `src/views/PreferenciasView.vue`, `src/views/AdminPreferenciasView.vue`, `src/stores/preferencias.js` |
| 8 | Leer `DOCUMENTACION.md` | Existe con todas las secciones completas (rutas, estructura, dependencias) |

**Validación cruzada con backend (si el backend ya está operativo):**

```bash
# Iniciar frontend
npm run dev &
FRONTEND_PID=$!

# Iniciar backend (desde el directorio del backend)
cd ../<backend-directorio> && node src/index.js &
BACKEND_PID=$!

sleep 2

# Verificar que frontend y backend responden
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173
# → 200

curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health
# → 200

# Detener procesos
kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
```

> Nota: La verificación del paso 1 confirma que el proyecto compila y el servidor de desarrollo arranca. La validación cruzada con backend (pasos adicionales) es opcional pero recomendada si el backend ya existe.

## 19. Documentación básica — `DOCUMENTACION.md`

Generar o actualizar el archivo `DOCUMENTACION.md` en la raíz del proyecto con la siguiente estructura. Este documento debe ser legible por humanos y fácilmente parseable por IA, usando secciones claras, metadatos estructurados y tablas consistentes.

```markdown
---
title: <nombre-proyecto>
type: frontend
framework: Vue 3 + Vite + Bootstrap + Pinia
language: JavaScript (Options API)
created: <fecha-actual>
---

# <nombre-proyecto>

Frontend Vue 3 con Vite, Bootstrap, Pinia y Axios.

---

## REQUISITOS

- Node.js >= 18
- npm >= 9

## CONFIGURACION

| Paso | Accion |
|------|--------|
| 1 | `git clone <repo>` |
| 2 | `npm install` |
| 3 | Copiar `.env.example` a `.env` y completar variables |
| 4 | `npm run dev` |

## VARIABLES DE ENTORNO

| Variable | Descripcion | Valor ejemplo |
|----------|-------------|---------------|
| `VITE_API_URL` | URL base de la API | `http://localhost:4000` |

Ver archivo `.env.example` para referencia.

## SCRIPTS

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Compila para produccion |
| `npm run preview` | Previsualiza build de produccion |

## PWA (si habilitado)

La aplicacion es instalable como PWA en dispositivos moviles y desktop (Chrome, Edge, etc.). Para instalar:

1. Abrir la app en el navegador.
2. Hacer clic en **Instalar App** en el menu lateral.
3. Seguir las instrucciones del dialogo de instalacion del navegador.

> El service worker se actualiza automaticamente (`autoUpdate`). Los iconos PWA estan en `public/`.

## RUTAS

| Ruta | Vista | Descripcion | Requiere Auth |
|------|-------|-------------|-------------|
| `/login` | `LoginView` | Inicio de sesion | No |
| `/` | `DashboardView` | Panel principal | Si |
| `/perfil` | `ProfileView` | Configuracion de perfil (username / password) | Si |
| `/preferencias` | `PreferenciasView` | Configuracion de preferencias personales | Si |
| `/admin/usuarios` | `UsuariosView` | Gestion de usuarios (solo ADMIN) | Si |
| `/admin/roles` | `RolesView` | Gestion de roles y permisos (solo ADMIN) | Si |
| `/admin/preferencias` | `AdminPreferenciasView` | Gestion de definiciones de preferencias (solo ADMIN) | Si |
| `/:pathMatch(.*)*` | `NotFoundView` | Pagina 404 | No |

## ESTRUCTURA

```
<proyecto>/
├── .env
├── .env.example
├── .gitignore
├── DOCUMENTACION.md
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
│   │   ├── ModalDialog.vue
│   │   └── TableEditor.vue
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   ├── auth.js
│   │   ├── ejemplo.js
│   │   ├── modal.js
│   │   ├── preferencias.js
│   │   └── pwa.js                     (si PWA habilitado)
│   └── views/
│       ├── AdminPreferenciasView.vue
│       ├── DashboardView.vue
│       ├── LoginView.vue
│       ├── NotFoundView.vue
│       ├── PreferenciasView.vue
│       ├── ProfileView.vue
│       ├── RolesView.vue
│       └── UsuariosView.vue
└── node_modules/
```

## DEPENDENCIAS

| Paquete | Version | Uso |
|---------|---------|-----|
| vue | ^3 | Framework frontend |
| vite | ^5 | Bundler / dev server |
| bootstrap | ^5 | UI components / estilos |
| bootstrap-icons | ^1 | Iconos para la interfaz |
| @popperjs/core | ^2 | Tooltips / popovers de Bootstrap |
| pinia | ^2 | Estado global |
| vue-router | ^4 | Enrutamiento SPA |
| axios | ^1 | HTTP client |
| vite-plugin-pwa | - (dev) | Service worker y manifest PWA (si habilitado) |
```

Reglas para la documentación:
- El archivo `DOCUMENTACION.md` debe crearse **siempre** al generar el proyecto desde cero.
- Al agregar nuevas rutas/vistas, **insertar** las nuevas rutas en la tabla `### RUTAS` manteniendo el formato uniforme.
- Mantener la sección `ESTRUCTURA` sincronizada con los directorios reales del proyecto.
- No eliminar secciones ni contenido agregado manualmente por el usuario.
- No usar acentos ni caracteres especiales en los titulos de seccion para facilitar el parseo automatico.

## Reglas obligatorias

- **Sin TypeScript:** todo en JavaScript plano, usando Options API (no Composition API ni `<script setup>`).
- **Sin Composition API:** usar exclusivamente `data()`, `methods`, `computed`, `watch`, `props`, `emits`.
- **Bootstrap importado globalmente** en `main.js` (CSS + JS).
- **Pinia como store global** — cada feature con su propio store en `src/stores/`.
- **Axios como única capa HTTP** — todas las peticiones al backend pasan por `src/api/axios.js`.
- **Topbar fija + Sidebar lateral** con toggle en móvil (hamburguesa) y siempre visible en desktop.
- **Variables de entorno** con prefijo `VITE_` según convención de Vite.
- **Separar responsabilidades:** vistas en `views/`, componentes en `components/`, stores en `stores/`, router en `router/`, API en `api/`.
