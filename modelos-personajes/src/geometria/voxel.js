// Personaje voxel (muñeco de cubos de la misma medida): lógica pura, sin three.js ni DOM.
//
// Es el modelo de los juegos en estilo voxel (p. ej. el constructor de
// ideas_juegos_virales/vendedores_capital). Cada voxel es un cubo de 1 unidad de
// la grilla fina del personaje (cabeza 8x8x8, piernas 6x... ver abajo).
// Con la misma cfg siempre sale la misma lista de voxels, y el orden es estable.

import { tint, mezclar, luz } from './color.js';

export const PIEL_DEFECTO = '#e0a878';
const HEX = /^#[0-9a-f]{6}$/i;

// Paletas de prendas (índices usados por cfg: pelocolor, remera, pantalon, calzado).
export const COLORES_PELO = Object.freeze(['#1d1a18', '#4a2c1a', '#8a5a2b', '#d9b26a', '#9c9c9c', '#c14b2b']);
export const COLORES_REMERA = Object.freeze(['#e03131', '#1c7ed6', '#2f9e44', '#f59f00', '#f1f3f5', '#7048e8', '#343a40', '#d6336c']);
export const COLORES_PANTALON = Object.freeze(['#2b3a55', '#3b3b3b', '#5c4033', '#4a6b8a', '#1b1b1b']);
export const COLORES_CALZADO = Object.freeze(['#111111', '#f1f3f5', '#8b5a2b', '#c92a2a']);
/** Peinados: 0 corto, 1 rulos, 2 trenza, 3 rapado, 4 gorra. */
export const PEINADOS = Object.freeze(['corto', 'rulos', 'trenza', 'rapado', 'gorra']);
export const COLOR_GORRA = '#2b2d42';
/** Uniforme de policía: camisa azul marino, pantalón oscuro, placa dorada en el pecho. */
export const COLOR_UNIFORME_POLICIA = '#1d3d7a';
export const COLOR_PANTALON_POLICIA = '#1b2233';
export const COLOR_PLACA_POLICIA = '#d4a017';

/**
 * Construye los voxels de un personaje.
 * cfg: { piel, pelo (0..4), pelocolor, remera, pantalon, calzado } (índices en las paletas).
 * Los índices fuera de rango caen en el 0; un `piel` que no sea #rrggbb cae en PIEL_DEFECTO.
 * Devuelve [{ x, y, z, c }] con c en #rrggbb.
 */
