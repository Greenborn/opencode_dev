// combinar.js - Fusión de salidas de varios chunks en una sola geometría por región.
//
// Optimización de draw calls: en lugar de un mesh por chunk, una región (p. ej.
// 2x2 chunks, o el mapa entero en modo estático) produce UN buffer por lado
// (opaco / transparente) con un "grupo" por material (tipo + tinte). El hilo
// principal crea un único BufferGeometry con esos grupos (ver three.js).
//
// Modo atlas de caras (ver atlas.js): las entradas traen `atlas` (bloque de
// texels de su chunk). Los bloques de todas las entradas del lado se empaquetan
// en un atlas combinado, y el `region` de cada vértice se desplaza al bloque.
//
// Sin three.js: sólo concatena typed arrays y reindexa los índices.

import { empaquetarEnFilas, potenciaDeDos, LADO_MAX_ATLAS, linealASrgb8 } from './atlas.js';

/** Empaqueta los bloques de atlas referenciados y devuelve el atlas combinado y el origen de cada uno. */
function empaquetarBloques(entradas) {
    const bloques = [];
    const vistos = new Set();
    for (const e of entradas) {
        if (e.atlas && !vistos.has(e.atlas)) { vistos.add(e.atlas); bloques.push(e.atlas); }
    }
    if (bloques.length === 0) return null;
    const area = bloques.reduce((a, b) => a + b.ancho * b.alto, 0);
    const maxAncho = Math.max(...bloques.map(b => b.ancho));
    const ancho = potenciaDeDos(Math.max(maxAncho, Math.ceil(Math.sqrt(area))));
    const tamanos = [];
    for (const b of bloques) tamanos.push(b.ancho, b.alto);
    const { pos, alto: altoUsado } = empaquetarEnFilas(tamanos, ancho);
    const alto = potenciaDeDos(altoUsado);
    if (ancho > LADO_MAX_ATLAS || alto > LADO_MAX_ATLAS) {
        throw new Error(`atlas de caras de ${ancho}x${alto} texels excede el máximo de ${LADO_MAX_ATLAS}: `
            + 'bajar regionTamano o combinar menos chunks por geometría');
    }
    // RGBA8 sRGB: 4 bytes por texel (antes Float32, 16 bytes). Los datos de bloque son lineales.
    const datos = new Uint8Array(ancho * alto * 4);
    const origen = new Map();
    bloques.forEach((b, k) => {
        const ox = pos[k * 2], oy = pos[k * 2 + 1];
        origen.set(b, [ox, oy]);
        for (let y = 0; y < b.alto; y++) {
            const dst = ((oy + y) * ancho + ox) * 4;
            for (let k = 0, n = b.ancho * 4; k < n; k += 4) {
                datos[dst + k] = linealASrgb8(b.datos[y * b.ancho * 4 + k]);
                datos[dst + k + 1] = linealASrgb8(b.datos[y * b.ancho * 4 + k + 1]);
                datos[dst + k + 2] = linealASrgb8(b.datos[y * b.ancho * 4 + k + 2]);
                datos[dst + k + 3] = 255;
            }
        }
    });
    return { atlas: { ancho, alto, datos }, origen };
}

/**
 * Combina las entradas de un lado (opacos o transparentes) de varios chunks.
 * Devuelve { position, normal, uv, color, sol, luz, index, region, atlas, grupos, materiales }
 * donde `grupos[k] = { inicio, cuenta, materialIndex }` (en índices) y
 * `materiales[k] = { tipo, conTinte }`. `region` y `atlas` sólo existen en modo atlas
 * de caras (null si no). Devuelve null si no hay geometría.
 *
 * @param {Array<Array<Object>>} listaDeSalidas  lista de `opacos` o `transparentes` por chunk
 */
export function combinarLado(listaDeSalidas) {
    const porMaterial = new Map();
    const todas = [];
    for (const salida of listaDeSalidas) {
        if (!salida) continue;
        for (const e of salida) {
            const clave = e.tipo * 2 + (e.conTinte ? 1 : 0);
            let lista = porMaterial.get(clave);
            if (!lista) { lista = []; porMaterial.set(clave, lista); }
            lista.push(e);
            todas.push(e);
        }
    }
    if (porMaterial.size === 0) return null;

    const pack = empaquetarBloques(todas);
    const hayColor = todas.some(e => e.color);
    const hayRegion = todas.some(e => e.region);

    let vCount = 0, iCount = 0;
    for (const e of todas) { vCount += e.position.length / 3; iCount += e.index.length; }
    const position = new Float32Array(vCount * 3);
    const normal = new Float32Array(vCount * 3);
    const uv = new Float32Array(vCount * 2);
    const sol = new Float32Array(vCount);
    const luz = new Float32Array(vCount);
    const color = hayColor ? new Float32Array(vCount * 3).fill(1) : null;
    const region = hayRegion ? new Float32Array(vCount * 4) : null;
    const IndexCtor = vCount > 65535 ? Uint32Array : Uint16Array;
    const index = new IndexCtor(iCount);

    const grupos = [];
    const materiales = [];
    let vOff = 0, iOff = 0, k = 0;
    for (const lista of porMaterial.values()) {
        const inicio = iOff;
        for (const e of lista) {
            const vn = e.position.length / 3;
            position.set(e.position, vOff * 3);
            normal.set(e.normal, vOff * 3);
            uv.set(e.uv, vOff * 2);
            sol.set(e.sol, vOff);
            luz.set(e.luz, vOff);
            if (color && e.color) color.set(e.color, vOff * 3);
            if (region && e.region) {
                region.set(e.region, vOff * 4);
                const o = pack.origen.get(e.atlas);
                for (let q = 0; q < vn; q++) {
                    region[(vOff + q) * 4] += o[0];
                    region[(vOff + q) * 4 + 1] += o[1];
                }
            }
            for (let q = 0; q < e.index.length; q++) index[iOff + q] = e.index[q] + vOff;
            vOff += vn;
            iOff += e.index.length;
        }
        grupos.push({ inicio, cuenta: iOff - inicio, materialIndex: k });
        materiales.push({ tipo: lista[0].tipo, conTinte: lista[0].conTinte });
        k++;
    }
    return {
        position, normal, uv, color, sol, luz, index,
        region, atlas: pack ? pack.atlas : null,
        grupos, materiales,
    };
}
