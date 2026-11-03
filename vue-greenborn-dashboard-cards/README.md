# vue-greenborn-dashboard-cards

Infraestructura genérica de dashboard por cards para Vue 3: grid sin librerías externas, agrupación por categoría (pestañas), registry de cards, preferencias de usuario inyectables, contexto desacoplado y un gráfico `Sparkline` SVG propio.

**El paquete no incluye cards de contenido.** Cada proyecto consumidor define sus propios componentes de card (los que conocen sus datos/endpoints/sockets) y los registra pasando un array de *defs* a `DashboardCardsGrid`.

## Instalación

```bash
npm install vue-greenborn-dashboard-cards
```

```js
import { DashboardCardsGrid } from 'vue-greenborn-dashboard-cards'
import 'vue-greenborn-dashboard-cards/style.css'
```

## Uso

```html
<DashboardCardsGrid :cards="cards" :contexto="contexto" />
```

```js
const cards = [
  {
    clave: 'mi-card',
    titulo: 'Mi card',
    categorias: ['sistema'],
    anchoDefault: 1,
    ordenDefault: 10,
    permiso: null, // opcional
    componente: () => import('./MiCard.vue'),
  },
]

const contexto = {
  socket: miSocket, // { emit, on, off, once }
  tienePermiso: (permiso) => true,
  preferencias: { cargar: (clave) => Promise, guardar: (clave, valor) => Promise },
  abrirModal: (componente, titulo, props, opciones) => ({ code }), // opcional
}
```

## Contexto (contrato de inyección)

El paquete nunca importa `vue-greenborn-sso-front`, `vue-greenborn-modal-manager` ni Pinia. El proyecto consumidor provee un objeto `contexto` con:

- `socket`: cualquier objeto con `{emit, on, off, once}`.
- `tienePermiso(permiso)`: función simple.
- `preferencias`: adaptador `{cargar(clave), guardar(clave, valor)}` genérico.
- `abrirModal(...)`: opcional; si no se provee, las cards deben ocultar acciones que lo requieran.

Dentro de una card de contenido, se puede leer este contexto con `useDashboardCardsContext()`.

## Build

```bash
npm run build
```

Genera `dist/vue-greenborn-dashboard-cards.{js,umd.cjs,css}`.
