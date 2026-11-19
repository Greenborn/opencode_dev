# @greenborn/modelos-personajes

Modelo visual del muñeco voxel articulado para three.js: el mismo cuerpo sirve a
jugadores, bots, zombies y tenderos. Cada hueso se arma con cajas, cilindros y
esferas (casco, chaleco, mochila, botas...), se funde por hueso y se entrega como
una malla con esqueleto (skinning rígido) o como una geometría rígida por hueso
(para instancing y cadáveres).

## Subrutas

- `@greenborn/modelos-personajes` (`.`): API completa.
- `@greenborn/modelos-personajes/geometria`: geometría y transporte serializado.
  Sin materiales ni DOM; apta para un Web Worker.
- `@greenborn/modelos-personajes/three`: esqueleto (`crearMuneco`), poses
  (`animarCaminata`, `apuntarBrazo`) y material (`materialUnido`).

## Uso

```js
import { configurar } from '@greenborn/modelos-personajes/geometria';
import { crearMuneco, animarCaminata } from '@greenborn/modelos-personajes/three';

// Una vez, al arrancar: el material necesita el color de la luz horneada.
configurar({ COLOR_LUZ_CALIDA: [1.0, 0.86, 0.62] });

// Hilo principal: el muñeco con su esqueleto (una malla, un draw call).
const { group, partes } = crearMuneco({ colores: { cuerpo: 0xd03030, piernas: 0x601818 } });
animarCaminata(partes, fase, 1);

// Worker: construir y devolver typed arrays transferibles.
const { datos, transferibles } = serializarHumanoide({ cuerpo: 0x2e4a1a });
postMessage({ datos }, transferibles);

// Hilo principal: sembrar la caché con lo que llegó del worker.
sembrarHumanoide(colores, reconstruirHumanoide(datos));
```

`colores` acepta `piel`, `cuerpo`, `piernas` y `ojos`, y cualquier color derivado de
la paleta (`chaleco`, `casco`, `bota`...). Lo que no se pasa toma un valor por defecto.

## Requisitos

- `three` como peer dependency (`>=0.170.0`). El material usa `MeshStandardNodeMaterial`
  y `three/tsl`, así que hace falta la build WebGPU (`three.webgpu.js`) como `three`.

## Licencia

MIT.
