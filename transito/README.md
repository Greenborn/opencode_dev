# @greenborn/transito

Red vial y simulación de tránsito para mapas en grilla de celdas. Módulo puro (sin three.js
ni DOM, sin dependencias): decide posición, rumbo y tipo de cada vehículo. Quien dibuja es el mapa.

## Uso

```js
import { crearRed, crearTransito } from '@greenborn/transito';

// grilla: { N, C } (formato del mapa: C[j * N + i].t) o { ancho, alto, tipo(i, j) }
const red = crearRed({ N: 600, C: city.C }, { metrosPorCelda: 5 });
const sim = crearTransito(red, { objetivo: 300, capacidad: 800, semilla: 42 });

// Cada frame:
sim.paso(dt);
const { x, z, h, tipo, activo } = sim.vista;   // arrays por slot
// x, z: centro del carril en coordenadas de celda (celda (i, j) está en (i + 0.5, j + 0.5))
// h: rumbo en radianes, atan2(dz, dx)
// tipo: índice en sim.vista.nombres (auto, taxi, pickup, furgon, bus, camion, moto)
// activo: 1 si el slot tiene un vehículo
```

El mapa puede escribir matrices recorriendo `sim.vehiculos()`, que entrega `{id, tipo, x, z, h, activo}`
por slot (objeto reutilizado entre iteraciones; no guardarlo).

## API pública

### `crearRed(grilla, opciones?) -> red`

Calcula una sola vez los carriles, los sentidos y las conexiones de los cruces.

Opciones (valores por defecto):

- `tipoCalzada` (`['road', 'median']`): tipos transitables.
- `tipoMediana` (`'median'`): tipo que separa sentidos. No se transita, salvo en un cruce.
- `anchoMaximoCalle` (`40`): en celdas. Una banda que supera este largo en X y en Z es un cruce.
- `metrosPorCelda` (`5`).
- `offsetLateralM` (`0`): desplazamiento del carril a la derecha del sentido de marcha.
- `pesoRecto` (`3`), `pesoGiro` (`1`): pesos para elegir seguir o doblar en un cruce.
- `limitesMS` (`{ avenida: 16.7, calle: 8.3, giro: 4.2 }`): velocidad máxima por tipo de vía.

La red expone `carriles` (cada uno con `xs`, `zs`, `cum` en metros, `largo`, `limite`, `dirX`, `dirZ`,
`tipo` ∈ `calle | avenida | giro`, `sucesores`, `predecesores`, `distSalida`), `entradas`,
`numCruces`, `jId` (cruce por celda) y `estadisticas`.

### `crearTransito(red, opciones?) -> sim`

Opciones (valores por defecto):

- `capacidad` (`800`): slots del pool.
- `objetivo` (`150`): vehículos activos que se intenta mantener. Es también un setter.
- `tasaEntrada` (`0.5`): entradas por segundo como máximo.
- `semilla` (`1`): PRNG determinista (mulberry32).
- `tipos` (`TIPOS_VEHICULO`): `{ nombre: { largo, vMax, peso, a?, b?, T?, s0? } }`, en metros y m/s.
- `vidaMax` (`240`): s. Pasado este tiempo, al elegir cruce se prefiere la salida más corta.
- `subpasoMax` (`0.05`): s. Un `paso(dt)` grande se divide en subpasos.
- `umbralFrenadoM` (`40`): distancia al cruce desde la que se pide reserva.
- `separacionEntradaM` (`1`): distancia mínima para entrar a un carril detrás del último vehículo.
- `pesoEntrada(carril)`: peso de cada entrada (por defecto, las avenidas reciben el doble).

Métodos:

| Método | Descripción |
|---|---|
| `paso(dt)` | Avanza la simulación `dt` segundos y actualiza `vista`. |
| `crearVehiculo(tipoNombre?)` | Crea un vehículo en una entrada. Devuelve el id (slot) o `-1`. |
| `eliminar(id)` | Quita un vehículo activo. Libera sus celdas reservadas. |
| `vehiculos({ soloActivos }?)` | Iterable de `{id, tipo, x, z, h, activo}` (objeto reutilizado). |
| `vista` | `{ capacidad, nombres, x, z, h, tipo, activo }` (typed arrays por slot). |
| `activos()`, `tiempo()` | Cantidad de vehículos activos y tiempo simulado. |
| `objetivo` | Getter/setter de la densidad objetivo. |
| `estado(id)`, `carrilDe(id)`, `vecinoDeAdelante(id)` | Depuración y pruebas. |

