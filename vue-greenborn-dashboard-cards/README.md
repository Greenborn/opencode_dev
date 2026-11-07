# @greenborn/vue-greenborn-dashboard-cards

Infraestructura genérica de dashboard por cards para Vue 3: grid sin librerías externas, pestañas
personalizables por usuario, menús contextuales, cards ocultas, filtro por título/subtítulo,
drag & drop, preferencias inyectables, contexto desacoplado y un gráfico `Sparkline` SVG propio.

**El paquete no incluye cards de contenido.** Cada proyecto consumidor define sus propios
componentes de card (los que conocen sus datos/endpoints/sockets) y los registra pasando un array de
*defs* a `DashboardCardsGrid`.

## Instalación

```bash
npm install @greenborn/vue-greenborn-dashboard-cards
```

```js
import { DashboardCardsGrid } from '@greenborn/vue-greenborn-dashboard-cards'
import '@greenborn/vue-greenborn-dashboard-cards/style.css'
```

## Uso

```html
<DashboardCardsGrid :cards="cards" :contexto="contexto" preferencias-clave="dashboard_cards" />
```

```js
const cards = [
  {
    clave: 'mi-card',
    titulo: 'Mi card',
    categorias: ['sistema'],     // pestaña inicial (se copia una sola vez por usuario)
    tipo: 'NUMERO',              // 'NUMERO' | 'GRAFICO' (los números van primero)
    anchoDefault: 1,             // 1-4 columnas
    ordenDefault: 10,
    permiso: null,               // opcional
    componente: () => import('./MiCard.vue'),
    menuItems: [{ label: 'Cómo se calcula', command: () => abrirInfo() }], // opcional
  },
]

const contexto = {
  socket: miSocket, // { emit, on, off, once }
  tienePermiso: (permiso) => true,
  preferencias: { cargar: (clave) => Promise, guardar: (clave, valor) => Promise },
  abrirModal: (componente, titulo, parametros, opciones) => {
    const { code } = mostrar_modal(componente, titulo, parametros, opciones)
    return { code, cerrar: () => ocultar_modal(code) }
  },
  confirmar: ({ title, text, onConfirm }) => { /* ... */ },
  mostrarAlerta: (texto) => { /* ... */ },
  colores: null, // opcional: reemplaza COLORES_CARDS
}
```

## Pestañas por usuario

La preferencia se guarda con la clave `preferenciasClave` y tiene este formato v2:

```js
{
  version: 2,
  activa: 'general',
  iniciales: 2,
  pestanas: [
    { id: 'general', nombre: 'Todas', general: true, cards: [{ clave, ancho?, color? }], ocultas: [] },
    { id: 'i_sistema', nombre: 'Sistema', cards: [{ clave, ancho? }], ocultas: [] },
  ],
}
```

- **“Todas”** existe siempre, tiene todas las cards y no se renombra ni se elimina (pero se mueve).
- Las pestañas iniciales salen de `categorias` / `pestanaDefault` de las defs y se arman una sola
  vez por usuario.
- El formato anterior `{ [clave]: { ancho, oculta, categoria } }` se migra al leer: “Todas” queda
  con los anchos y las ocultas del usuario y se guarda en v2 al primer cambio.
- Las operaciones puras están exportadas desde `useTabsPreferences.js` (`agregarPestana`,
  `renombrar`, `moverCard`, `copiarCard`, `ocultar`, `mostrar`, etc.).

## Contexto (contrato de inyección)

El paquete nunca importa `vue-greenborn-sso-front`, `vue-greenborn-modal-manager`, Pinia ni una
librería de UI. El proyecto consumidor provee un objeto `contexto` con:

- `socket`: cualquier objeto con `{emit, on, off, once}`.
- `tienePermiso(permiso)`: función simple.
- `preferencias`: adaptador `{cargar(clave), guardar(clave, valor)}` genérico.
- `abrirModal(componente, titulo, parametros, opciones)`: opcional; si no se provee, el paquete usa
  un diálogo interno para las pestañas y las cards ocultas.
- `confirmar({ title, text, onConfirm })`: opcional; si no se provee, usa `window.confirm`.
- `mostrarAlerta(texto)`: opcional.
- `colores`: opcional; array de `{ clave, nombre, var, hex }`.

Dentro de una card de contenido se puede leer el contexto con `useDashboardCardsContext()`.

## Refresco y cola

- `usarRefresco(fn)`: registra la card para “Actualizar todas” de la pestaña. `fn` debe devolver
  una promesa.
- `usarCola()`: devuelve una función para encolar la consulta de apertura, de a una por vez y en
  el orden de la grilla.

## Filtro

El filtro busca en el título de todas las cards y en los subtítulos que las cards dibujen con
`TextoResaltado`. Mientras hay texto, la grilla muestra todas las pestañas agrupadas.

## Build

```bash
npm run build
```

Genera `dist/vue-greenborn-dashboard-cards.{js,umd.cjs,css}`.
