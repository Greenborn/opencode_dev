# vue-greenborn-directory-picker

Selector de directorios para Vue 3, construido sobre
[`vue-greenborn-tree-view`](https://github.com/Greenborn/opencode_dev/tree/main/vue-greenborn-tree-view).
No asume ningún backend ni forma de acceder al filesystem: el consumidor resuelve una función
`cargarDirectorios(nodoPadre)` (igual que `cargarNodos` en `vue-greenborn-tree-view`) que puede
llamar a una API, IPC de Electron, etc. El componente solo muestra el árbol de carpetas y emite
la ruta elegida cuando el usuario hace click sobre un nodo.

## Instalación

```bash
npm install vue-greenborn-directory-picker vue-greenborn-tree-view
```

```js
import { GbDirectoryPicker } from 'vue-greenborn-directory-picker'
import 'vue-greenborn-directory-picker/style.css'
```

## Uso básico

```vue
<template>
  <GbDirectoryPicker :cargar-directorios="cargarDirectorios" @seleccionar="onSeleccionar" />
</template>

<script setup>
import { GbDirectoryPicker } from 'vue-greenborn-directory-picker'

// nodoPadre es null cuando se pide el nivel raiz.
async function cargarDirectorios(nodoPadre) {
  const ruta = nodoPadre ? nodoPadre.ruta : undefined
  const res = await miApi.get('/sistema/directorios', { params: { ruta } })
  return res.data.rows // [{ ruta, nombre, tieneHijos }, ...]
}

function onSeleccionar(ruta) {
  console.log('ruta elegida', ruta)
}
</script>
```

Cada nodo necesita, como mínimo, el campo indicado por `campo-ruta` (default `ruta`, usado como
identificador único para el árbol subyacente) y el campo indicado por `campo-nombre` (default
`nombre`, lo que se muestra en la fila). Opcionalmente el campo de `campo-tiene-hijos` (default
`tieneHijos`) para mostrar el ícono de expansión antes de cargar sus hijos.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `cargarDirectorios` | `Function` | requerido | `async (nodoPadre) => nodo[]`. `nodoPadre` es `null` para el nivel raíz |
| `campoRuta` | `String` | `'ruta'` | campo único por nodo, usado como identificador y como valor emitido al seleccionar |
| `campoNombre` | `String` | `'nombre'` | campo mostrado en cada fila |
| `campoTieneHijos` | `String` | `'tieneHijos'` | campo booleano que indica si el nodo es expandible |
| `textoCargando` | `String` | `'Cargando...'` | texto mientras se pide un nivel |
| `textoVacio` | `String` | `'Sin directorios'` | texto cuando el árbol no tiene raíces |
| `textoSinHijos` | `String` | `'Sin subdirectorios'` | texto cuando un nodo expandido no trae subdirectorios |
| `textoSinSeleccion` | `String` | `'Ninguna'` | texto mostrado como ruta actual mientras no se eligió ninguna |

## Emits

| Evento | Payload | Descripción |
|---|---|---|
| `seleccionar` | `ruta` (string, valor de `nodo[campoRuta]`) | se hizo click sobre la fila de un nodo (en cualquier nivel) |

El componente no incluye botones de confirmar/cancelar: queda a cargo de quien lo use (por
ejemplo, dentro de un modal) escuchar `seleccionar` y decidir cuándo confirmar la elección.

## Estilos

Sin dependencias de UI de terceros (además de `vue-greenborn-tree-view`, cuyo CSS hay que
importar también). Variables CSS propias para integrarse con cualquier paleta:

```css
:root {
  --gb-directory-picker-muted-color: #6c757d;
  --gb-directory-picker-valor-color: #212529;
  --gb-directory-picker-border-color: #dee2e6;
}
```

## Demo local

```bash
npm install
npm run dev
```
