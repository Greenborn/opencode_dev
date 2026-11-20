// Voxels de los accesorios, en el mismo espacio que voxelesPersonaje (paquete de personajes):
// X = ancho, Y = profundidad (frente = +y, cara en y = 7), Z = altura (pies en 0, coronilla ~34).
//
//   cabeza: x 2..9, y 0..7, z 25..32; el peinado llega hasta z 34.
//   ojos:   z 28..29, x 3..4 (izq.) y 7..8 (der.), en la cara y = 7.
//   mano derecha: x 12..13, z 10..11, y 2..5.
//
// Los accesorios de cabeza y lentes se cuelgan del pivote del cuerpo ('body'); la canasta, del
// brazo derecho ('armB'), así se mueve con el brazo al caminar.
//
// Lógica pura: la geometría three.js la arma src/three.js.

import { tint, generadorSembrado } from '@greenborn/modelos-personajes/geometria';
import { COLORES_ACCESORIO, COLOR_CINTA, COLOR_LENTE, COLOR_MONTURA } from './catalogo.js';
import { generarCanasta } from './aleatorio.js';

/** Color de gorra/sombrero según la cfg. */
function colorCabeza(cfg) {
    return COLORES_ACCESORIO[Number.isInteger(cfg.cabezaColor) ? cfg.cabezaColor : 0] || COLORES_ACCESORIO[0];
}

/** Agrega a `out` un bloque de voxels x0..x0+w-1, y0..y0+d-1, z0..z0+h-1 del color c. */
function caja(out, x0, y0, z0, w, d, h, c) {
    for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + d; y++) for (let z = z0; z < z0 + h; z++) out.push({ x, y, z, c });
    return out;
}

/** Gorra: casquete sobre el peinado (z 34..35) y visera hacia el frente. No se dibuja con el peinado 4 (gorra integrada). */
function voxelesGorra(c) {
    const out = [];
    caja(out, 2, 0, 34, 8, 8, 2, c);                 // casquete
    caja(out, 2, 8, 34, 8, 2, 1, tint(c, 0.8));      // visera
    return out;
}

/** Sombrero: ala ancha (z 34, x 0..11, y -1..8) y copa con cinta (z 35..37). */
function voxelesSombrero(c) {
    const out = [];
    caja(out, 0, -1, 34, 12, 10, 1, c);              // ala
    caja(out, 3, 1, 35, 6, 6, 3, c);                 // copa
    caja(out, 3, 1, 35, 6, 6, 1, COLOR_CINTA);       // cinta en la base de la copa
    return out;
}

/**
 * Lentes sobre la cara (y = 8, delante de los ojos): dos aros de 4×4 con lente celeste
 * en el centro. Quedan unidos en el puente (x 5..6).
 */
function voxelesLentes() {
    const out = [];
    for (const x0 of [2, 6]) {                       // aro izquierdo x 2..5, aro derecho x 6..9
        for (let x = x0; x < x0 + 4; x++) for (let z = 27; z <= 30; z++) {
            const borde = x === x0 || x === x0 + 3 || z === 27 || z === 30;
            out.push({ x, y: 8, z, c: borde ? COLOR_MONTURA : COLOR_LENTE });
        }
    }
    return out;
}

/**
 * Canasta para vender, en la mano derecha: asa (x 12..13, z 8..9) y cuerpo de mimbre
 * (x 13..18, y 1..6, z 2..6) con tapa (z 7). El tejido alterna dos tonos. Sobre la tapa va la mercancía.
 */
function voxelesCanasta(desc) {
    const out = [];
    const { tejido, borde, mercancia } = desc;
    const oscuro = tint(tejido, 0.75);
    for (let x = 13; x < 19; x++) for (let y = 1; y < 7; y++) for (let z = 2; z < 7; z++) {
        out.push({ x, y, z, c: (x + y + z) % 2 ? tejido : oscuro });    // tramado
    }
    for (let x = 13; x < 19; x++) for (let y = 1; y < 7; y++) out.push({ x, y, z: 7, c: borde });   // tapa
    for (let x = 12; x < 14; x++) for (let y = 2; y < 6; y++) for (let z = 8; z < 10; z++) out.push({ x, y, z, c: borde });   // asa
    for (const m of mercancia) {
        for (let x = m.x; x < m.x + 2; x++) for (let y = m.y; y < m.y + 2; y++) out.push({ x, y, z: 8 + m.capa, c: m.c });
    }
    return out;
}

/**
 * Voxels de los accesorios de una cfg, agrupados por parte del rig:
 * { body: [{x, y, z, c}], armB: [{x, y, z, c}] }.
 * Sin accesorios, las listas están vacías.
 */
export function voxelesAccesorios(cfg = {}) {
    const body = [];
    const armB = [];
    if (cfg.cabeza === 1 && cfg.pelo !== 4) body.push(...voxelesGorra(colorCabeza(cfg)));
    if (cfg.cabeza === 2) body.push(...voxelesSombrero(colorCabeza(cfg)));
    if (cfg.lentes === 1) body.push(...voxelesLentes());
    if (cfg.mano === 1) armB.push(...voxelesCanasta(generarCanasta(generadorSembrado(cfg.semillaCanasta || 0))));
    return { body: unicosPorPosicion(body), armB: unicosPorPosicion(armB) };
}

/** Un voxel por posición: si dos accesorios ocupan la misma celda, gana el último (evita cubos duplicados). */
function unicosPorPosicion(lista) {
    const M = new Map();
    for (const v of lista) M.set(v.x + ',' + v.y + ',' + v.z, v);
    return [...M.values()];
}