`TIPOS_VEHICULO` usa los mismos nombres que `VEH_TIPOS` del mapa (`auto`, `taxi`, `pickup`, `furgon`,
`bus`, `camion`, `moto`). El paquete no importa `@greenborn/modelos-vehiculos`: ese paquete depende de
three.js para construir la geometría, y el tránsito debe quedar libre de three.js.

## Modelo

- **Carriles**: cada celda de calzada con sentido es un carril de una celda de ancho. Se agrupan en
  cadenas contiguas con el mismo sentido. El sentido sale de la mano derecha: en cada banda (fila o columna)
  se parte por la mediana (o por el centro si no hay mediana). El lado de mayor coordenada circula
  según la regla (a la derecha del sentido es `(-dz, dx)`). La fila o columna central no tiene tránsito.
- **Cruces**: las celdas con corridas largas en X y en Z son intersecciones. Un carril que llega a un cruce
  se conecta con cada carril de salida alcanzable por BFS sin vuelta en U. Cada conexión es un carril
  `giro` con polilínea precalculada.
- **Entradas y salidas**: las entradas son los carriles sin predecesor. Una salida es un carril sin sucesor.
  Al llegar al final de una salida, el vehículo se elimina.

## Espaciado y prioridad

- **Mismo carril**: car-following IDM (Treiber) contra el vehículo de adelante. Como garantía dura, la
  posición se limita a `s_líder - (largo_líder + largo)/2`, así que dos vehículos del mismo carril nunca se
  superponen. Los tests lo verifican.
- **Cruces**: cada giro reserva todas sus celdas de cruce antes de entrar. La reserva es todo o nada, así
  no hay interbloqueo por espera parcial. Si la reserva no se concede, el vehículo se frena en la línea de
  parada (frenado virtual). La cola de cada cruce se ordena por llegada. Si dos llegan con menos de 0,5 s
  de diferencia, tiene prioridad quien viene por la derecha. Un vehículo bloqueado impide que pasen los
  que comparten celdas con él (FIFO también para los conflictos).
- **Entrada a un carril**: no se entra si el último vehículo del carril está a menos de
  `separacionEntradaM` del inicio. Si no, el vehículo espera en el final del carril anterior.
- No hay semáforos ni cambios de carril en esta versión.

## Complejidad

- `crearRed`: O(N) para clasificar y asignar sentidos (N = celdas de la grilla), más
  O(carriles × cruce) para las conexiones con BFS. Se ejecuta una vez.
- `paso(dt)`: O(C) por subpaso, donde C es la capacidad del pool. Cada vehículo se busca a sí mismo y a su
  vecino de adelante en O(1) mediante listas intrusivas por carril. No hay O(n²) sobre todos los vehículos.
  Las reservas usan colas por cruce, de tamaño pequeño.
- Memoria: typed arrays de tamaño C, más un `Int32Array` por celda para las reservas.
- Sin allocaciones por frame: el pool se reutiliza, la vista y el iterador reutilizan sus objetos.
- Medido (Node 24, grilla 300×300, 1210 carriles, 10436 giros, 474 vehículos activos): ~0,12 ms por `paso(0.1)`.

## Tests

```sh
npm test
```

Con `node --test` se verifican: sentidos por mano derecha, conexiones de cruce, no superposición en un mismo
carril, rumbo acorde al carril, densidad mantenida cerca del objetivo, no dos vehículos en la misma celda de
cruce y determinismo con la misma semilla.

## Limitaciones

- La coordenada de celda es `(i + 0.5, j + 0.5)`. El mapa debe alinear esa convención con su escena.
- Las entradas son sólo los bordes de la red sin predecesor. Si la red es cerrada, no hay entradas nuevas y
  el paquete usa todos los carriles rectos como fuente.
- Una calle de una sola celda de ancho sin mediana no tiene tránsito (la fila central no tiene sentido).
- Sin semáforos, sin cambios de carril y sin peatones.

## Licencia

MIT.
