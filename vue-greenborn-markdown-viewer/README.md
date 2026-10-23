# vue-greenborn-markdown-viewer

Visor de Markdown para Vue 3. Convierte texto Markdown (GFM: tablas, listas de tareas,
enlaces, etc.) en HTML formateado, **sanitizado con DOMPurify** antes de renderizarse, y
aplica una tipografía propia (`.gb-markdown`) sin dependencias de UI.

## Instalación

```bash
npm install vue-greenborn-markdown-viewer
```

```js
import { GbMarkdownViewer } from 'vue-greenborn-markdown-viewer'
import 'vue-greenborn-markdown-viewer/style.css'
```

## Uso

```vue
<template>
  <GbMarkdownViewer :markdown="politica.contenido" />
</template>
```

Para obtener solo el HTML (por ejemplo para otro motor de render):

```js
import { renderMarkdown } from 'vue-greenborn-markdown-viewer'

const html = renderMarkdown('# Hola **mundo**')
```

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `markdown` | String | `''` | Texto Markdown a mostrar |

## Seguridad

El HTML resultante siempre pasa por DOMPurify, así que el HTML crudo incluido en el
Markdown (`<script>`, manejadores `onclick`, etc.) no se ejecuta.

## Personalización

Los colores se pueden ajustar con variables CSS: `--gb-md-texto`, `--gb-md-texto-suave`,
`--gb-md-enlace`, `--gb-md-borde`, `--gb-md-fondo-codigo`.

## Desarrollo

```bash
npm install
npm run dev     # demo en http://localhost:5175
npm run build   # genera dist/ (ES, UMD y CSS)
```

## Licencia

MIT