export function voxelesPersonaje(cfg = {}) {
    const idx = (lista, i) => lista[Number.isInteger(i) && i >= 0 && i < lista.length ? i : 0];
    const pelo = Number.isInteger(cfg.pelo) && cfg.pelo >= 0 && cfg.pelo < PEINADOS.length ? cfg.pelo : 0;
    const M = new Map();
    const put = (x, y, z, c) => M.set(x + ',' + y + ',' + z, { x, y, z, c });
    const box = (x0, y0, z0, w, d, h, c) => {
        for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + d; y++) for (let z = z0; z < z0 + h; z++) put(x, y, z, c);
    };
    // Torso x 0..11, piernas x 0..5 y 6..11 (z 2..11), cabeza 8x8x8 (x 2..9, y 0..7, z 25..32), frente = +y (y 7).
    const skin = HEX.test(cfg.piel) ? cfg.piel : PIEL_DEFECTO;
    // cfg.policia: uniforme fijo (camisa y pantalón de policía) en lugar de las paletas de prendas.
    const policia = cfg.policia === true;
    const hair = idx(COLORES_PELO, cfg.pelocolor);
    const shirt = policia ? COLOR_UNIFORME_POLICIA : idx(COLORES_REMERA, cfg.remera);
    const pants = policia ? COLOR_PANTALON_POLICIA : idx(COLORES_PANTALON, cfg.pantalon);
    const shoe = idx(COLORES_CALZADO, cfg.calzado);
    const contraste = hex => tint(hex, luz(hex) > 140 ? .55 : 2.4);   // cordones y detalles legibles sobre el calzado
    const piel2 = tint(skin, .84), pielOsc = tint(skin, .7), rubor = mezclar(skin, '#e0605a', .35);
    const remOsc = tint(shirt, .8), remSombra = tint(shirt, .65);
    const pantOsc = tint(pants, .7), pelOsc = tint(hair, .8);

    // calzado (suela, zapato, cordones) y piernas con costura y bolsillos
    for (const x0 of [0, 6]) {
        box(x0, 2, 0, 6, 5, 1, tint(shoe, .6));            // suela
        box(x0, 2, 1, 6, 5, 1, shoe);                      // zapato
        put(x0 + 2, 6, 1, contraste(shoe)); put(x0 + 3, 6, 1, contraste(shoe));   // cordones
        box(x0, 2, 2, 6, 4, 10, pants);                    // pierna
        put(x0 + 1, 5, 7, pantOsc); put(x0 + 4, 5, 7, pantOsc);                  // bolsillos delanteros
    }
    for (let z = 2; z < 12; z++) { put(5, 5, z, pantOsc); put(6, 5, z, pantOsc); }   // costura entre piernas

    // cinturón con hebilla, torso con remera (dobladillo, cuello y bolsillos)
    box(0, 2, 12, 12, 4, 1, '#2b2118');
    put(5, 5, 12, '#d4a017'); put(6, 5, 12, '#d4a017');
    box(0, 2, 13, 12, 4, 11, shirt);
    box(0, 2, 13, 12, 4, 1, remSombra);                  // dobladillo
    for (let x = 3; x <= 8; x++) { put(x, 5, 23, remOsc); put(x, 2, 23, remOsc); }   // cuello
    box(1, 5, 18, 3, 1, 2, remOsc); box(8, 5, 18, 3, 1, 2, remOsc);                   // bolsillos del pecho
    if (policia) { put(5, 5, 20, COLOR_PLACA_POLICIA); put(6, 5, 20, COLOR_PLACA_POLICIA); }   // placa

    // cuello
    box(4, 3, 24, 4, 2, 1, piel2);

    // brazos: manga, antebrazo, mano con surco entre dedos y pulgar
    for (const [x0, dentro] of [[-2, -1], [12, 12]]) {
        box(x0, 2, 18, 2, 4, 6, shirt);
        box(x0, 2, 18, 2, 4, 1, remSombra);                // puño de la manga
        box(x0, 2, 12, 2, 4, 6, skin);
        box(x0, 2, 10, 2, 4, 2, skin);
        put(x0, 3, 10, pielOsc); put(x0 + 1, 3, 10, pielOsc);   // separación de dedos
        put(dentro, 5, 11, piel2);                              // pulgar
    }

    // cabeza, orejas
    box(2, 0, 25, 8, 8, 8, skin);
    box(1, 3, 28, 1, 2, 2, skin); box(10, 3, 28, 1, 2, 2, skin);

    // cara (frente = y 7): cejas, ojos con esclerótica, pupila y brillo, nariz, mejillas, boca
    const F = 7;
    for (const x of [3, 4, 7, 8]) put(x, F, 30, pelOsc);                       // cejas
    put(3, F, 29, '#e9ecef'); put(4, F, 29, '#ffffff');                         // esclerótica y brillo
    put(7, F, 29, '#e9ecef'); put(8, F, 29, '#ffffff');
    for (const x of [3, 4, 7, 8]) put(x, F, 28, '#1a1a1a');                    // pupilas
    put(5, F, 26, piel2); put(6, F, 26, piel2);                                // nariz
    put(3, F, 26, rubor); put(8, F, 26, rubor);                                // mejillas
    for (let x = 4; x <= 7; x++) put(x, F, 25, '#7a3e3e');                     // boca

    // peinado; z 33..34 = pelo por encima de la cabeza
    const casquete = () => { box(2, 0, 33, 8, 8, 1, hair); box(2, 6, 32, 8, 2, 1, hair); };   // con flequillo
    switch (pelo) {
        case 0: casquete(); box(1, 1, 30, 1, 6, 3, hair); box(10, 1, 30, 1, 6, 3, hair); break;   // patillas
        case 1:                                                                                  // rulos
            box(1, 0, 30, 1, 8, 3, hair); box(10, 0, 30, 1, 8, 3, hair);
            for (let x = 2; x < 10; x++) for (let y = -1; y < 9; y++) {
                if ((x + y) % 2 === 0) put(x, y, 33, hair);
                if (x % 2 === 0 && y % 2 === 0) put(x, y, 34, hair);
            }
            break;
        case 2:                                                                                  // trenza atrás
            casquete();
            for (let z = 17; z < 32; z++) { const c = z % 2 ? hair : pelOsc; put(5, -1, z, c); put(6, -1, z, c); }
            break;
        case 3: box(2, 0, 33, 8, 8, 1, '#3a332e'); break;                                       // rapado
        case 4:                                                                                  // gorra con visera
            box(2, 0, 32, 8, 8, 1, COLOR_GORRA); box(2, 0, 33, 8, 8, 1, COLOR_GORRA);
            box(2, 8, 32, 8, 2, 1, tint(COLOR_GORRA, .8));
            break;
    }
    return [...M.values()];
}

/**
 * Transporte del personaje voxel desde un Web Worker: posiciones en Int16Array
 * (x, y, z por voxel) y colores en Uint32Array (0xRRGGBB). Devuelve
 * { datos, transferibles } para postMessage.
 */
export function serializarVoxeles(vox) {
    const n = vox.length;
    const pos = new Int16Array(n * 3);
    const col = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        const v = vox[i];
        pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
        col[i] = parseInt(v.c.slice(1), 16);
    }
    return { datos: { pos, col }, transferibles: [pos.buffer, col.buffer] };
}

/** Inversa de serializarVoxeles: vuelve a [{ x, y, z, c }] con c en #rrggbb. */
export function reconstruirVoxeles({ pos, col }) {
    const out = new Array(col.length);
    for (let i = 0; i < col.length; i++) {
        out[i] = {
            x: pos[i * 3], y: pos[i * 3 + 1], z: pos[i * 3 + 2],
            c: '#' + col[i].toString(16).padStart(6, '0'),
        };
    }
    return out;
}
