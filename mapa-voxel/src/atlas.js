// atlas.js - Atlas de texels para el color de los voxels.
//
// Dos niveles:
//   1. Paleta (`construirAtlas`): un texel por variante (tipo, tinte). Sirve
//      sólo como fuente de color: el mallador copia de aquí el RGB de cada voxel.
//   2. Atlas de caras (lo genera el mallador por chunk y `combinarLado` por
//      combinado): cada rectángulo fundido de w x h voxels reserva un bloque de
//      w x h texels, con un texel por voxel de la cara. El greedy merge no mira
//      tipo ni tinte, así que una cara fundida puede mezclar bloques distintos.
//
// Vértices en modo atlas de caras (ver mallador.js):
//   * `region`  (vec4): origen (x, y) del bloque en el atlas y tamaño (w, h), en texels.
//   * `uvCara`  (vec2): posición del vértice dentro del rectángulo, en unidades de voxel
//                       (0..w, 0..h). No es una UV de textura: el shader elige el texel con
//                       floor(), con NearestFilter (ver three.js, crearMaterialAtlasCaras).
//
// Límite: el atlas combinado de un grupo de chunks es como mucho LADO_MAX_ATLAS x
// LADO_MAX_ATLAS texels (potencias de dos). Si no entra, `combinarLado` lanza un error:
// bajar `regionTamano` o combinar menos chunks.
//
// Sólo datos (sin funciones) para poder pasarlo a un worker por postMessage.

/** Tipo reservado para el buffer único del atlas (ver mallador.js y three.js). */
export const TIPO_ATLAS = -1;
/** Tipos de bloque cubiertos (tipo 0 = aire, nunca se dibuja). */
export const TIPOS_ATLAS = 256;
/** Lado máximo, en texels, del atlas de un grupo combinado (potencia de dos). */
export const LADO_MAX_ATLAS = 4096;

/**
 * @param {Object} [opts]
 * @param {Array<number[]|null>} [opts.paletaTintes]  RGB lineales por tinte (índice 0 sin uso)
 * @param {Array<number[]>} [opts.colorTipos]         RGB lineales por tipo para tinte 0 (por defecto blanco)
 * @returns {{ K:number, ancho:number, alto:number, datos:Float32Array }}  paleta RGBA lineal
 */
export function construirAtlas({ paletaTintes = [], colorTipos = [] } = {}) {
    const K = Math.max(1, paletaTintes.length);
    const n = TIPOS_ATLAS * K;
    const ancho = Math.ceil(Math.sqrt(n));
    const alto = Math.ceil(n / ancho);
    const datos = new Float32Array(ancho * alto * 4);
    for (let tipo = 0; tipo < TIPOS_ATLAS; tipo++) {
        for (let tinte = 0; tinte < K; tinte++) {
            const rgb = (tinte > 0 && paletaTintes[tinte]) ? paletaTintes[tinte] : (colorTipos[tipo] ?? [1, 1, 1]);
            const i = (tipo * K + tinte) * 4;
            datos[i] = rgb[0]; datos[i + 1] = rgb[1]; datos[i + 2] = rgb[2]; datos[i + 3] = 1;
        }
    }
    return { K, ancho, alto, datos };
}

/** Tinte efectivo: el índice si existe en la paleta, si no 0. */
export function tinteEfectivo(atlas, tinte) {
    return tinte > 0 && tinte < atlas.K ? tinte : 0;
}

/** Índice de la variante (tipo, tinte) en la paleta: tipo * K + tinte efectivo. */
export function indiceVariante(atlas, tipo, tinte) {
    return tipo * atlas.K + tinteEfectivo(atlas, tinte);
}

/** UV [u, v] del centro del texel de la variante (tipo, tinte) en la paleta. */
export function uvDeTexel(atlas, tipo, tinte) {
    const i = indiceVariante(atlas, tipo, tinte);
    const x = i % atlas.ancho, y = Math.floor(i / atlas.ancho);
    return [(x + 0.5) / atlas.ancho, (y + 0.5) / atlas.alto];
}

/**
 * Empaqueta rectángulos (ancho, alto) en filas de `anchoMax` texels (estantes).
 * Un rectángulo más ancho que `anchoMax` es error del llamador.
 * @param {number[]} tamanos  [w0, h0, w1, h1, ...]
 * @returns {{ pos: Int32Array, alto: number }}  pos = [x0, y0, x1, y1, ...]; alto = filas ocupadas
 */
export function empaquetarEnFilas(tamanos, anchoMax) {
    const n = tamanos.length >> 1;
    const pos = new Int32Array(n * 2);
    let x = 0, y = 0, filaAlta = 0;
    for (let k = 0; k < n; k++) {
        const w = tamanos[k * 2], h = tamanos[k * 2 + 1];
        if (x + w > anchoMax) { y += filaAlta; x = 0; filaAlta = 0; }
        pos[k * 2] = x; pos[k * 2 + 1] = y;
        x += w;
        if (h > filaAlta) filaAlta = h;
    }
    return { pos, alto: y + filaAlta };
}

/** Lado de potencia de dos mayor o igual que `n` (mínimo 1). */
export function potenciaDeDos(n) {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

/** Lineal (0..1) → byte sRGB (0..255). El atlas combinado de caras se guarda así (RGBA8). */
export function linealASrgb8(v) {
    const c = Math.min(1, Math.max(0, v));
    const s = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(s * 255);
}

/** Byte sRGB → lineal (0..1), inversa de linealASrgb8 (para tests y lectores en CPU). */
export function srgb8ALineal(b) {
    const s = b / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
