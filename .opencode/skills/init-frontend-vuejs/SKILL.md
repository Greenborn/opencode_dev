---
name: init-frontend-vuejs
description: Inicializar un frontend Vue.js 3 con Vite, Bootstrap, Pinia, Axios y layout responsive
---

# Skill: Inicializar frontend Vue.js con Vite, Bootstrap y Pinia

Usar cuando el usuario pida **crear un frontend desde cero** con Vue.js 3, Vite, Bootstrap, Pinia, Axios, barra superior y menú lateral (hamburguesa en móvil). **Prohibido usar TypeScript** — todo el código debe ser JavaScript con Options API.

---

## 1. Crear el proyecto con Vite

```bash
npm create vite@latest <nombre-proyecto> -- --template vue
cd <nombre-proyecto>
npm install
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
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

## 5. Layout principal — `src/App.vue`

```javascript
<template>
  <div id="app">
    <Topbar @toggle-sidebar="toggleSidebar" />
    <div class="d-flex">
      <Sidebar :visible="sidebarVisible" @close="sidebarVisible = false" />
      <main class="flex-grow-1 p-3" :class="{ 'ms-0': !sidebarVisible, 'ms-250': sidebarVisible }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import Topbar from './components/layout/Topbar.vue'
import Sidebar from './components/layout/Sidebar.vue'

export default {
  name: 'App',
  components: { Topbar, Sidebar },
  data() {
    return {
      sidebarVisible: window.innerWidth >= 768,
    }
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
  </nav>
</template>

<script>
export default {
  name: 'Topbar',
  emits: ['toggle-sidebar'],
}
</script>
```

## 7. Sidebar — `src/components/layout/Sidebar.vue`

```javascript
<template>
  <div>
    <!-- overlay para móvil -->
    <div v-if="visible && isMobile" class="sidebar-overlay" @click="$emit('close')"></div>

    <div class="sidebar bg-dark text-white p-3" :class="{ open: visible }">
      <h5 class="text-center mb-4">Menú</h5>
      <ul class="nav flex-column">
        <li class="nav-item">
          <router-link to="/" class="nav-link text-white" @click="closeOnMobile">Inicio</router-link>
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

## 8. Store Pinia de ejemplo — `src/stores/ejemplo.js`

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

## 9. Instancia de Axios — `src/api/axios.js`

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.message)
    return Promise.reject(error)
  }
)

export default api
```

## 10. Vista de ejemplo — `src/views/HomeView.vue`

```javascript
<template>
  <div class="container py-4">
    <h1 class="mb-4">Inicio</h1>
    <p class="text-muted">Bienvenido a la aplicación.</p>
  </div>
</template>

<script>
export default {
  name: 'HomeView',
}
</script>
```

## 11. Archivo `.env` y `.env.example`

```
VITE_API_URL=http://localhost:3000
```

Crear `.env.example` con el mismo contenido y agregar `.env` al `.gitignore`.

## 12. Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 13. `.gitignore`

```
node_modules/
.env
dist/
```

## 14. Estructura final

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
│   │   └── ejemplo.js
│   └── views/
│       └── HomeView.vue
└── node_modules/
```

## 15. Documentación básica — `DOCUMENTACION.md`

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

| Ruta | Vista | Descripcion |
|------|-------|-------------|
| `/` | `HomeView` | Pagina de inicio |

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
│   │   └── ejemplo.js
│   └── views/
│       └── HomeView.vue
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
