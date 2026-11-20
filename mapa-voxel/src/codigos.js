// codigos.js - Codificación de una cara en un único entero (máscara del greedy merge).
//
// Dos caras se fusionan en un rectángulo sólo si su entero es idéntico, así que
// el código incluye todo lo que tiene que coincidir para compartir un quad:
//   * tipo de bloque   (8 bits,  0..255; 0 = aire, nunca genera cara)
//   * sol horneado    (3 bits,  0..7)
//   * luz horneada    (3 bits,  0..7)
//   * tinte           (12 bits, índice a la paleta; 0 = sin tinte)
//   * orientación     (signo: positivo = cara hacia +eje)
// Como el sol y la luz entran en la máscara, una sombra que cruza un piso plano
// parte los rectángulos por su borde en vez de cuantizarse por parcelas.

export const BITS_TIPO = 8;
export const BITS_SOL = 3;
export const BITS_LUZ = 3;
export const BITS_TINTE = 12;

/** Nivel máximo de sol/luz cuantizados (0..NIVELES). */
export const NIVELES = (1 << BITS_SOL) - 1;
export const MAX_TINTES = (1 << BITS_TINTE) - 1;

const SHIFT_SOL = BITS_TIPO;
const SHIFT_LUZ = SHIFT_SOL + BITS_SOL;
const SHIFT_TINTE = SHIFT_LUZ + BITS_LUZ;

/** Código entero (no nulo) de una cara. `positivo` indica el sentido de la normal. */
export function codificar(tipo, tinte, positivo, sol, luz) {
    const code = 1 + tipo + (sol << SHIFT_SOL) + (luz << SHIFT_LUZ) + (tinte << SHIFT_TINTE);
    return positivo ? code : -code;
}

/** Inverso de `codificar`. Devuelve un objeto nuevo (no usar en bucles calientes: ver mallador.js). */
export function decodificar(code) {
    const v = (code < 0 ? -code : code) - 1;
    return {
        tipo: v & ((1 << BITS_TIPO) - 1),
        sol: (v >>> SHIFT_SOL) & NIVELES,
        luz: (v >>> SHIFT_LUZ) & NIVELES,
        tinte: v >>> SHIFT_TINTE,
        positivo: code > 0,
    };
}

/** Valor 0..1 → nivel 0..NIVELES. */
export function cuantizar(valor) {
    const n = Math.round(valor * NIVELES);
    return n < 0 ? 0 : n > NIVELES ? NIVELES : n;
}
