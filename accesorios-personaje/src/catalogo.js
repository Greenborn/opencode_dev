// Catálogo de accesorios del personaje voxel. Lógica pura, sin three.js ni DOM.
//
// Cada accesorio es una opción de un "slot" (cabeza, lentes, mano). La cfg guarda índices
// (igual que pelo, remera, etc. del paquete de personajes), así el constructor los muestra
// como chips y el generador los sortea con el mismo mecanismo.

/** Opciones por slot. El índice es el valor guardado en la cfg. */
export const CATALOGO_ACCESORIOS = Object.freeze({
    cabeza: Object.freeze(['ninguno', 'gorra', 'sombrero']),
    lentes: Object.freeze(['sin lentes', 'lentes']),
    mano: Object.freeze(['vacía', 'canasta']),
});

/** Colores de gorra y sombrero (índice = cabezaColor). */
export const COLORES_ACCESORIO = Object.freeze([
    '#2b2d42', '#c92a2a', '#1c7ed6', '#2f9e44', '#f1f3f5', '#8b5a2b', '#f59f00', '#343a40',
]);

/** Color de la montura de los lentes y del aro del sombrero. */
export const COLOR_MONTURA = '#1a1a1a';
export const COLOR_LENTE = '#9fd8ff';
export const COLOR_CINTA = '#d4a017';

/** Tipos de mercancía que puede llevar la canasta (para vender). */
export const MERCANCIA = Object.freeze([
    { tipo: 'naranja', c: '#fd7e14' },
    { tipo: 'manzana', c: '#e03131' },
    { tipo: 'limón', c: '#fab005' },
    { tipo: 'pan', c: '#d9a05b' },
    { tipo: 'lechuga', c: '#2f9e44' },
    { tipo: 'pan dulce', c: '#e8a86a' },
]);

/** Tramas y colores de mimbre para la canasta. */
export const TEJIDOS_CANASTA = Object.freeze(['#8b5a2b', '#a0522d', '#c49a6c', '#6b4423']);

/** Valores por defecto: sin accesorios. Se mezclan en la cfg del personaje. */
export const ACCESORIOS_DEFECTO = Object.freeze({
    cabeza: 0,
    cabezaColor: 0,
    lentes: 0,
    mano: 0,
    semillaCanasta: 0,
});

const CLAVES_ENTERAS = ['cabeza', 'cabezaColor', 'lentes', 'mano', 'semillaCanasta'];

/**
 * Lleva los campos de accesorios de una cfg al rango válido (los fuera de rango caen en 0).
 * No lanza: sirve para configs parciales o de red.
 */
export function normalizarAccesorios(cfg = {}) {
    const out = {};
    const rango = {
        cabeza: CATALOGO_ACCESORIOS.cabeza.length,
        cabezaColor: COLORES_ACCESORIO.length,
        lentes: CATALOGO_ACCESORIOS.lentes.length,
        mano: CATALOGO_ACCESORIOS.mano.length,
        semillaCanasta: Infinity,
    };
    for (const k of CLAVES_ENTERAS) {
        const v = cfg[k];
        out[k] = Number.isInteger(v) && v >= 0 && v < rango[k] ? v : ACCESORIOS_DEFECTO[k];
    }
    return out;
}
