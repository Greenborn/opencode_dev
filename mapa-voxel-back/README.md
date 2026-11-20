# @greenborn/mapa-voxel-back

Generador de mapas voxel del lado del servidor: terreno, edificios (casas de
varios pisos, escaleras, ventanas, baños, armarios), vehículos, árboles y
postes, refugios subterráneos, nidos, tiendas, bases por modo de juego,
partición en chunks, luces e índice de salas.

Módulo puro: no depende de three.js ni del DOM, así que corre en Node y en un
`worker_thread` o Web Worker. Sólo usa `pngjs` (planos PNG, opcionales).

## Qué trae el paquete y qué aporta el consumidor

- **Del paquete**: los tipos de bloque (`BLOCK_TYPES`, `BLOCK_PROPERTIES`), las
  constantes del mundo (`WORLD_CONFIG`, `TERRAIN_CONFIG`, `CONFIG_GENERATION`),
  el generador completo y el formato de chunks compacto.
- **Plugins de datos (del consumidor)**: el contenido de juego que el
  generador necesita, registrado con `registrarPlugins`. Son los nombres de
  `ESQUEMA_PLUGINS` (`src/plugins/datos.js`):

| Plugin | Nombres que aporta |
|---|---|
| `arboles` | `elegirArbol(x, z)` |
| `autos` | `AUTOS`, `ORDEN_AUTOS`, `idEntidadAuto`, `PROPORCION_MOTOS` |
| `postes` | `ID_POSTE` |
| `lucesInteriores` | `ID_LUZ_INTERIOR` |
| `refugios` | `PROB_REFUGIO_PARCELA`, `MIN_REFUGIOS`, `INTENTOS_REFUGIO`, `REFUGIO`, `PROFUNDIDAD_REFUGIO`, `ejesRefugio`, `rotYHacia` |
| `armarios` | `ARMARIO` |
| `necesidades` | `sortearArmario`, `sortearCantidades` |
| `tiendas` | `TIENDAS_POR_MAPA`, `ROT_PUERTA`, `ALTO_GONDOLA` |
| `hordas` | `PROB_NIDO_PARCELA`, `INTENTOS_NIDO`, `RADIO_NIDO`, `DIST_MIN_BASE_NIDO`, `DIST_MIN_ENTRE_NIDOS`, `ESCALA_SUPERFICIE` |
| `equipos` | `COLORES_EQUIPO` |
| `configuracion` | `CONFIG` (p. ej. `lighting.point.distance`) |

Todos los plugins son obligatorios para `construirMapa`: si falta alguno lanza
un error que lista lo que falta (`pluginsFaltantes()`).

## Uso

```js
import {
    configurarMundo, registrarPlugins, construirMapa, buffersTransferibles,
} from '@greenborn/mapa-voxel-back';

configurarMundo({ factorSuperficie: 1, directorioMinimapas: './maps' });
registrarPlugins({
    arboles: { elegirArbol },
    autos: { AUTOS, ORDEN_AUTOS, idEntidadAuto, PROPORCION_MOTOS },
    // ...resto de plugins de la tabla
});

const mapa = construirMapa({ modo: 'zombies' }); // 'zombies' | 'equipos' | null
// Para enviar desde un worker sin copiar los buffers grandes:
// parentPort.postMessage({ mapa }, buffersTransferibles(mapa));
```

### `configurarMundo({ factorSuperficie, directorioMinimapas })`

- `factorSuperficie` (por defecto `1`): fracción de la superficie base. El lado
  del mapa se escala con su raíz cuadrada. Debe ser mayor que 0.
- `directorioMinimapas` (por defecto `null`): carpeta donde se escriben los PNG
  de los planos. Con `null` no se escribe ningún archivo.

Pensado para un worker por sala: cada `worker_thread` tiene su propia copia de
los módulos, así que el estado de configuración no se comparte entre salas.

### `construirMapa(opciones)`

Devuelve sólo datos clonables (sin funciones ni instancias de clase):
`heightMap`, `maxHeightMap`, `structures`, `startPosition`, `lights`, `chunks`,
`roomIndex`, `autos`, `minimapFile`, `zonasEspeciales`, `zonas`, `nidos`,
`refugios`, `tiendas` y `modo`.

- `modo`: `'zombies'` y `'equipos'` eligen bases por bando (casas ya generadas,
  nunca construcciones nuevas). Otro valor no agrega bases especiales.

## Determinismo

El generador usa `Math.random`. Para reproducir un mapa, sembrar
`Math.random` antes de llamar a `construirMapa` con un generador determinista.

## Tests

```bash
npm install
npm test
```

Los tests usan plugins falsos de `fixtures/plugins_falsos.js`: validan la API,
la configuración del mundo y que la generación sea determinista con la misma
semilla. No validan el contenido de juego real.

## Origen y pendientes

- Extraído de `server/generador_mapa/` del proyecto
  `Lab/test_3d_html5_multiplayer`. Con los mismos datos de juego y la misma
  semilla de `Math.random`, el mapa generado por el paquete es idéntico al de
  Lab (mismo hash de chunks, estructuras y entidades).
- Quedaron fuera del paquete, porque mantienen estado de partida o usan
  `workerData`: `mapGenerator.js`, `preparador_mapa.js`, `mapaWorker.js` y
  `zonasControl.js`. Son el glue de runtime que queda en Lab.
- `chunk_compacto.js` también lo usa el cliente del navegador. El paquete tiene
  su copia en `src/formato/`; el cliente mantiene la suya.
- Lab todavía no consume este paquete: sigue con su copia de
  `server/generador_mapa/`.

## Licencia

MIT
