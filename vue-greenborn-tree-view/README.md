# vue-greenborn-tree-view

Vista de árbol genérica para Vue 3 con **carga diferida (lazy-load)**: trae primero los nodos
raíz y, recién cuando el usuario expande un nodo, pide sus hijos. No asume ningún backend ni
forma de dato en particular: el consumidor resuelve una función `cargarNodos(nodoPadre)` que
puede llamar a una API, filtrar un array local, etc.

## Instalación

```bash
npm install vue-greenborn-tree-view
```

```js
import { GbTreeView } from 'vue-greenborn-tree-view'
import 'vue-greenborn-tree-view/style.css'
```

## Uso básico

```vue
<template>
  <GbTreeView ref="arbol" :cargar-nodos="cargarNodos" @seleccionar="onSeleccionar" />
</template>

<script setup>
import { GbTreeView } from 'vue-greenborn-tree-view'

// nodoPadre es null cuando se pide el nivel raiz.
async function cargarNodos(nodoPadre) {
  const parent_id = nodoPadre ? nodoPadre.id : ''
  const res = await miApi.get('/categorias/arbol', { params: { parent_id } })
  return res.data.rows // [{ id, name, tieneHijos, ... }, ...]
}

function onSeleccionar(nodo) {
  console.log('seleccionado', nodo)
}
</script>
```

Cada nodo necesita, como mínimo, el campo indicado por `campo-id` (default `id`) y,
opcionalmente, el campo indicado por `campo-tiene-hijos` (default `tieneHijos`) para mostrar el
ícono de expansión antes de cargar sus hijos. Si ese campo no está presente, el nodo se asume
expandible y, si al abrirlo no trae nada, se muestra el texto de `texto-sin-hijos`.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `cargarNodos` | `Function` | requerido | `async (nodoPadre) => nodo[]`. `nodoPadre` es `null` para el nivel raíz |
| `campoId` | `String` | `'id'` | campo único usado como `:key` y para comparar selección |
| `campoTieneHijos` | `String` | `'tieneHijos'` | campo booleano que indica si el nodo es expandible |
| `textoCargando` | `String` | `'Cargando...'` | texto mientras se pide un nivel |
| `textoVacio` | `String` | `'Sin elementos'` | texto cuando el árbol no tiene raíces |
| `textoSinHijos` | `String` | `'Sin subelementos'` | texto cuando un nodo expandido no trae hijos |

## Emits

| Evento | Payload | Descripción |
|---|---|---|
| `seleccionar` | `nodo` | se hizo click sobre la fila de un nodo (en cualquier nivel) |

## Slots

| Slot | Scope | Descripción |
|---|---|---|
| `nodo` | `{ nodo, nivel, abierto, seleccionado }` | contenido de la fila; default: `nodo.label ?? nodo.name ?? nodo[campoId]` |
| `toggle` | `{ nodo, abierto, tieneHijos }` | ícono de expandir/colapsar; default: flecha / punto para hojas |

## Métodos expuestos (`ref` + `defineExpose`)

- `refrescar()` — recarga el nivel raíz y, de los nodos ya expandidos, vuelve a pedir sus hijos
  (sin perder la expansión actual). Pensado para llamarlo después de un alta/edición/borrado
  hecho fuera del árbol.

## Estilos

Los estilos vienen con nombres de clase propios (`gb-tree-view__*`, sin depender de ningún
framework de UI) y exponen variables CSS para integrarse con cualquier paleta:

```css
:root {
  --gb-tree-view-hover-bg: #f1f3f5;
  --gb-tree-view-selected-bg: #cfe2ff;
  --gb-tree-view-toggle-color: #6c757d;
  --gb-tree-view-muted-color: #6c757d;
  --gb-tree-view-error-color: #dc3545;
}
```

## Demo local

```bash
npm install
npm run dev
```
