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
