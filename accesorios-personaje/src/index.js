// @greenborn/accesorios-personaje: accesorios del personaje voxel (gorra, sombrero, lentes y canasta para vender).
//
// Subrutas:
//   raíz (index.js): API pública.
//   ./catalogo, ./voxeles, ./aleatorio: lógica pura (sin three.js).
//   ./three: geometría three.js y enganche con el personaje de @greenborn/modelos-personajes.
export {
    CATALOGO_ACCESORIOS, COLORES_ACCESORIO, COLOR_MONTURA, COLOR_LENTE, COLOR_CINTA,
    MERCANCIA, TEJIDOS_CANASTA, ACCESORIOS_DEFECTO, normalizarAccesorios,
} from './catalogo.js';
export { voxelesAccesorios } from './voxeles.js';
export { generarCanasta, accesoriosAleatorios, personajeConAccesorios } from './aleatorio.js';
export { adjuntarAccesorios } from './three.js';
