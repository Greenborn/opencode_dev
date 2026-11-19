// @greenborn/modelos-personajes - API pública.
//
// - configurar(referencias): el juego inyecta lo que el material necesita (COLOR_LUZ_CALIDA).
// - Geometría (Web Worker): construirMuneco, geometriasRigidas, serializarHumanoide, ...
// - Hilo principal: crearMuneco (esqueleto), animarCaminata, apuntarBrazo, materialUnido.
export * from './geometria/index.js';
export { crearMuneco, animarCaminata, apuntarBrazo } from './three/esqueleto.js';
export { materialUnido } from './three/materiales.js';
export const VERSION = '0.1.0';
