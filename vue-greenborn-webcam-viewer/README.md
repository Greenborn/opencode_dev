# vue-greenborn-webcam-viewer

Visor de webcam para Vue 3: encapsula la **obtención de permisos**, la **selección de cámara**,
la **captura de frames y fotos** y la **visualización del stream** con una capa de
**bounding boxes** y slots para overlays extra.

El paquete **no asume ningún backend ni API de detección**: entrega frames (`Blob`) y dibuja las
detecciones que el consumidor le pase por props. El loop de detección, el guardado en servidor y
los umbrales quedan en la aplicación.

## Instalación

```bash
npm install vue-greenborn-webcam-viewer
```

```js
import { GbWebcamViewer } from 'vue-greenborn-webcam-viewer'
import 'vue-greenborn-webcam-viewer/style.css'
```

## Uso básico

```vue
<template>
  <GbWebcamViewer ref="visor" v-model:dispositivo-id="camara" :detecciones="detecciones" />
</template>

<script setup>
import { ref } from 'vue'
import { GbWebcamViewer } from 'vue-greenborn-webcam-viewer'
import 'vue-greenborn-webcam-viewer/style.css'

const visor = ref(null)
const camara = ref('')
const detecciones = ref([])

// Ejemplo: capturar un frame y enviarlo a una API propia.
async function detectar() {
  const frame = await visor.value.capturarFrame({ maxLado: 480, calidad: 0.8 })
  if (!frame) return
  // frame = { blob, width, height }
  const res = await miApi.detectar(frame.blob)
  detecciones.value = res.detecciones
}
</script>
```

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `dispositivoId` | String | `''` | `deviceId` de la cámara. Soporta `v-model:dispositivo-id`. Si queda vacío se usa la cámara por defecto y se completa al iniciar. Si cambia mientras la cámara está activa, se reinicia automáticamente. |
| `autoIniciar` | Boolean | `false` | Pide permiso e inicia la cámara al montar. |
| `puedeIniciar` | Boolean | `true` | Habilita/deshabilita el botón de inicio. |
| `mostrarControles` | Boolean | `true` | Muestra la barra integrada con iniciar/detener y selector de cámara. |
| `mostrarSelector` | Boolean | `true` | Muestra el selector de cámara cuando hay más de un dispositivo. |
| `restricciones` | Object | `{ width: { ideal: 1280 }, height: { ideal: 720 } }` | `MediaTrackConstraints` de video que se pasan a `getUserMedia`. |
| `textoIniciar` | String | `'Iniciar cámara'` | Texto del botón de inicio. |
| `textoIniciando` | String | `'Iniciando...'` | Texto mientras se pide permiso. |
| `textoAyuda` | String | texto genérico de permisos | Texto de ayuda cuando la cámara está detenida. |
| `detecciones` | Array | `[]` | Bounding boxes a dibujar (ver formato abajo). |
| `anchoDetecciones` | Number | `0` | Ancho natural del frame en el que vienen las coordenadas. `0` usa el tamaño nativo del video. |
| `altoDetecciones` | Number | `0` | Alto natural del frame en el que vienen las coordenadas. `0` usa el tamaño nativo del video. |
| `mostrarDetecciones` | Boolean | `true` | Activa/desactiva dibujo de cajas sin desmontar el visor. |
| `opcionesDetecciones` | Object | `{}` | Opciones de dibujo: `{ grosor, fuente, mostrarEtiquetas, mostrarScore, colorTexto }`. |
| `maxLado` | Number | `480` | Lado máximo por defecto de `capturarFrame()`. |
| `calidad` | Number | `0.8` | Calidad JPEG por defecto de `capturarFrame()`. |
| `calidadFoto` | Number | `0.92` | Calidad JPEG por defecto de `capturarFoto()`. |

## Emits

