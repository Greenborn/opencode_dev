# vue-greenborn-map-viewer

Visor de mapa interactivo para Vue 3 basado en Leaflet que permite mostrar múltiples puntos (marcadores) en un mapa. Ideal para visualizar ubicaciones de profesionales, servicios, recursos o cualquier otro tipo de datos geoespaciales.

## Características

- ✅ Soporte para múltiples puntos/marcadores
- ✅ Marcadores personalizables (color, tamaño, etc.)
- ✅ Popups informativos para cada punto
- ✅ Emisión de eventos al hacer clic en un punto
- ✅ Ajuste automático de vista a los puntos disponibles
- ✅ Basado en Leaflet + OpenStreetMap
- ✅ Completamente responsivo
- ✅ Accesibilidad (ARIA labels, atributos semánticos)

## Instalación

```bash
npm install vue-greenborn-map-viewer
```

## Uso Básico

```vue
<template>
  <MapViewerComponent
    :puntos="profesionales"
    :centro="[-37.3186, -59.1341]"
    :zoom="13"
    @punto-click="manejarClickPunto"
  />
</template>

<script setup>
import { MapViewerComponent } from 'vue-greenborn-map-viewer'
import 'vue-greenborn-map-viewer/style.css'

const profesionales = [
  {
    id: 1,
    lat: -37.3186,
    lng: -59.1341,
    nombre: 'Dr. García',
    subtitulo: 'Médico General',
    descripcion: 'Av. 9 de Julio 1234, Tandil',
    popup: true
  },
  {
    id: 2,
    lat: -37.3200,
    lng: -59.1350,
    nombre: 'Dra. López',
    subtitulo: 'Dentista',
    descripcion: 'Calle 25 de Mayo 567, Tandil',
    popup: true
  }
]

const manejarClickPunto = (punto) => {
  console.log('Punto seleccionado:', punto)
}
</script>
```

## Props

### Datos
- **`puntos`** (Array) - Array de objetos con los puntos a mostrar. Cada objeto debe tener:
  - `id` (Number) - Identificador único del punto
  - `lat` (Number) - Latitud
  - `lng` (Number) - Longitud
  - `nombre` (String, opcional) - Nombre del punto
  - `subtitulo` (String, opcional) - Subtítulo o categoría
  - `descripcion` (String, opcional) - Descripción adicional
  - `popup` (Boolean, opcional) - Si mostrar popup al hacer clic

### Configuración del Mapa
- **`centro`** (Array) - Coordenadas [lat, lng] del centro inicial. Por defecto: `[-37.3186, -59.1341]` (Tandil)
- **`zoom`** (Number) - Nivel de zoom inicial. Por defecto: `13`
- **`altura`** (String) - Altura del mapa en CSS. Por defecto: `'420px'`
- **`tileUrl`** (String) - URL del proveedor de tiles de OpenStreetMap. Por defecto: `'https://tile.openstreetmap.org/{z}/{x}/{y}.png'`

### Personalización Visual
- **`colorPunto`** (String) - Color de los marcadores. Por defecto: `'#0d6efd'` (azul)
- **`radioPunto`** (Number) - Radio del marcador en píxeles. Por defecto: `8`
- **`mostrarResumen`** (Boolean) - Mostrar texto con cantidad de puntos. Por defecto: `true`

### Estados
- **`cargando`** (Boolean) - Indica si se están cargando los datos. Por defecto: `false`
- **`error`** (String) - Mensaje de error a mostrar. Por defecto: `''`

### Mensajes Personalizados
- **`labelAccesibilidad`** (String) - Etiqueta ARIA para accesibilidad. Por defecto: `'Mapa interactivo con múltiples puntos'`
- **`mensajeCargando`** (String) - Mensaje mientras carga. Por defecto: `''`
- **`mensajeSinPuntos`** (String) - Mensaje cuando no hay puntos. Por defecto: `''`

## Events

### `punto-click`
Se emite cuando el usuario hace clic en un punto del mapa.
```javascript
@punto-click="(punto) => console.log('Punto:', punto)"
```

### `mapa-listo`
Se emite cuando el mapa ha sido inicializado correctamente.
```javascript
@mapa-listo="() => console.log('Mapa inicializado')"
```

## Métodos Públicos (via ref)

### `resaltarPunto(puntoId)`
Abre el popup de un punto específico.
```vue
<MapViewerComponent ref="mapRef" :puntos="puntos" />
```
```javascript
this.$refs.mapRef.resaltarPunto(1)
```

### `quitarResaltePunto(puntoId)`
Cierra el popup de un punto específico.
```javascript
this.$refs.mapRef.quitarResaltePunto(1)
```

## Ejemplo Completo

```vue
<template>
  <div class="container mt-4">
    <h1>Mapa de Profesionales</h1>
    <MapViewerComponent
      ref="mapa"
      :puntos="profesionales"
      :centro="[-37.3186, -59.1341]"
      :zoom="13"
      altura="600px"
      :cargando="cargando"
      :error="error"
      @punto-click="seleccionarProfesional"
      @mapa-listo="onMapReady"
    />
    
    <div v-if="seleccionado" class="mt-3 card">
      <div class="card-body">
        <h5>{{ seleccionado.nombre }}</h5>
        <p>{{ seleccionado.descripcion }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { MapViewerComponent } from 'vue-greenborn-map-viewer'
import 'vue-greenborn-map-viewer/style.css'

const mapa = ref(null)
const profesionales = ref([])
const cargando = ref(false)
const error = ref('')
const seleccionado = ref(null)

const cargarProfesionales = async () => {
  cargando.value = true
  try {
    // Aquí iría la llamada a tu API
    profesionales.value = [
      {
        id: 1,
        lat: -37.3186,
        lng: -59.1341,
        nombre: 'Dr. García',
        subtitulo: 'Médico General',
        descripcion: 'Teléfono: 2494123456',
        popup: true
      }
    ]
  } catch (err) {
    error.value = 'Error al cargar los profesionales'
  } finally {
    cargando.value = false
  }
}

const seleccionarProfesional = (profesional) => {
  seleccionado.value = profesional
}

const onMapReady = () => {
  console.log('Mapa inicializado')
}

onMounted(() => {
  cargarProfesionales()
})
</script>
```

## Licencia

MIT

## Autor

2012lucho (lucho.2012.tandil@gmail.com)
