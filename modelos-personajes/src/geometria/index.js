// Subruta `@greenborn/modelos-personajes/geometria`: geometría y transporte.
// Sin materiales ni DOM: apta para un Web Worker.
export { configurar, ref } from './contexto.js';
export {
    BASE_MODELO, TOPE_MODELO, ALTO_MODELO, escalaParaAlto, offsetPies,
    HUESOS, REPOSO, IDX_HUESO, PADRE_HUESO, INVERSAS_HUESO,
    construirMuneco, geometriasRigidas, poseCaminataRigida,
    claveHumanoide, calcularHumanoide, sembrarHumanoide
} from './humanoide.js';
export { ConstructorPiezas } from './constructor_piezas.js';
export {
    serializarGeometria, reconstruirGeometria, serializarHumanoide, reconstruirHumanoide
} from './serializar.js';
// Personaje voxel (estilo cubos) y personajes aleatorios.
export { voxelesPersonaje, serializarVoxeles, reconstruirVoxeles, PIEL_DEFECTO, PEINADOS, COLORES_PELO, COLORES_REMERA, COLORES_PANTALON, COLORES_CALZADO, COLOR_GORRA, COLOR_UNIFORME_POLICIA, COLOR_PANTALON_POLICIA, COLOR_PLACA_POLICIA } from './voxel.js';
export { CATALOGO_PERSONAJE, NOMBRES, PIELES_NATURALES, personajeAleatorio, personajePolicia, personajeAleatorioConPolicia, personajeDesdeSemilla, generadorSembrado, normalizarPersonaje } from './aleatorio.js';
export { tint, mezclar, luz } from './color.js';
export {
    PARTES_VOXEL, ALTO_VOXEL, rigVoxel, parteDeVoxel, marcoVoxel, posModeloVoxel, pivotesVoxel,
    angulosVoxelCaminata, escalaVoxelParaAlto, claveVoxel,
} from './voxel_rig.js';
export { mallaVoxelGreedy } from './voxel_malla.js';
