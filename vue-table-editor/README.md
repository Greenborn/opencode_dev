# vue-table-editor

Tabla genérica reutilizable y **autocontenida** para **Vue 3**. Lista de funcionalidades:

- Toolbar (refresh, CSV, CRUD, botones personalizados)
- Selección de columnas visibles (dropdown)
- Búsqueda global y filtro por columna
- Ordenamiento client-side y server-side
- Paginación client-side y server-side
- Scroll infinito (`IntersectionObserver`)
- Selección single / multiple + selección todo
- Columnas **redimensionables** (pointer events) y **reordenables** (drag & drop)
- Preferencias de columnas persistentes (orden, ancho, visibilidad)
- Edición inline con debounce y validación
- Grupos de columnas, `valueFormatters`, badges de color, formateo fecha/boolean/json
- Exportar a CSV
- CRUD (`api.create` / `api.edit` / `api.delete`) y acciones por fila

**Sin dependencias de UI**: no usa Bootstrap ni Bootstrap Icons. Incluye su propio CSS
autocontenido (`te-*`) y un set de iconos SVG embebido. Solo requiere `vue` como
**peer dependency**.

---

## Instalación

```bash
npm install vue-table-editor
```

> `vue` es peer dependency. La app consumidora debe tenerlo instalado.

## Uso

### 1. Importar y registrar el componente

```js
import { TableEditor } from 'vue-table-editor'
import 'vue-table-editor/style.css'

export default {
  components: { TableEditor },
}
```

Con `<script setup>`:

```js
import { TableEditor } from 'vue-table-editor'
import 'vue-table-editor/style.css'
```

### 2. Template

```html
<TableEditor
  ref="table"
  id="productos"
  :api="apiProductos"
  :config="tableConfig"
  @rowSelected="onRowSelected"
  @rowDoubleClick="onRowDblClick"
/>
```

### 3. API (server-side / lazy)

```js
import { BtnConfig } from 'vue-table-editor'

export default {
  data() {
    return {
      selectedRow: null,
      apiProductos: {
        list: (params) => api.get('/productos/list', { params }).then(r => r.data),
        create: (data) => api.post('/productos', data).then(r => r.data),
        edit: (data) => api.put(`/productos/${data.id}`, data).then(r => r.data),
        delete: (data) => api.delete(`/productos/${data.id}`).then(r => r.data),
      },
    }
  },
  computed: {
    tableConfig() {
      return {
        lazy: true,
        selectionMode: 'single',
        elementName: { singular: 'Producto', gender: 'M' },
        buttons: {
          toolbar: [
            { key: 'create', icon: 'plus', severity: 'success', label: 'Nuevo',
              onClick: () => this.abrirModal() },
            { key: 'edit', icon: 'pencil', severity: 'warning', label: 'Editar',
              isDisabled: () => !this.selectedRow, onClick: () => this.abrirModal(this.selectedRow) },
            { key: 'delete', icon: 'trash', severity: 'danger', label: 'Eliminar',
              isDisabled: () => !this.selectedRow, onClick: () => this.eliminar(this.selectedRow) },
          ],
          rowActions: [
            new BtnConfig({
              key: 'ver', icon: 'eye', severity: 'info', label: 'Ver',
              onClick: (row) => alert('Detalle: ' + row.id),
            }),
          ],
        },
      }
    },
  },
}
```

`api.list` debe devolver:

```js
{ status: true, data: { rows, totalRecords, fields_def } }
```

donde `fields_def` define las columnas: `{ field, headerName, type, sortable, form_type, css }`.

### Cliente-side (sin backend)

```html
<TableEditor :data="{ rows, fields_def }" :config="{ selectionMode: 'multiple' }" />
```

## Iconos

Los botones aceptan un `icon` por nombre. El componente incluye un set SVG embebido:

`search`, `download`, `plus`, `pencil`, `trash`, `columns`, `eye`, `refresh`.

También acepta nombres legacy de Bootstrap Icons (`bi bi-plus-lg`, `bi bi-pencil`, etc.) y los
mapea automáticamente a los SVG incluidos.

## Severity de botones

`severity` usa variantes propias (`te-btn-*`):

