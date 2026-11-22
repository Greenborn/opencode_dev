# @greenborn/accesorios-personaje

Accesorios del personaje voxel: **gorra**, **sombrero**, **lentes** y **canasta para vender**.
Se integra con `@greenborn/modelos-personajes` (`crearPersonajeVoxel`, `personajeAleatorio`) y con el
constructor de `vendedores_capital`.
## Instalación

```bash
npm install @greenborn/accesorios-personaje@^0.3.0
```

Requiere `@greenborn/modelos-personajes` (>=0.8.0 <1.0.0; usa `geometriaVoxel`) y `three` (>=0.170.0) como peer.

## Slots y valores de la cfg

| Campo cfg | Valores | Qué hace |
|---|---|---|
| `cabeza` | 0 ninguno, 1 gorra, 2 sombrero | Va en el pivote del cuerpo. |
| `cabezaColor` | índice en `COLORES_ACCESORIO` | Color de gorra o sombrero. |
| `lentes` | 0 sin lentes, 1 lentes | Aros 4×4 delante de los ojos. |
| `mano` | 0 vacía, 1 canasta | Canasta en la mano derecha (pivote `armB`, se mueve con el brazo). |
| `semillaCanasta` | entero | Fija la canasta: mismo número, misma mercancía. |

`ACCESORIOS_DEFECTO` tiene todos en 0. `normalizarAccesorios(cfg)` lleva los valores fuera de rango a 0.

## Uso

```js
import { crearPersonajeVoxel } from '@greenborn/modelos-personajes/three';
import { adjuntarAccesorios, personajeConAccesorios } from '@greenborn/accesorios-personaje';

const cfg = personajeConAccesorios();            // cuerpo + accesorios al azar
const personaje = adjuntarAccesorios(crearPersonajeVoxel(cfg), cfg);   // { group, partes }
```

## Capas

- `src/catalogo.js`: opciones, colores, mercancía y normalización. Lógica pura.
- `src/voxeles.js`: voxels de cada accesorio, en el mismo espacio que `voxelesPersonaje`. Lógica pura.
- `src/aleatorio.js`: `generarCanasta(rnd)`, `accesoriosAleatorios(rnd)`, `personajeConAccesorios(rnd)`. Usa el mismo `rnd` que `personajeAleatorio`.
- `src/three.js`: geometría three.js (cubos fusionados con el mismo acabado que el cuerpo) y enganche a `partes.body` / `partes.armB`.

## Geometría (0.3.0)

Cada parte (cuerpo y brazo derecho) es una sola malla con greedy meshing (`geometriaVoxel` de
`@greenborn/modelos-personajes` >= 0.8.0): sólo las caras expuestas, las caras contiguas del mismo color
fundidas y vértices indexados. El aspecto es el mismo que un cubo por voxel (mismos atributos, color por
cara, silueta y límites; lo verifica `test/geometria.test.js` comparando el área visible por normal y color).

| Accesorios | Vértices 0.2.0 | Vértices 0.3.0 | Triángulos 0.2.0 | Triángulos 0.3.0 |
|---|---|---|---|---|
| Canasta | 5.760 | 495 | 2.880 | 354 |
| Gorra + lentes + canasta | 10.080 | 615 | 5.040 | 420 |
| Sombrero + lentes + canasta | 12.192 | 632 | 6.096 | 430 |

## Limitaciones conocidas

- El sombrero sube la altura visible del personaje (copa hasta z 37 contra 36 del cuerpo). `ALTO_VOXEL` no cambia.
- Con peinado "Rulos" el sombrero y el peinado se pisan un poco en la capa z 34.
- Con peinado "Gorra" (integrada) el accesorio gorra no se dibuja, para no duplicarla.
- Los peatones no llevan accesorios: usan `piezasVoxelRigidas` sin accesorios.
- Los lentes no tienen patillas (se apoyan delante de la cara).

## Pruebas

```bash
npm test
```

Las pruebas cubren la lógica pura (voxels, canasta determinista, normalización). La geometría three.js se probó aparte con Node.
