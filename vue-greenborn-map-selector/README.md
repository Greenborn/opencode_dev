# vue-greenborn-map-selector

Selector de ubicación en mapa (Leaflet) para Vue 3, integrado con
[vue-greenborn-modal-manager](https://www.npmjs.com/package/vue-greenborn-modal-manager).

Abre un modal con un mapa interactivo que se **apila correctamente sobre cualquier
otro modal abierto** por el gestor genérico (mismo sistema de capas / z-index), lo
que resuelve el clásico problema de pickers de mapa que quedan por debajo de otros
modales.

## Características

- Mapa Leaflet + tiles OpenStreetMap (URL de tiles configurable).
- Click para colocar el marcador, arrastrable para ajustar.
- Coordenadas iniciales opcionales (`initialLat` / `initialLng`).
- Devolución del resultado vía callback `onSelect({ lat, lng })` (Strings).
- Se cierra con `ocultar_modal()` del gestor (botón Cerrar, "Usar ubicación" o overlay).
- `invalidateSize()` automático tras la transición del modal.
- CSS de Leaflet incluido en el `style.css` del paquete.

## Requisitos

- Vue `^3.3.0`
- `vue-greenborn-modal-manager` `^1.5.0` instalado y con `<ModalContainer />`
  montado en la app (peer dependency: **debe** ser la misma instancia de módulo
  que usa tu app para compartir la pila de modales).
- Bootstrap classes (btn, alert) usadas en los botones; funciona sin Bootstrap
  pero con estilos planos.

## Instalación

```bash
npm install vue-greenborn-map-selector
```

`leaflet` se instala como dependencia del paquete. `vue` y
`vue-greenborn-modal-manager` deben estar presentes en tu proyecto (peers).

## Uso

### 1. Importar el CSS (una vez, en tu entry point)

```js
import 'vue-greenborn-map-selector/style.css'
```

### 2. Usar el composable

```vue
<script setup>
import { useMapSelector } from 'vue-greenborn-map-selector'

const { abrir } = useMapSelector()

const openMap = () => {
  abrir({
    initialLat: form.ubicacion_latitud,   // opcional
    initialLng: form.ubicacion_longitud,  // opcional
    onSelect: ({ lat, lng }) => {
      form.ubicacion_latitud = lat
      form.ubicacion_longitud = lng
    }
  })
}
</script>
```

`abrir()` acepta:

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `initialLat` | String/Number | `null` | Latitud inicial |
| `initialLng` | String/Number | `null` | Longitud inicial |
| `onSelect` | Function | `null` | Callback `({ lat, lng })` al confirmar |
| `titulo` | String | `'Seleccionar ubicación'` | Título del modal |
| `size` | String | `'lg'` | `'sm' \| 'md' \| 'lg' \| 'full'` |
| `tileUrl` | String | OpenStreetMap | URL de tiles Leaflet |
| `config` | Object | `{}` | Config extra del modal manager |

Devuelve `{ code, cerrar }` para cerrarlo programáticamente.

### 3. Alternativa: componente directo

```js
import { MapSelectorModal } from 'vue-greenborn-map-selector'
import { useModal } from 'vue-greenborn-modal-manager'

const { mostrar_modal } = useModal()
mostrar_modal(MapSelectorModal, 'Seleccionar ubicación', {
  initialLat: null,
  initialLng: null,
  onSelect: ({ lat, lng }) => { /* ... */ }
}, { size: 'lg' })
```

> El resultado se comunica vía `onSelect` en `parametros` (los `emit()` del
> componente no son escuchados por el gestor, que renderiza el componente sin
> listeners).

## Demo local

```bash
npm install
npm run dev
```

## Licencia

MIT
