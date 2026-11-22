# @greenborn/modelos-arboles

Modelos procedurales de trece especies de árbol para three.js (plátano, roble, fresno,
pino, ciprés, palmera, sauce, jacarandá, álamo, ceibo, abedul, naranjo y un árbol seco).

Está dividido en dos capas con dependencias en un solo sentido:

- **Núcleo** (`@greenborn/modelos-arboles`): especificación pura, sin three.js ni DOM.
  `especificarArbol(especie, { semilla, altoCuerpo })` devuelve las primitivas de cada
  acabado (cajas, cilindros, esferas, elipsoides, con color y transformación), el radio
  del tronco y el radio de colisión real. Es determinista: la misma semilla da siempre
  las mismas primitivas. Apto para Web Worker o Node.
- **Adaptador three.js** (`@greenborn/modelos-arboles/three`): convierte la especificación
  en `BufferGeometry` (una por acabado, cacheada), arma submallas para instancing y
  materiales. Recibe la instancia `THREE` como parámetro, como `@greenborn/mapa-voxel/three`.

## Uso

```js
import * as THREE from 'three';
import { ESPECIES, especificarArbol } from '@greenborn/modelos-arboles';
import { geometriaArbol, subMeshesArbol, crearModeloArbol } from '@greenborn/modelos-arboles/three';

const esp = especificarArbol('roble', { semilla: 1234, altoCuerpo: 4 });
esp.radioColision;          // radio real del fuste a la altura del cuerpo

const { partes, alto, radioTronco } = geometriaArbol(THREE, 'roble', { semilla: 1234 });
const submallas = subMeshesArbol(THREE, 'roble', { semilla: 1234, emisivo: 0 });
const arbol = crearModeloArbol(THREE, 'roble', { semilla: 1234, sombras: true });
```

Las semillas y el alto del cuerpo los pasa quien usa el paquete (el juego las toma de su
catálogo). El paquete no conoce el catálogo ni el mapa.

## Geometría optimizada (0.2.0)

`geometriaArbol` entrega la mínima cantidad de vértices sin cambiar lo que se ve:

- **Sin `uv`**: los materiales del arbolado no usan texturas; la uv distinta por cara impedía compartir vértices.
- **Vértices compartidos** (`mergeVertices`): se unen los que tienen posición, normal y color idénticos.
- **Triángulos ocultos fuera** (`quitarOcultos`, `true` por defecto): se descartan los triángulos que quedan
  enteros dentro de otra pieza convexa y cerrada del mismo árbol (la punta del tronco dentro de la copa, esferas
  de copa solapadas). Los materiales son opacos, así que desde afuera no se ven; sólo se notaría con la cámara
  metida dentro de una pieza. Pasar `{ quitarOcultos: false }` para conservarlos.

Medido sobre las 13 especies x 3 semillas: 65.751 → 32.928 vértices (−50 %) y 47.136 → 34.653 triángulos (−26 %).
Sin `quitarOcultos`: 42.696 vértices (−35 %), mismos triángulos.

Cambio de API: las geometrías ya no tienen el atributo `uv`. Si un acabado queda entero dentro de otras piezas,
no aparece en `partes`.

## Acabados

`ACABADO.CORTEZA` (0), `ACABADO.HOJA` (1), `ACABADO.FLOR` (2). `materialesArbol(THREE, emisivo)`
devuelve un material por acabado. La emisión por defecto es 0 a propósito: un árbol en
sombra debe verse como silueta.

## Pruebas

```bash
npm test
```

Las pruebas del núcleo y del adaptador three.js (`three` como devDependency) corren en Node sin navegador. La verificación contra el juego
(`scripts/test_arboles.js` en `Lab/test_3d_html5_multiplayer`) comprueba la geometría,
el instancing y la colisión con las especies reales.

## Integración con el mapa voxel

`@greenborn/mapa-voxel` mallado sólo bloques. Los árboles son entidades: el mapa
reserva el parterre y el paquete aporta la geometría. El núcleo no tiene dependencias,
así que se puede ejecutar dentro del mismo Web Worker que el mallador voxel.

## Licencia

MIT
