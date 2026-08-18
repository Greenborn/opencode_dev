# vue-greenborn-panels

Sistema genérico de **paneles y tabs reordenables** para **Vue 3**, extraído y genericizado del sistema de paneles de la aplicación Greenborn/SGI. Incluye:

- **`usePanelRegistry`** — registro singleton de tabs por *slot* (ubicación del layout).
- **`useTabController`** — lógica compartida de pestañas (orden por prioridad + orden guardado, filtro, tab activa, drag & drop, persistencia).
- **`useLayoutState`** — estado de colapso/resize de los paneles (sin Pinia, singleton de módulo).
- **`TabBar`** — barra de tabs reordenable con drag & drop nativo (sin librerías).
- **`TabPanel`** — contenedor: `TabBar` + cuerpo del componente activo (con `KeepAlive` opcional).
- **`ResizablePanel`** — panel lateral/inferior colapsable con handle de redimensionado.
- **`sortTabs`** — utilidad de ordenamiento.

**Sin Pinia** (estado vía composable/singleton de módulo), **sin dependencias de UI** (CSS propio) y **sin TypeScript**.

## Instalación

```bash
npm install vue-greenborn-panels
```

Importa el CSS una sola vez (puedes sobreescribir las clases `gp-*`):

```js
import 'vue-greenborn-panels/style.css'
```

## Uso rápido

### 1. Registra tabs por slot (una vez)

```js
import { usePanelRegistry } from 'vue-greenborn-panels'

const registry = usePanelRegistry()
registry.registerTab('sidebarRight', {
  id: 'detalle',
  label: 'Detalle',
  component: defineAsyncComponent(() => import('./DetalleTab.vue')),
  priority: 10, // menor = primero
})
registry.registerTab('sidebarRight', {
  id: 'historial',
  label: 'Historial',
  component: HistorialTab,
  priority: 20,
})
```

Cada tab requiere `id`, `label` y `priority` numérico; `component` se usa con `TabPanel`.

### 2. Arma el controlador de tabs en tu panel

```js
import { usePanelRegistry, useTabController, useLayoutState } from 'vue-greenborn-panels'

const { getTabs } = usePanelRegistry()
const slotTabs = ref(getTabs('sidebarRight'))

const ctl = useTabController({
  slotTabs,                 // tabs del slot (puede ser un ref reactivo)
  builtinTabs: [],          // tabs fijas del panel, opcional
  savedOrder,               // ref con el orden guardado (array de ids), opcional
  filterTab: (t) => activeComponents[t.id] !== false, // filtro opcional
  watchFilter: [activeComponents],  // fuentes que disparan rebuild al cambiar
  persistOrder: (ids) => savePreference('order', ids), // persistencia del orden
  initialTab: 'detalle',
})
```

### 3. Renderiza

```vue
<TabPanel
  :tabs="ctl.localTabs.value"
  :active="ctl.activeTab.value"
  @select="ctl.select"
  @reorder="ctl.reorder"
/>
```

### 4. Panel colapsable con resize

```vue
<ResizablePanel
  side="right"
  :collapsed="layoutState.rightPanelCollapsed.value"
  :size="layoutState.rightPanelWidth.value"
  @update:size="(v) => layoutState.set('rightPanelWidth', v)"
>
  <!-- contenido -->
</ResizablePanel>
```

```js
// layoutState es singleton: cualquier componente comparte el mismo estado.
const layoutState = useLayoutState({
  persist: async (entries) => savePrefs(entries),  // opcional
  hydrate: async () => loadPrefs(),                 // opcional
})
layoutState.load()
```

## API

### `usePanelRegistry()`

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `registerTab(slot, tab)` | `fn` | Registra una tab en un slot. Valida `id`, `label` y `priority`; omite duplicados por `id`. |
| `getTabs(slot)` | `fn` | Devuelve el array (reactivo) de tabs registradas en `slot`. |
| `getTabsCopy(slot)` | `fn` | Copia plana de las tabs del slot. |
| `hasSlot(slot)` | `fn` | `true` si el slot tiene al menos una tab. |
| `slots` | `Map` | Mapa reactivo `slot → tabs`. |