| Severity | Estilo |
|----------|--------|
| `primary` | Relleno azul |
| `secondary` | Relleno gris |
| `success` | Relleno verde |
| `info` | Relleno cian |
| `warning` | Relleno ámbar |
| `danger` | Relleno rojo |
| `outline-primary` / `outline-secondary` / `outline-info` / `outline-success` / `outline-warning` / `outline-danger` | Contorno |

También se aceptan valores legacy con prefijo `btn-` (p. ej. `btn-primary`) y se normalizan.

---

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `api` | Object | `null` | `{ list, create, edit, delete }` |
| `permisos` | Object | `{}` | `{ ver, crear, editar, eliminar }` |
| `config` | Object | `{}` | Configuración (ver abajo) |
| `data` | Object | `null` | `{ rows, fields_def }` para modo cliente-side |
| `id` | String | `null` | Clave de persistencia de preferencias |

## Config (`config`)

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `lazy` | Boolean | `false` | Carga server-side vía `api.list` |
| `selectionMode` | String | `'single'` | `'single'`, `'multiple'` o `null` |
| `infiniteScroll` | Boolean | `false` | Scroll infinito (por defecto `true` si `lazy`) |
| `elementName` | Object | — | `{ singular, gender }` para etiquetas |
| `columnGroups` | Array | — | `[{ headerName, fields }]` |
| `inlineEditing` | Object | — | `{ campos: { [field]: cfg }, api, debounce_ms, onSave }` |
| `valueFormatters` | Object | — | `{ [field]: (row) => html }` |
| `showFilterRow` | Boolean | `false` | Fila de filtros por columna |
| `scrollHeight` | String | `null` | Altura de scroll |
| `pageSize` | Number | `25` | Filas por página |
| `pageSizeOptions` | Array | `[25,50,100,200]` | Opciones del selector |
| `hideToolbar` / `hideRefresh` / `hideCsvExport` | Boolean | `false` | Oculta elementos |
| `showPaginator` | Boolean | `true` | Muestra paginador |
| `defaultColumnProps` | Object | — | Props por defecto a todas las columnas |
| `columnOrder` | Array | — | Orden inicial de columnas |
| `preferencesStore` | Object | — | Adaptador de preferencias (si no se pasa, usa localStorage) |
| `buttons` | Object | — | `{ toolbar: BtnConfig[], rowActions: BtnConfig[] }` |

## Eventos

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `loaded` | `Boolean` | Datos cargados |
| `rowSelected` | `Object \| null \| Array` | Fila(s) seleccionada(s) |
| `rowDoubleClick` | `Object` | Fila con doble click |

## Métodos (vía `ref`)

| Método | Descripción |
|--------|-------------|
| `loadData(data?)` | Recarga datos |
| `applyConfig()` | Re-aplica configuración |
| `refresh()` | Recarga y resetea selección |

---

## Preferencias de columnas

Las preferencias (orden, ancho, visibilidad) se guardan automáticamente con debounce.
Por defecto se usan **localStorage** (autónomo, sin servidor). Puedes inyectar tu propio
adaptador — por ejemplo un store Pinia del host — vía `config.preferencesStore`, siempre
que exponga:

```js
{
  misValores: object,
  valor(key): any,
  guardarValores(data): Promise|void,
  fetchMisPreferencias(): Promise|void,
}
```

También puedes registrar un adaptador global:

```js
import { setGlobalPreferencesAdapter } from 'vue-table-editor'
setGlobalPreferencesAdapter(miAdaptador)
```

Y crear adaptadores de localStorage con clave propia:

```js
import { createLocalStoragePrefsAdapter } from 'vue-table-editor'
const adapter = createLocalStoragePrefsAdapter('mi_clave')
```

---

## Demo local

```bash
cd vue-table-editor
npm install
npm run dev
```

Incluye dos ejemplos: server-side (lazy, con API simulada) y cliente-side con edición inline.

## Build de la librería

```bash
npm run build
```

Genera `dist/vue-table-editor.js`, `dist/vue-table-editor.umd.cjs` y `dist/vue-table-editor.css`.

## Licencia

MIT