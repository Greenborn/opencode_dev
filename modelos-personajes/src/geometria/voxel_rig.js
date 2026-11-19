// Rig del personaje voxel (lógica pura, apta para Worker): separa los voxels en cuerpo
// y cuatro extremidades con su pivote, como los huesos del muñeco articulado.
//
// Espacio del modelo: X = ancho (centrado), Y = altura (pies en 0), Z = profundidad (frente = +Z),
// igual que el muñeco articulado. Sin three.js: la geometría la arma src/three/voxel.js.

import { voxelesPersonaje } from './voxel.js';

/** Partes del rig, en orden fijo. */
export const PARTES_VOXEL = Object.freeze(['body', 'legA', 'legB', 'armA', 'armB']);

/** Alto del personaje en voxels (pies en 0, coronilla en 36). Para escalar: alto / ALTO_VOXEL. */
export const ALTO_VOXEL = 36;

// Pivotes en voxels, antes de centrar: [x, y, z]. z = altura: cadera 12, hombro 24.
const PIVOTE_VOXEL = { legA: [3, 4, 12], legB: [9, 4, 12], armA: [-1, 4, 24], armB: [13, 4, 24] };

/** Parte a la que pertenece un voxel (sobre las coordenadas originales, sin rotar). */
export function parteDeVoxel(v) {
    if (v.z <= 11 && v.x >= 0 && v.x < 12) return v.x < 6 ? 'legA' : 'legB';
    if (v.z >= 10 && v.z <= 23 && v.x < 0) return 'armA';
    if (v.z >= 10 && v.z <= 23 && v.x >= 12) return 'armB';
    return 'body';
}

/** Centro del personaje en voxels (promedio de los centros de voxel). */
export function marcoVoxel(vox) {
    let mx = 0, my = 0;
    for (const v of vox) { mx += v.x + 0.5; my += v.y + 0.5; }
    return { mx: mx / vox.length, my: my / vox.length };
}

/** Posición en el espacio del modelo del centro de un voxel. */
export function posModeloVoxel(v, marco) {
    return [v.x + 0.5 - marco.mx, v.z + 0.5, v.y + 0.5 - marco.my];
}

/** Pivote de cada parte en el espacio del modelo (cuerpo: origen). */
export function pivotesVoxel(vox) {
    const m = marcoVoxel(vox);
    const out = { body: [0, 0, 0] };
    for (const k of ['legA', 'legB', 'armA', 'armB']) {
        const [x, y, z] = PIVOTE_VOXEL[k];
        out[k] = [x - m.mx, z, y - m.my];
    }
    return out;
}

/**
 * Ángulos (rad, sobre X) de cada parte en la caminata. Misma forma que animarCaminata del
 * muñeco articulado: piernas en contrafase, brazos en contrafase con su pierna, amplitud × fuerza.
 * El muñeco voxel no tiene rodillas ni codos.
 */
export function angulosVoxelCaminata(fase, fuerza = 1) {
    const s = Math.sin(fase) * fuerza;
    return { body: 0, legA: -s * 0.8, legB: s * 0.8, armA: s * 0.7, armB: -s * 0.7 };
}

/** Escala para que el personaje mida `alto` unidades. */
export function escalaVoxelParaAlto(alto) {
    return alto / ALTO_VOXEL;
}

/** Clave de caché de una cfg (sólo los campos que cambian la geometría). */
export function claveVoxel(cfg = {}) {
    return JSON.stringify([cfg.piel, cfg.pelo, cfg.pelocolor, cfg.remera, cfg.pantalon, cfg.calzado]);
}

/** Voxels del personaje agrupados por parte, con el marco y los pivotes. */
export function rigVoxel(cfg = {}) {
    const vox = voxelesPersonaje(cfg);
    const marco = marcoVoxel(vox);
    const porParte = Object.fromEntries(PARTES_VOXEL.map(k => [k, []]));
    for (const v of vox) porParte[parteDeVoxel(v)].push(v);
    return { vox, marco, pivotes: pivotesVoxel(vox), porParte };
}