Un **slot** es cualquier string que represente una ubicación (p. ej. `'sidebarLeft'`, `'sidebarRight'`, `'devPanel'`).

### `useTabController(options)`

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `slotTabs` | `Ref\|Array` | Tabs del registry (reactivas). |
| `builtinTabs` | `Array` | Tabs fijas del panel. Se fusionan y ordenan con las del slot. |
| `savedOrder` | `Ref<Array>` | Orden guardado (ids); se respeta de izquierda a derecha. |
| `filterTab` | `fn(tab)=>bool` | Filtro opcional sobre las tabs ordenadas. |
| `watchFilter` | `Array<Ref>` | Fuentes reactivas que al cambiar reconstruyen las tabs. |
| `persistOrder` | `fn(ids)` | Callback al reordenar. |
| `initialTab` | `string` | Tab activa inicial. |
| `restoreTab` | `fn()=>string` | Para restaurar la tab activa desde prefs de sesión/contexto. |

Devuelve:

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `localTabs` | `Ref<Array>` | Tabs ordenadas y filtradas listas para `TabPanel`/`TabBar`. |
| `activeTab` | `Ref<string>` | Tab activa. |
| `select(id)` | `fn` | Cambia la tab activa. |
| `reorder(from, to)` | `fn` | Mueve una tab (para conectar `@reorder` de `TabBar`). |
| `saveOrder(ids)` | `fn` | Guarda el orden y dispara `persistOrder`. |
| `buildTabs()` | `fn` | Reconstruye la lista manualmente. |
| `onDragStart/onDragOver/onDrop/onDragEnd` | `fn` | Handlers de drag&drop (si no usas `TabBar`). |

### `useLayoutState(options?)`

Estado singleton. Estado expuesto: `sidebarCollapsed`, `sidebarWidth`, `panelCollapsed`, `panelHeight`, `rightPanelCollapsed`, `rightPanelWidth`, `centralPanelCollapsed`, `sidebarWidthPct` (todos `Ref`).

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `toggle(key)` | `fn` | Invierte un booleano y guarda. |
| `set(key, value)` | `fn` | Establece un valor y guarda. |
| `setSidebarWidthPct(v)` | `fn` | Clampa a `5..95` y guarda. |
| `save()` | `async fn` | Llama a `options.persist`. |
| `load()` | `async fn` | Llama a `options.hydrate` y aplica (una sola vez). |
| `reset()` | `fn` | Restaura valores por defecto. |
| `key(k)` | `fn` | Devuelve el `Ref` por clave. |

### `TabBar`

Props: `tabs`, `active`, `draggable`. Emite `select(id)` y `reorder(fromIndex, toIndex)`.

### `TabPanel`

Props: `tabs`, `active`, `showTabBar`, `draggable`, `keepAlive`, `keepAliveMax`, `keepAliveInclude`, `keepAliveExclude`. Emite `select`, `reorder`. Tiene un slot `default` con el `v-bind="{ tabs, active }"` para reemplazar el cuerpo.

### `ResizablePanel`

Props: `side` (`'left' | 'right' | 'bottom'`), `collapsed`, `size`, `resizable`, `minSize`, `title`. Emite `update:size` y `update:collapsed`. Redimensiona con drag&drop nativo (manejo de eventos `mousemove/mouseup` a nivel `document`).

## Persistencia y filtros

El paquete es **agnóstico de almacenamiento**: `useLayoutState.persist/hydrate`, `useTabController.persistOrder` y `filterTab` son puntos de inyección para que conectes tu servicio de settings, Pinia u otra fuente. Sin adaptador, todo permanece en memoria.

## Desarrollo

```bash
npm install
npm run dev      # demo en http://localhost:5175
npm run build    # compila lib (ESM + UMD)
```

## Licencia

MIT
