# @greenborn/vue-side-menu

Menú lateral genérico y autocontenido para **Vue 3**. Configurable íntegramente por props, sin dependencias de UI (CSS propio), con comportamiento responsive (overlay en móvil), filtrado opcional por permisos vía `provide/inject` y soporte opcional de `vue-router`.

Extraído y genericizado a partir del sidebar de la aplicación SGI.

## Instalación

```bash
npm install @greenborn/vue-side-menu
```

## Uso básico

```vue
<template>
  <SideMenu
    :items="items"
    :visible="sidebarVisible"
    title="Menú"
    @close="sidebarVisible = false"
  />
</template>

<script>
import { provide } from 'vue'
import SideMenu, { HAS_PERMISSION_KEY } from '@greenborn/vue-side-menu'
import '@greenborn/vue-side-menu/style.css'

export default {
  components: { SideMenu },
  data() {
    return { sidebarVisible: false }
  },
  computed: {
    items() {
      return [
        { label: 'Dashboard', to: '/', icon: 'bi bi-speedometer2' },
        { label: 'Clientes', to: '/clientes', permiso: 'clientes.ver' },
        { label: 'Proyectos', href: '/proyectos' },
        { divider: true },
        {
          label: 'Instalar',
          icon: 'bi bi-download',
          action: () => this.installPwa(),
        },
      ]
    },
  },
  setup() {
    provide(HAS_PERMISSION_KEY, (permiso) => permisosUsuario.includes(permiso))
  },
}
</script>
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `items` | `Array` | `[]` | Items del menú (ver esquema abajo). |
| `visible` | `Boolean` | `false` | Controla el estado abierto/cerrado. |
| `breakpoint` | `Number` | `768` | Ancho (px) bajo el cual se muestra el overlay móvil. |
| `title` | `String` | `'Menú'` | Texto del encabezado. |
| `footer` | `String` | `''` | Texto del pie (p. ej. versión). |

### Esquema de un item

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `label` | `String` | Texto visible. |
| `to` | `String/Object` | Ruta para `router-link` (si vue-router está instalado; si no, se renderiza `<a href>`). |
| `href` | `String` | Enlace plano `<a href>`. |
| `icon` | `String` | Clase(s) del icono, renderizadas en un `<i>`. |
| `permiso` | `String` | Clave de permiso. El item se muestra solo si `hasPermission(permiso)` es verdadero. |
| `divider` | `Boolean` | Renderiza un separador. |
| `action` | `Function` | Función ejecutada al hacer clic (usar cuando no hay `to` ni `href`). |

## Emits

- `close` — se emite al hacer clic en un item en modo móvil o al hacer clic en el overlay.

## Slots

- `footer` — contenido del pie del menú (genérico para versión/estado PWA, etc.).

## Permisos

Si la aplicación llama a `provide(HAS_PERMISSION_KEY, fn)` con una función `(permiso) => boolean`, los items con `permiso` se filtran en consecuencia. Si no se provee, se muestran todos los items.

```js
import { HAS_PERMISSION_KEY } from '@greenborn/vue-side-menu'
import { provide } from 'vue'

provide(HAS_PERMISSION_KEY, (permiso) => usuario.permisos.includes(permiso))
```

## vue-router

No es una dependencia obligatoria. Si `vue-router` está instalado y registrado globalmente, los items con `to` usan `router-link` (y reciben la clase `router-link-exact-active`). En caso contrario, esos items se renderizan como `<a href>`.

## Desarrollo / Demo

```bash
npm install
npm run dev   # demo en http://localhost:5175
npm run build # genera dist/
```

## Licencia

MIT
