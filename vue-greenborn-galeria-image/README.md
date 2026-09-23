# vue-greenborn-galeria-image

Galería de imágenes para Vue 3: grilla con lazy load y lightbox tipo image-detail (zoom, pan, pantalla completa, navegación prev/next, atajos de teclado, descarga y panel lateral de metadatos). Permisos opcionales vía `permissionsCheck` — **compatible con el RBAC de greenborn pero usable sin él**. Sin dependencias de UI (CSS propio) y sin dependencias runtime (usa `fetch`).

Pensado para consumir el API de [express-greenborn-galeria-image](../express-greenborn-galeria-image), pero funciona con cualquier lista de imágenes.

## Install

```bash
npm install vue-greenborn-galeria-image
```

Requiere Vue ^3.3. Importar el CSS una vez:

```js
import 'vue-greenborn-galeria-image/style.css';
```

## Uso rápido

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { GaleriaGrid, GaleriaLightbox, useGaleriaImage } from 'vue-greenborn-galeria-image';
import 'vue-greenborn-galeria-image/style.css';

const abierto = ref(false);
const indice = ref(0);

// Cliente del backend express-greenborn-galeria-image
const galeria = useGaleriaImage({ baseUrl: 'http://localhost:5175' });

onMounted(() => galeria.listar());

function seleccion(i) {
  indice.value = i;
  abierto.value = true;
}
</script>

<template>
  <GaleriaGrid
    :imagenes="galeria.state.imagenes"
    :columnas="4"
    @select="seleccion"
  />
  <GaleriaLightbox
    v-model:open="abierto"
    v-model:index="indice"
    :imagenes="galeria.state.imagenes"
  />
</template>
```

También acepta el modelo `ImageDetailItem` de `angular-greenborn-image-detail` (`url`, `title`, `caption`, `section`, `metadata: [{label, value}]`) — se normaliza automáticamente.

## Componentes

### `GaleriaGrid`

Grilla responsive con lazy load (`loading="lazy"`).

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `imagenes` | `Array` | `[]` | Lista de imágenes (modelo galería-image o ImageDetailItem) |
| `columnas` | `Number \| String` | `4` | Columnas de la grilla CSS |
| `gap` | `String` | `'12px'` | Separación entre celdas |
| `mostrarTitulo` | `Boolean` | `true` | Muestra el título sobre la miniatura |
| `mostrarSeccion` | `Boolean` | `false` | Muestra la sección como chip |
| `permisos` | `Object` | `{}` | `{ edit: 'galeria.editar', delete: 'galeria.eliminar' }` (nombres de permiso custom) |
| `permissionsCheck` | `Function` | `null` | `(permiso) => boolean`. **Si no se define, todo está habilitado** (uso sin RBAC) |
| `selectable` | `Boolean` | `false` | Habilita selección múltiple: el click marca/desmarca la celda |
| `modelValue` | `Array` | `[]` | Claves seleccionadas (`v-model`); cada clave se resuelve con `keyField` |
| `keyField` | `String` | `'url'` | Campo del item original (o normalizado) usado como clave de selección |
| `badgeField` | `String` | `''` | Campo del item original cuyo valor se muestra como badge (ej. `importada` → "importada"); `true` → nombre del campo |

| Evento | Payload | Descripción |
|---|---|---|
| `select` | `(index, item)` | Click en una miniatura (abrir lightbox) |
| `edit` | `(item, index)` | Botón editar (visible según permisos) |
| `delete` | `(item, index)` | Botón eliminar (visible según permisos) |

### `GaleriaLightbox`

Modal lightbox autocontenido (Teleport a `body`).

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `imagenes` | `Array` | `[]` | Lista de imágenes |
| `startIndex` | `Number` | `0` | Índice inicial |
| `open` | `Boolean` | `false` | Visibilidad (`v-model:open`) |
| `showDownload` | `Boolean` | `true` | Botón descargar |
| `showFullscreen` | `Boolean` | `true` | Botón pantalla completa |
| `showMetadata` | `Boolean` | `true` | Panel lateral de metadatos |

| Evento | Descripción |
|---|---|
| `update:open` / `update:index` | v-model |
| `closed` | Al cerrar |
| `previous` / `next` | Navegación (recibe el nuevo índice) |

Atajos de teclado: `←`/`→` navegar, `Esc` cerrar (o salir de fullscreen), `+`/`−` zoom, `0` restablecer, `F` pantalla completa, `D` descargar.

### `GbZoomableImage`

Visor individual con zoom (rueda / botones / doble click), pan por arrastre y teclado. Props: `src`, `alt`, `minScale` (1), `maxScale` (8). Expone `reset()` y `zoom(factor)`.

## Composable `useGaleriaImage(config)`

Cliente del API de `express-greenborn-galeria-image` con `fetch`:

| Opción | Descripción |
|---|---|
| `baseUrl` | Base del backend (ej: `'https://api.midominio.com'`) |
| `rootPath` | Default `'/api/galeria-imagenes'` |
| `limit` | Tamaño de página default (24) |
| `token` / `getToken()` | Token Bearer para endpoints protegidos por RBAC |

Devuelve `{ state, listar, obtener, crear, actualizar, eliminar }` donde `state` es reactivo con `{ imagenes, total, page, limit, pages, cargando, error }`.

```js
const galeria = useGaleriaImage({
  baseUrl: 'https://api.midominio.com',
  getToken: () => miStoreSso.token, // opcional (vue-greenborn-sso-front)
});

await galeria.listar({ page: 1, seccion: 'naturaleza', q: 'atardecer' });
await galeria.crear({ file, titulo: 'Nueva imagen', seccion: 'naturaleza' });
await galeria.actualizar(id, { titulo: 'Otro título' });
await galeria.eliminar(id);
```

## Permisos (RBAC opcional)

Patrón `permissionsCheck` (igual que `vue-table-editor`): si no se pasa la función, todos los controles están habilitados. Con RBAC:

```js
const { state: ssoState } = useSso(/* vue-greenborn-sso-front */);

function permissionsCheck(permiso) {
  return ssoState.usuario?.permisos?.includes(permiso) ?? false;
}
```

Permisos sugeridos (los default): `galeria.ver`, `galeria.crear`, `galeria.editar`, `galeria.eliminar`.

## Demo

```bash
npm run dev   # levanta la demo en el puerto 5175
```

## Build

```bash
npm run build   # genera dist/ (ES + UMD + CSS único)
```

## Licencia

MIT
