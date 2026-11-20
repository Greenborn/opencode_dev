// index.js - Punto de entrada de @greenborn/modelos-arboles (núcleo sin three.js).
//
//   import { ESPECIES, especificarArbol } from '@greenborn/modelos-arboles';
//   import { geometriaArbol, subMeshesArbol } from '@greenborn/modelos-arboles/three';
//
// El núcleo es función pura y determinista: apto para Web Worker o para Node.
// Los presupuestos del juego (radio del tronco, radio de colisión) se consultan
// sobre el resultado; las semillas y el alto del cuerpo los pasa el juego.

export {
    ESPECIES,
    especificarArbol,
    ALTO_CUERPO_POR_DEFECTO
} from './especies.js';
export { ConstructorPiezas } from './constructor.js';
export { rngSemilla } from './rng.js';
export { Vec3 } from './vec.js';
