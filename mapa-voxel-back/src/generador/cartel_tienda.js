// cartel_tienda.js - Cartel de cada tienda, armado con bloques del mapa.
//
// Va sobre la fachada que da a la calle, justo encima de la puerta. El tablero
// queda en el plano exterior de la pared (un bloque hacia la calle), así que
// se apoya en la fachada. Las letras van en blanco sobre un tablero de asfalto.
// Sólo se escriben celdas de aire: si una celda ya tiene algo (otra casa, la
// calle, un techo), se deja tal cual.
//
// Lo llama generateVolumeType3 después de tallar puertas y ventanas; las
// tiendas ya están marcadas (`s.tienda`, `s.tiendaLado`) por elegirTiendas.

import { BLOCK_TYPES } from './mapConfig.js';

const TEXTO = 'TIENDA';
/** Fuente de 3x5: cada fila es una cadena de 0/1 (1 = bloque de letra). */
const FUENTE = {
    T: ['111', '010', '010', '010', '010'],
    I: ['111', '010', '010', '010', '111'],
    E: ['111', '100', '110', '100', '111'],
    N: ['101', '111', '111', '111', '101'],
    D: ['110', '101', '101', '101', '110'],
    A: ['010', '101', '111', '101', '101']
};
const ANCHO_LETRA = 3, ALTO_LETRA = 5, ESPACIO = 1;
const MARGEN = 1;                 // borde del tablero alrededor de las letras
/** Altura del cartel sobre el suelo de la sala: a la altura del techo (hy+8 en salas de 9) y hacia arriba. */
const DESDE_PISO = 8;
const COLOR_TABLERO = BLOCK_TYPES.ASPHALT;
const COLOR_LETRA = BLOCK_TYPES.WHITE;

/** Máscara del texto: matriz de filas (arriba→abajo) con true donde hay letra. */
function mascaraTexto(texto) {
    const filas = Array.from({ length: ALTO_LETRA }, () => []);
    for (const ch of texto) {
        const g = FUENTE[ch];
        for (let f = 0; f < ALTO_LETRA; f++) {
            for (let c = 0; c < ANCHO_LETRA; c++) filas[f].push(g ? g[f][c] === '1' : false);
            for (let e = 0; e < ESPACIO; e++) filas[f].push(false);
        }
    }
    for (const fila of filas) fila.length -= ESPACIO;   // sin espacio al final
    return filas;
}

/**
 * Pinta el cartel de una tienda. `s` es la sala (x, y, z, width, depth, height)
 * y `lado` la fachada de calle ('N','S','E','O'), igual que en genera_tiendas.js.
 */
export function pintarCartelTienda(volume, s, lado, width, depth, volumeHeight) {
    const mascara = mascaraTexto(TEXTO);
    const anchoLetras = mascara[0].length;
    const anchoTablero = anchoLetras + 2 * MARGEN;
    const altoTablero = ALTO_LETRA + 2 * MARGEN;

    const alongZ = lado === 'N' || lado === 'S';             // la fachada corre a lo largo de x
    const ancho = alongZ ? s.width : s.depth;                // largo de la fachada
    const inicioLat = alongZ ? s.x : s.z;                     // coordenada lateral del primer borde
    // plano exterior de la pared (un bloque hacia la calle)
    let plano;
    if (lado === 'N') plano = s.z - 1;
    else if (lado === 'S') plano = s.z + s.depth;
    else if (lado === 'O') plano = s.x - 1;
    else plano = s.x + s.width;

    // centrado sobre la puerta (la puerta está en el centro de la fachada)
    const lat0 = inicioLat + Math.floor((ancho - anchoTablero) / 2);
    const y0 = s.y + DESDE_PISO;

    const cell = (lat, y) => {
        const x = alongZ ? lat : plano;
        const z = alongZ ? plano : lat;
        return { x, y, z };
    };
    const dentro = ({ x, y, z }) => x >= 0 && x < width && z >= 0 && z < depth && y >= 0 && y < volumeHeight;
    // tablero: sólo sobre aire. Letras: sobre el tablero que acabamos de poner.
    const pintar = (lat, y, tipo) => {
        const p = cell(lat, y);
        if (!dentro(p)) return;
        if (volume.getType(p.x, p.y, p.z) !== BLOCK_TYPES.AIR) return;
        volume.set(p.x, p.y, p.z, tipo);
    };
    const pintarLetra = (lat, y) => {
        const p = cell(lat, y);
        if (!dentro(p)) return;
        volume.set(p.x, p.y, p.z, COLOR_LETRA);
    };

    // Sentido de lectura: el observador está en la calle, mirando hacia la fachada.
    // Con su derecha = forward × up, en 'N' (mira +z) la derecha es −x, y en 'E'
    // (mira −x) la derecha es −z. Ahí el eje lateral crece hacia la izquierda del
    // observador, así que las columnas se invierten para que el texto no salga espejado.
    const invertirLectura = lado === 'N' || lado === 'E';

    // tablero completo y después las letras encima
    for (let f = 0; f < altoTablero; f++) {
        for (let c = 0; c < anchoTablero; c++) pintar(lat0 + c, y0 + f, COLOR_TABLERO);
    }
    for (let f = 0; f < ALTO_LETRA; f++) {
        // la fila 0 de la máscara es la de arriba: va en la fila superior del tablero
        const yFila = y0 + MARGEN + (ALTO_LETRA - 1 - f);
        for (let c = 0; c < anchoLetras; c++) {
            if (!mascara[f][c]) continue;
            const col = invertirLectura ? (anchoLetras - 1 - c) : c;
            pintarLetra(lat0 + MARGEN + col, yFila);
        }
    }
}

/**
 * Pinta el cartel de todas las tiendas del mapa. Las salas tienda tienen
 * `tienda === true` y `tiendaLado` (lo pone elegirTiendas).
 */
export function pintarCarteles(volume, structures, width, depth, volumeHeight) {
    for (const s of structures || []) {
        if (!s || !s.tienda || !s.tiendaLado) continue;
        pintarCartelTienda(volume, s, s.tiendaLado, width, depth, volumeHeight);
    }
}
