// Punto de entrada del paquete @greenborn/mapa-voxel (núcleo sin three.js).
// Para three.js: `import { crearMallaLado, cacheDeMateriales } from '@greenborn/mapa-voxel/three'`.
// Para el worker: `new URL('@greenborn/mapa-voxel/worker', ...)` (ver README).

export { MapaVoxel } from './mapa.js';
export { mallarChunk } from './mallador.js';
export { combinarLado } from './combinar.js';
export { crearPoolMallado } from './worker/pool.js';
export { codificar, decodificar, cuantizar, NIVELES, BITS_TIPO, BITS_SOL, BITS_LUZ, BITS_TINTE, MAX_TINTES } from './codigos.js';
