---
name: init-frontend-vuejs
description: Inicializar un frontend Vue.js 3 con Vite, Bootstrap, Pinia, Axios y layout responsive
---

# Skill: Inicializar frontend Vue.js con Vite, Bootstrap y Pinia

Usar cuando el usuario pida **crear un frontend desde cero** con Vue.js 3, Vite, Bootstrap, Pinia, Axios, barra superior y menú lateral (hamburguesa en móvil). **Prohibido usar TypeScript** — todo el código debe ser JavaScript con Options API.

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
npm install bootstrap @popperjs/core pinia axios vue-router
```

## 3. Configurar Bootstrap global — `src/main.js`

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

## 4. Router con vista por defecto — `src/router/index.js`

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import ProfileView from '../views/ProfileView.vue'

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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiereAuth !== false && !auth.token) {
    next({ name: 'login' })
  } else if (to.name === 'login' && auth.token) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
```

## 5. Layout principal — `src/App.vue`

```javascript
<template>
  <div id="app">
    <template v-if="logueado">
      <Topbar @toggle-sidebar="toggleSidebar" />
      <div class="d-flex">
        <Sidebar :visible="sidebarVisible" @close="sidebarVisible = false" />
        <main class="flex-grow-1 p-3" :class="{ 'ms-0': !sidebarVisible, 'ms-250': sidebarVisible }">
          <router-view />
        </main>
      </div>
    </template>
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script>
import Topbar from './components/layout/Topbar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import { useAuthStore } from './stores/auth'

export default {
  name: 'App',
  components: { Topbar, Sidebar },
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
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
}
</script>

<style>
html, body, #app { height: 100%; margin: 0; }
.ms-250 { margin-left: 250px; }
.flex-grow-1 { flex-grow: 1; }
</style>
```

## 6. Topbar — `src/components/layout/Topbar.vue`

```javascript
<template>
  <nav class="navbar navbar-dark bg-dark fixed-top d-flex align-items-center px-3" style="height: 56px; z-index: 1030;">
    <button class="navbar-toggler border-0" type="button" @click="$emit('toggle-sidebar')" aria-label="Toggle sidebar">
      <span class="navbar-toggler-icon"></span>
    </button>
    <span class="navbar-brand mb-0 ms-2 h5">Mi App</span>
    <div class="ms-auto d-flex align-items-center gap-2">
      <span class="text-light small">{{ auth.usuario?.username }}</span>
      <button class="btn btn-outline-light btn-sm" @click="logout">Salir</button>
    </div>
  </nav>
</template>

<script>
import { useAuthStore } from '../../stores/auth'

export default {
  name: 'Topbar',
  emits: ['toggle-sidebar'],
  data() {
    return { auth: useAuthStore() }
  },
  methods: {
    logout() {
      this.auth.logout()
      this.$router.push({ name: 'login' })
    },
  },
}
</script>
```

## 7. Sidebar — `src/components/layout/Sidebar.vue`

```javascript
<template>
  <div>
    <div v-if="visible && isMobile" class="sidebar-overlay" @click="$emit('close')"></div>

    <div class="sidebar bg-dark text-white p-3" :class="{ open: visible }">
      <h5 class="text-center mb-4">Menú</h5>
      <ul class="nav flex-column">
        <li class="nav-item">
          <router-link to="/" class="nav-link text-white" @click="closeOnMobile">
            Dashboard
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/perfil" class="nav-link text-white" @click="closeOnMobile">
            Mi Perfil
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Sidebar',
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['close'],
  computed: {
    isMobile() {
      return window.innerWidth < 768
    },
  },
  methods: {
    closeOnMobile() {
      if (this.isMobile) {
        this.$emit('close')
      }
    },
  },
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 56px;
  left: 0;
  width: 250px;
  height: calc(100% - 56px);
  overflow-y: auto;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 1020;
}
.sidebar.open {
  transform: translateX(0);
}
.sidebar-overlay {
  position: fixed;
  top: 56px;
  left: 0;
  width: 100%;
  height: calc(100% - 56px);
  background: rgba(0,0,0,0.5);
  z-index: 1019;
}
@media (min-width: 768px) {
  .sidebar {
    transform: translateX(0);
  }
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
  actions: {
    async login(username, password) {
      const { data } = await api.post('/auth/login', { username, password })
      this.token = data.token
      this.usuario = data.usuario
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
    },
    logout() {
      this.token = null
      this.usuario = null
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
    },
    async fetchPerfil() {
      const { data } = await api.get('/auth/perfil')
      this.usuario = { id: data.id, username: data.username }
      localStorage.setItem('usuario', JSON.stringify(this.usuario))
    },
    async actualizarPerfil(datos) {
      await api.put('/auth/perfil', datos)
      if (datos.username) {
        this.usuario.username = datos.username
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

## 10. Instancia de Axios — `src/api/axios.js`

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
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
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'

export default {
  name: 'DashboardView',
  data() {
    return { auth: useAuthStore() }
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
      },
      mensaje: '',
      mensajeTipo: '',
      cargando: false,
    }
  },
  methods: {
    async guardar() {
      this.mensaje = ''
      this.cargando = true
      try {
        await this.auth.actualizarPerfil({
          username: this.form.username,
          passwordActual: this.form.passwordActual || undefined,
          passwordNuevo: this.form.passwordNuevo || undefined,
        })
        this.form.passwordActual = ''
        this.form.passwordNuevo = ''
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

## 14. Archivo `.env` y `.env.example`

```
VITE_API_URL=http://localhost:3000
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
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── api/
│   │   └── axios.js
│   ├── components/
│   │   └── layout/
│   │       ├── Topbar.vue
│   │       └── Sidebar.vue
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   ├── auth.js
│   │   └── ejemplo.js
│   └── views/
│       ├── LoginView.vue
│       ├── DashboardView.vue
│       └── ProfileView.vue
└── node_modules/
```

## 18. Documentación básica — `DOCUMENTACION.md`

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
| `VITE_API_URL` | URL base de la API | `http://localhost:3000` |

Ver archivo `.env.example` para referencia.

## SCRIPTS

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Compila para produccion |
| `npm run preview` | Previsualiza build de produccion |

## RUTAS

| Ruta | Vista | Descripcion | Requiere Auth |
|------|-------|-------------|-------------|
| `/login` | `LoginView` | Inicio de sesion | No |
| `/` | `DashboardView` | Panel principal | Si |
| `/perfil` | `ProfileView` | Configuracion de perfil (username / password) | Si |

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
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── api/
│   │   └── axios.js
│   ├── components/
│   │   └── layout/
│   │       ├── Topbar.vue
│   │       └── Sidebar.vue
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   ├── auth.js
│   │   └── ejemplo.js
│   └── views/
│       ├── LoginView.vue
│       ├── DashboardView.vue
│       └── ProfileView.vue
└── node_modules/
```

## DEPENDENCIAS

| Paquete | Version | Uso |
|---------|---------|-----|
| vue | ^3 | Framework frontend |
| vite | ^5 | Bundler / dev server |
| bootstrap | ^5 | UI components / estilos |
| @popperjs/core | ^2 | Tooltips / popovers de Bootstrap |
| pinia | ^2 | Estado global |
| vue-router | ^4 | Enrutamiento SPA |
| axios | ^1 | HTTP client |
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
