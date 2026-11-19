// Subruta `@greenborn/modelos-personajes/three`: hilo principal (three.js).
export { crearMuneco, animarCaminata, apuntarBrazo } from './esqueleto.js';
export { materialUnido } from './materiales.js';
export { PoolInstanciado } from './pool.js';
export {
    aplicarMuerte, aplicarInclinacion, aplicarAgachado,
    matrizHuesoInstancia, matrizRaizInstancia, matrizGrupoInstancia, matrizCadaver,
    geometriaCadaverFusionada,
} from './animacion.js';
