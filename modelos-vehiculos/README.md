# @greenborn/modelos-vehiculos

Modelos visuales procedurales de vehículos para three.js: autos, pickups, furgones,
buses, camiones, motos y drones. Cada modelo se arma con cajas, cuñas, cilindros y
toros, se funde en una BufferGeometry por material y se entrega como sub-mallas.

## Subrutas

- `@greenborn/modelos-vehiculos` (`.`): API completa.
- `@greenborn/modelos-vehiculos/geometria`: construcción y transporte serializado.
  Sin materiales, apta para un Web Worker (three.js no necesita DOM).
- `@greenborn/modelos-vehiculos/three`: materiales compartidos y `subMeshes`.

## Uso

```js
import { configurar, construirPartes, serializarPartes, reconstruirPartes } from '@greenborn/modelos-vehiculos/geometria';
import { subMeshes } from '@greenborn/modelos-vehiculos/three';

// Una vez, al arrancar: el juego inyecta sus medidas y asientos.
configurar({ LUZ_SUELO, ALTO_CAJA_CAMION, cabinaAuto, ojoAuto, asientoAuto });

// En un worker: construir y devolver typed arrays transferibles.
const { datos, transferibles } = serializarPartes(construirPartes(definicion));
postMessage({ datos }, transferibles);

// En el hilo principal:
const partes = reconstruirPartes(datos);
subMeshes(partes).forEach(({ geometry, material }) => malla.add(new THREE.Mesh(geometry, material)));
```

La definición del vehículo (`forma`, `largo`, `ancho`, `cuerpo`, `cabina`, `c0`, `c1`,
`color`, `color2`, `extra`, `estilo`) se pasa por parámetro: el paquete no conoce el
catálogo del juego.

## Requisitos

- `three` como peer dependency (`>=0.150.0`).

## Licencia

MIT.
