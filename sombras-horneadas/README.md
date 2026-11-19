# @greenborn/sombras-horneadas

Sombra del sol horneada para mapas voxel: por cada cara del mallado se calcula, una
sola vez, cuántos de los rayos del sol llegan libres (niveles `0..SUN_SAMPLES`). El
resultado viaja como atributo y el shader lo multiplica a la luz directa, así la malla
no necesita proyectar en el shadow map en tiempo real.

Módulo puro: sin three.js, sin DOM, sin dependencias. Pensado para correr en un
Web Worker de generación de chunks.

## Subrutas

- `@greenborn/sombras-horneadas` (`.`): API completa.
- `@greenborn/sombras-horneadas/modos`: reglas de los modos `baked` / `mixto` / `realtime`.
- `@greenborn/sombras-horneadas/rayos`: muestreo de sol, ocluyentes y constantes.

## Uso

```js
import {
  direccionDesdePosicion, nivelSolCara, ocluyenteEsfera, ocluyenteCilindro,
  SUN_RAY_MAX, SUN_SAMPLES,
} from '@greenborn/sombras-horneadas/rayos';

const SUN = direccionDesdePosicion(posicionSol);          // vector normalizado
const cfg = {
  bloqueo: (x, y, z) => sunBlocker(x, y, z),               // 1 tapa, 0 libre, -1 fuera de datos
  altoVolumen: volHeight,
  alcance: Math.min(SUN_RAY_MAX, chunkSize),
  ocluyentes: [ocluyenteCilindro({ x, z, r, y0, y1 }), ocluyenteEsfera({ x, y, z, r })],
  origenX: startX,
  origenZ: startZ,
};
const nivel = nivelSolCara(ex, ey, ez, eje, positivo, SUN, cfg); // 0..SUN_SAMPLES
```

- `eje`: 0 = x, 1 = y, 2 = z. `positivo`: sentido de la normal de la cara.
- `bloqueo` recibe coordenadas **locales** al volumen; `ocluyentes` van en **mundo**
  (por eso `origenX` / `origenZ`).
- Un sol casi cenital no proyecta desde cilindros verticales (comportamiento intencional).

### Modos de sombra

```js
import { modoSombraValido, solIncluyeEntidades, terrenoProyecta } from '@greenborn/sombras-horneadas/modos';
```

| Modo | Terreno | Árboles y postes |
|---|---|---|
| `baked` | horneado, incluye árboles y postes | no proyectan en tiempo real |
| `mixto` | horneado sólo con edificios | proyectan en tiempo real |
| `realtime` | proyecta en tiempo real | proyectan en tiempo real |

## Qué NO hace

El mallado (greedy merge, codificación de caras, emisión de rectángulos) y el mapeo de
entidades del juego a ocluyentes quedan en la aplicación: dependen del formato de
chunks y del catálogo de árboles y postes.

## Licencia

MIT.