| Evento | Payload | Descripción |
|---|---|---|
| `update:dispositivoId` | `String` | Nueva cámara seleccionada. |
| `iniciada` | `{ stream, dispositivoId }` | El stream quedó activo. |
| `detenida` | — | Se detuvo el stream (manual, cambio de cámara o desmontaje). |
| `error` | `{ codigo, mensaje, original }` | Error de permisos/dispositivo. `mensaje` ya viene traducido al español. |
| `video-listo` | `{ ancho, alto, anchoVisible, altoVisible }` | Metadatos del video disponibles. |
| `cambio-tamano` | `{ anchoCanvas, altoCanvas }` | Cambió el tamaño visible del canvas de overlay. |

## Slots

### `acciones`

Contenido extra dentro de la barra de controles. Scope:
`{ streaming, iniciando, iniciar, detener, capturarFrame, capturarFoto }`.

```vue
<GbWebcamViewer ...>
  <template #acciones="{ streaming }">
    <button v-if="streaming" @click="guardarFoto">Sacar foto</button>
  </template>
</GbWebcamViewer>
```

### `capa-extra`

Overlay adicional dentro del escenario del video. Scope:
`{ anchoVideo, altoVideo, anchoCanvas, altoCanvas }`. El contenedor ya es
`position: relative`, así que el contenido puede posicionarse de forma absoluta.

```vue
<template #capa-extra="{ anchoCanvas, altoCanvas }">
  <div class="mi-overlay" :style="{ width: anchoCanvas + 'px', height: altoCanvas + 'px' }">
    <!-- crosshair, scanlines, regiones de interés, etc. -->
  </div>
</template>
```

### `ayuda`

Reemplaza el texto de ayuda que se muestra cuando la cámara está detenida.

## Métodos expuestos (`ref`)

- `iniciar()` → `Promise<Boolean>`
- `detener()`
- `reiniciar()` → `Promise<Boolean>`
- `capturarFrame({ maxLado, calidad })` → `Promise<{ blob, width, height } | null>`
- `capturarFoto({ calidad })` → `Promise<Blob | null>`
- `dibujarDetecciones()` — fuerza un redibujo de la capa de cajas.
- `videoEl`, `canvasEl`, `stream`, `streaming`, `iniciando`, `dispositivos`, `dispositivoId`, `error`, `errorTexto`.

## Composable `useWebcam`

Para construir una UI propia sin el componente:

```js
import { useWebcam } from 'vue-greenborn-webcam-viewer'

const videoRef = ref(null)
const {
  streaming,
  iniciando,
  dispositivos,
  dispositivoId,
  error,
  errorTexto,
  iniciar,
  detener,
  reiniciar,
  enumerarDispositivos,
  capturarFrame,
  capturarFoto,
  limpiar,
} = useWebcam({
  autoIniciar: false,
  videoRef,
  restricciones: { width: { ideal: 1280 }, height: { ideal: 720 } },
})
```

`useWebcam` registra la limpieza del stream en `onBeforeUnmount`, `pagehide` y `beforeunload`.
Si se usa fuera de un componente, llamar a `limpiar()` manualmente.

## Formato de las detecciones

```js
{
  id: 3,                 // usado para el color estable de la caja
  name: 'patente',       // opcional
  score: 0.91,           // opcional
  p1: { x: 120, y: 80 }, // esquina superior izquierda
  p2: { x: 260, y: 180 } // esquina inferior derecha
}
```

Las coordenadas deben estar en el espacio natural del frame indicado por
`anchoDetecciones`/`altoDetecciones`. Si el consumidor envía a la API un frame escalado, lo
correcto es usar el ancho/alto del frame enviado (por ejemplo `meta.width`/`meta.height` de la
respuesta) para que las cajas queden alineadas.

## Notas

- La cámara requiere **localhost o HTTPS**.
- Al pedir un nuevo `getUserMedia` el paquete siempre detiene el stream anterior. Esto evita que
  algunas webcams UVC (especialmente en Linux) queden trabadas hasta reconectar el USB.
- El canvas de bounding boxes tiene `pointer-events: none`; para interacción usar el slot
  `capa-extra`.
- Sin dependencias runtime más allá de Vue.
