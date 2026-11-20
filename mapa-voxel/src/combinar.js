// combinar.js - Fusión de salidas de varios chunks en una sola geometría por región.
//
// Optimización de draw calls: en lugar de un mesh por chunk, una región (p. ej.
// 2x2 chunks, o el mapa entero en modo estático) produce UN buffer por lado
// (opaco / transparente) con un "grupo" por material (tipo + tinte). El hilo
// principal crea un único BufferGeometry con esos grupos (ver three.js).
//
// Sin three.js: sólo concatena typed arrays y reindexa los índices.

/** Concatena entradas DEL MISMO material (mismo tipo y conTinte), reindexando. */
function concatenarMismoMaterial(entradas) {
    let vCount = 0, iCount = 0;
    for (const e of entradas) { vCount += e.position.length / 3; iCount += e.index.length; }
    const position = new Float32Array(vCount * 3);
    const normal = new Float32Array(vCount * 3);
    const uv = new Float32Array(vCount * 2);
    const sol = new Float32Array(vCount);
    const luz = new Float32Array(vCount);
    const hayColor = entradas.some(e => e.color);
    const color = hayColor ? new Float32Array(vCount * 3).fill(1) : null;
    const IndexCtor = vCount > 65535 ? Uint32Array : Uint16Array;
    const index = new IndexCtor(iCount);
    let vOff = 0, iOff = 0;
    for (const e of entradas) {
        const vn = e.position.length / 3;
        position.set(e.position, vOff * 3);
        normal.set(e.normal, vOff * 3);
        uv.set(e.uv, vOff * 2);
        sol.set(e.sol, vOff);
        luz.set(e.luz, vOff);
        if (color && e.color) color.set(e.color, vOff * 3);
        for (let k = 0; k < e.index.length; k++) index[iOff + k] = e.index[k] + vOff;
        vOff += vn;
        iOff += e.index.length;
    }
    return { position, normal, uv, color, sol, luz, index, tipo: entradas[0].tipo, conTinte: entradas[0].conTinte };
}

/**
 * Combina las entradas de un lado (opacos o transparentes) de varios chunks.
 * Devuelve { position, normal, uv, color, sol, luz, index, grupos, materiales }
 * donde `grupos[k] = { inicio, cuenta, materialIndex }` (en índices) y
 * `materiales[k] = { tipo, conTinte }`. Devuelve null si no hay geometría.
 *
 * @param {Array<Array<Object>>} listaDeSalidas  lista de `opacos` o `transparentes` por chunk
 */
export function combinarLado(listaDeSalidas) {
    const porMaterial = new Map();
    for (const salida of listaDeSalidas) {
        if (!salida) continue;
        for (const e of salida) {
            const clave = e.tipo * 2 + (e.conTinte ? 1 : 0);
            let lista = porMaterial.get(clave);
            if (!lista) { lista = []; porMaterial.set(clave, lista); }
            lista.push(e);
        }
    }
    if (porMaterial.size === 0) return null;

    const grupos = [];
    const materiales = [];
    let vCount = 0, iCount = 0;
    for (const lista of porMaterial.values()) {
        const m = lista.length === 1 ? lista[0] : concatenarMismoMaterial(lista);
        grupos.push(m);
        vCount += m.position.length / 3;
        iCount += m.index.length;
    }

    const position = new Float32Array(vCount * 3);
    const normal = new Float32Array(vCount * 3);
    const uv = new Float32Array(vCount * 2);
    const sol = new Float32Array(vCount);
    const luz = new Float32Array(vCount);
    const hayColor = grupos.some(g => g.color);
    const color = hayColor ? new Float32Array(vCount * 3).fill(1) : null;
    const IndexCtor = vCount > 65535 ? Uint32Array : Uint16Array;
    const index = new IndexCtor(iCount);
    const gruposOut = [];
    let vOff = 0, iOff = 0;
    grupos.forEach((g, k) => {
        const vn = g.position.length / 3;
        position.set(g.position, vOff * 3);
        normal.set(g.normal, vOff * 3);
        uv.set(g.uv, vOff * 2);
        sol.set(g.sol, vOff);
        luz.set(g.luz, vOff);
        if (color && g.color) color.set(g.color, vOff * 3);
        for (let q = 0; q < g.index.length; q++) index[iOff + q] = g.index[q] + vOff;
        gruposOut.push({ inicio: iOff, cuenta: g.index.length, materialIndex: k });
        materiales.push({ tipo: g.tipo, conTinte: g.conTinte });
        vOff += vn;
        iOff += g.index.length;
    });
    return { position, normal, uv, color, sol, luz, index, grupos: gruposOut, materiales };
}
