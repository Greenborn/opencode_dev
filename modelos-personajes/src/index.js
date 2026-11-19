// @greenborn/modelos-personajes - API pública.
//
// - configurar(referencias): el juego inyecta lo que el material necesita (COLOR_LUZ_CALIDA).
// - Geometría (Web Worker): construirMuneco, geometriasRigidas, serializarHumanoide, personaje voxel, aleatorios.
// - Animación pura (Worker o hilo principal): avanzarFase, poseMuerte, poseCadaver, estadoDe...
// - Hilo principal: crearMuneco (esqueleto), animarCaminata, apuntarBrazo, materialUnido,
//   PoolInstanciado y las matrices de instancias/cadáveres.
export * from './geometria/index.js';
export * from './animacion/poses.js';
export { crearMuneco, animarCaminata, apuntarBrazo } from './three/esqueleto.js';
export { materialUnido } from './three/materiales.js';
export { crearPersonajeVoxel, animarCaminataVoxel, piezasVoxelRigidas, matrizParteVoxel, matricesVoxelInstancia } from './three/voxel.js';
export { PoolInstanciado } from './three/pool.js';
export {
    aplicarMuerte, aplicarInclinacion, aplicarAgachado,
    matrizHuesoInstancia, matrizRaizInstancia, matrizGrupoInstancia, matrizCadaver,
    geometriaCadaverFusionada,
} from './three/animacion.js';
export const VERSION = '0.4.0';
