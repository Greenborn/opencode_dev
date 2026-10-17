# vue-greenborn-image-viewer

Visor de imagen para Vue 3: núcleo de viewport reutilizable con **zoom** (rueda del mouse
centrado en el cursor, o botones externos), **pan** (Ctrl + arrastre) y **rotación libre con
preview** recortado al tamaño original.

Este paquete **no persiste rotaciones ni recorta píxeles reales**: solo ofrece el preview CSS
de la rotación libre (prop `anguloLibre`) y expone un slot para que el consumidor superponga
su propio contenido (por ejemplo un `<canvas>` de anotaciones/detecciones) perfectamente
sincronizado con la escala y el recorte. La persistencia (llamadas a una API, confirmaciones,
etc.) queda a cargo de la aplicación que lo usa.

## Instalación

```bash
npm install vue-greenborn-image-viewer
```

```js
import { GbImageViewer } from 'vue-greenborn-image-viewer'
import 'vue-greenborn-image-viewer/style.css'
```

## Uso básico

```vue
<template>
  <GbImageViewer
    ref="visor"
    :src="imagenUrl"
    :ancho="imagen.width"
    :alto="imagen.height"
    :angulo-libre="freeAngle"
    @cargada="onCargada"
    @cambio-viewport="onCambioViewport"
  >
    <template #overlay>
      <canvas
        ref="canvas"
        @wheel.prevent="visor.manejarRueda($event)"
        @mousedown="e => e.ctrlKey && visor.iniciarPaneo(e)"
      />
    </template>
  </GbImageViewer>
</template>
```

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `src` | String | requerido | URL o data-URL de la imagen |
| `alt` | String | `''` | texto alternativo |
| `ancho` | Number | requerido | ancho natural de la imagen |
| `alto` | Number | requerido | alto natural de la imagen |
| `anguloLibre` | Number | `0` | ángulo (0-360) para el preview CSS de rotación libre |
| `zoomMinFactor` | Number | `0.1` | factor mínimo de zoom relativo al fit |
| `zoomMaxAbs` | Number | `32` | escala máxima absoluta |
| `mostrarPorcentaje` | Boolean | `true` | muestra una insignia con el % de zoom actual sobre la imagen (el componente lo calcula y lo pinta solo; no requiere que el consumidor lo refleje por evento) |

## Emits

| Evento | Payload | Descripción |
|---|---|---|
| `cargada` | — | la imagen terminó de cargar (`<img>` `@load`) |
| `cambio-viewport` | `{ escala, anchoContenido, altoContenido }` | cambió la escala efectiva; útil para redimensionar un overlay externo |

## Slot `overlay`

Scope disponible: `{ escala, anguloLibre, estiloTransformPreview, estiloContenido }`. Se
renderiza dentro del mismo contenedor con recorte (`overflow: hidden`) que la imagen, así
cualquier overlay queda alineado durante zoom/pan/rotación.

## Métodos expuestos (`ref` + `defineExpose`)

- `escalaActual`, `fitScale`, `zoomPercent`
- `cambiarZoom(delta)`, `restablecerZoom()`
- `origToCanvas(x, y)`, `canvasToOrig(x, y)`, `estaDentroDeImagen(x, y)`
- `manejarRueda(wheelEvent)` — zoom centrado en el cursor
- `iniciarPaneo(mouseEvent)` — pan vía scroll
- `ctrlPresionado`, `paneando` — para feedback de cursor (`grab`/`grabbing`) en el overlay

## Demo

```bash
npm install
npm run dev
```

Levanta en `http://localhost:5175`.
