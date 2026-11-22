// Atlas de caras: un texel por voxel dentro de cada cara fundida (ver atlas.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mallarChunk } from '../src/mallador.js';
import { MapaVoxel } from '../src/mapa.js';
import { combinarLado } from '../src/combinar.js';
import { construirAtlas, indiceVariante, TIPO_ATLAS, LADO_MAX_ATLAS, srgb8ALineal } from '../src/atlas.js';

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
const PALETA = [null, [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.5, 0.5, 0]];
const T = 6, ALTO = 5;

/** Aristas con número impar de triángulos (agujeros o T-junctions). Igual que en optimizacion.test.js. */
function aristasAbiertas(lista) {
    const aristas = new Map();
    const clave = p => p.map(x => x.toFixed(4)).join(',');
    for (const e of lista) {
        const p = e.position;
        for (let t = 0; t < e.index.length; t += 3) {
            const ps = [e.index[t], e.index[t + 1], e.index[t + 2]].map(i => clave([p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]));
            for (let k = 0; k < 3; k++) {
                const x = ps[k], y = ps[(k + 1) % 3];
                const arista = x < y ? x + '|' + y : y + '|' + x;
                aristas.set(arista, (aristas.get(arista) ?? 0) + 1);
            }
        }
    }
    return [...aristas.values()].filter(n => n % 2 !== 0).length;
}

/** Mapa con relieve aleatorio: columnas de alturas distintas, tipos mixtos, tintes y vidrio (tipo 9). */
function mapaAleatorio(seed, { iluminacion = null, tiposTransparentes = [9] } = {}) {
    const rnd = rng(seed);
    const m = new MapaVoxel({
        tamanoChunk: T, alto: ALTO, paletaTintes: PALETA, atlas: true, tiposTransparentes, iluminacion,
    });
    for (let cx = 0; cx < 2; cx++) for (let cz = 0; cz < 2; cz++) {
        const datos = new Uint8Array(T * ALTO * T), tintes = new Uint16Array(T * ALTO * T);
        for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) {
            const h = 1 + Math.floor(rnd() * (ALTO - 1));
            const tipoCol = 1 + Math.floor(rnd() * 3);
            for (let y = 0; y < h; y++) {
                const i = (x * ALTO + y) * T + z;
                datos[i] = y === h - 1 && rnd() < 0.2 ? 9 : (rnd() < 0.5 ? tipoCol : 1 + Math.floor(rnd() * 3));
                tintes[i] = rnd() < 0.3 ? 1 + Math.floor(rnd() * 4) : 0;
            }
        }
        m.setChunk(cx, cz, datos, tintes);
    }
    m.mallarPendientes();
    return m;
}

/** Tipo y tinte del voxel de MUNDO (x, y, z) leídos de los datos crudos del mapa. */
function voxelDe(m, x, y, z) {
    const cx = Math.floor(x / T), cz = Math.floor(z / T);
    const c = m.chunks.get(cx + '_' + cz);
    const lx = x - cx * T, lz = z - cz * T;
    const i = (lx * ALTO + y) * T + lz;
    return { tipo: c.datos[i], tinte: c.tintes ? c.tintes[i] : 0 };
}

test('el color de cada voxel de una cara fundida sale del texel correcto (w x h distintos)', () => {
    const m = mapaAleatorio(7);
    const comb = m.combinarTodo();
    const paleta = construirAtlas({ paletaTintes: PALETA });
    const K = paleta.K;
    const rnd = rng(3);
    const coloresPorRect = new Map();     // rectángulo (origen + tamaño) -> colores distintos vistos
    let muestras = 0, tamanosDistintos = new Set();
    for (const lado of ['opacos', 'transparentes']) {
        const L = comb[lado];
        if (!L) continue;
        const atlas = L.atlas;
        assert.ok(atlas, 'el lado trae su atlas de caras');
        for (let t = 0; t < L.index.length; t += 3) {
            const ids = [L.index[t], L.index[t + 1], L.index[t + 2]];
            const reg = ids.map(i => [L.region[i * 4], L.region[i * 4 + 1], L.region[i * 4 + 2], L.region[i * 4 + 3]]);
            // los 3 vértices de un triángulo pertenecen al mismo rectángulo
            assert.deepEqual(reg[1], reg[0]); assert.deepEqual(reg[2], reg[0]);
            const [ox, oy, w, h] = reg[0];
            tamanosDistintos.add(w + 'x' + h);
            const normal = [L.normal[ids[0] * 3], L.normal[ids[0] * 3 + 1], L.normal[ids[0] * 3 + 2]];
            const eje = normal.findIndex(x => x !== 0);
            const signo = normal[eje] > 0 ? 1 : -1;
            for (let s = 0; s < 8; s++) {
                // baricéntricas interiores (evita los bordes del triángulo)
                let a = 0.05 + 0.9 * rnd(), b = 0.05 + 0.9 * rnd(), c = 0.05 + 0.9 * rnd();
                const sum = a + b + c; a /= sum; b /= sum; c /= sum;
                const P = ids.map(i => [L.position[i * 3], L.position[i * 3 + 1], L.position[i * 3 + 2]]);
                const world = [0, 1, 2].map(k => a * P[0][k] + b * P[1][k] + c * P[2][k]);
                const local = [0, 1].map(k => a * L.uv[ids[0] * 2 + k] + b * L.uv[ids[1] * 2 + k] + c * L.uv[ids[2] * 2 + k]);
                // el shader: texel = origen + floor(local) acotado al rectángulo
                const tx = ox + Math.min(Math.max(Math.floor(local[0]), 0), w - 1);
                const ty = oy + Math.min(Math.max(Math.floor(local[1]), 0), h - 1);
                // atlas RGBA8 sRGB: se decodifica a lineal como lo haría la GPU
                const real = [0, 1, 2].map(k => srgb8ALineal(atlas.datos[(ty * atlas.ancho + tx) * 4 + k]));
                // voxel dueño: el de adentro de la cara (en el eje de la normal, el plano es su cara)
                const dueno = [0, 1, 2].map(k => {
                    if (k === eje) return signo > 0 ? Math.round(world[k]) - 1 : Math.round(world[k]);
                    return Math.floor(world[k]);
                });
                const v = voxelDe(m, dueno[0], dueno[1], dueno[2]);
                const idx = indiceVariante(paleta, v.tipo, v.tinte) * 4;
                const esperado = [0, 1, 2].map(k => paleta.datos[idx + k]);
                // cuantización sRGB de 8 bits: error máximo ~0,003 en lineal
                real.forEach((x, k) => assert.ok(Math.abs(x - esperado[k]) < 0.005,
                    `voxel ${dueno} tipo ${v.tipo} tinte ${v.tinte} en rect ${ox},${oy} ${w}x${h}`));
                muestras++;
                const clave = ox + ',' + oy + ',' + w + ',' + h;
                if (!coloresPorRect.has(clave)) coloresPorRect.set(clave, new Set());
                coloresPorRect.get(clave).add(v.tipo + ':' + v.tinte);
            }
        }
    }
    assert.ok(muestras > 0);
    assert.ok(tamanosDistintos.size >= 3, 'hay varios tamaños de rectángulo: ' + [...tamanosDistintos]);
    const mezclados = [...coloresPorRect.values()].filter(s => s.size > 1).length;
    assert.ok(mezclados > 0, 'hay caras fundidas que mezclan tipos o tintes en un mismo rectángulo');
});

test('la malla opaca con atlas de caras sigue cerrada (por chunk y combinada)', () => {
    // El vidrio (transparente) no es cerrado ni con ni sin atlas: sólo se comprueban los opacos.
    const m = mapaAleatorio(21);
    const lista = [...m.salidas.values()].flatMap(s => s.opacos);
    assert.equal(aristasAbiertas(lista), 0);
    const comb = m.combinarTodo();
    assert.equal(aristasAbiertas([comb.opacos]), 0);
});

test('con atlas de caras baja el número de vértices y triángulos frente a la máscara tipo+tinte', () => {
    const rnd = rng(5);
    const datos = new Uint8Array(12 * 6 * 12), tintes = new Uint16Array(datos.length);
    for (let x = 0; x < 12; x++) for (let z = 0; z < 12; z++) {
        const h = 1 + Math.floor(rnd() * 5);
        for (let y = 0; y < h; y++) {
            const i = (x * 6 + y) * 12 + z;
            datos[i] = 1 + Math.floor(rnd() * 3);
            tintes[i] = rnd() < 0.3 ? 1 + Math.floor(rnd() * 3) : 0;
        }
    }
    const c = { cx: 0, cz: 0, ancho: 12, alto: 6, profundidad: 12, datos, tintes };
    const sinAtlas = mallarChunk(c, () => undefined, { paletaTintes: PALETA });
    const conAtlas = mallarChunk(c, () => undefined, { paletaTintes: PALETA, atlas: construirAtlas({ paletaTintes: PALETA }) });
    const cuenta = (s) => [s.opacos, s.transparentes].flat().reduce((acc, e) => ({
        v: acc.v + e.position.length / 3, t: acc.t + e.index.length / 3,
    }), { v: 0, t: 0 });
    const a = cuenta(sinAtlas), b = cuenta(conAtlas);
    assert.ok(b.v < a.v, `vértices ${b.v} < ${a.v}`);
    assert.ok(b.t < a.t, `triángulos ${b.t} < ${a.t}`);
});

test('sol y luz distintos no se funden: cada triángulo tiene el mismo sol y luz en sus vértices', () => {
    // suelo plano de tipo 1; el sol cambia en x = 4 y la luz en z = 3
    const iluminacion = info => (info.eje === 1 && info.sentido > 0
        ? { sol: info.x < 4 ? 1 : 0.5, luz: info.z < 3 ? 0 : 0.8 }
        : { sol: 1, luz: 0 });
    const A = 8, ALTO = 3;
    const datos = new Uint8Array(A * ALTO * A);
    for (let x = 0; x < A; x++) for (let z = 0; z < A; z++) datos[(x * ALTO + 0) * A + z] = 1;
    const c = { cx: 0, cz: 0, ancho: A, alto: ALTO, profundidad: A, datos, tintes: null };
    const s = mallarChunk(c, () => undefined, { paletaTintes: PALETA, atlas: construirAtlas({ paletaTintes: PALETA }), iluminacion });
    const lista = s.opacos;
    const solVistos = new Set(), luzVistas = new Set();
    for (const e of lista) {
        for (let t = 0; t < e.index.length; t += 3) {
            const [i0, i1, i2] = [e.index[t], e.index[t + 1], e.index[t + 2]];
            assert.equal(e.sol[i0], e.sol[i1]); assert.equal(e.sol[i0], e.sol[i2]);
            assert.equal(e.luz[i0], e.luz[i1]); assert.equal(e.luz[i0], e.luz[i2]);
            // en las caras superiores (+Y), ningún triángulo cruza x = 4 (sol) ni z = 3 (luz)
            if (e.normal[i0 * 3 + 1] !== 1) continue;
            const xs = [i0, i1, i2].map(i => e.position[i * 3]);
            assert.ok(xs.every(x => x <= 4) || xs.every(x => x >= 4), 'triángulo cruza x = 4');
            const zs = [i0, i1, i2].map(i => e.position[i * 3 + 2]);
            assert.ok(zs.every(z => z <= 3) || zs.every(z => z >= 3), 'triángulo cruza z = 3');
            solVistos.add(e.sol[i0]); luzVistas.add(e.luz[i0]);
        }
    }
    assert.ok(solVistos.size >= 2 && luzVistas.size >= 2, 'hay sol y luz distintos en la malla');
});

test('si el atlas combinado no entra en LADO_MAX_ATLAS, combinarLado lanza un error claro', () => {
    const grande = { ancho: LADO_MAX_ATLAS + 1, alto: 1, datos: new Float32Array((LADO_MAX_ATLAS + 1) * 4) };
    const entrada = {
        tipo: TIPO_ATLAS, conTinte: false,
        position: new Float32Array(3 * 3), normal: new Float32Array(9), uv: new Float32Array(6),
        sol: new Float32Array(3), luz: new Float32Array(3), region: new Float32Array(12),
        index: new Uint16Array([0, 1, 2]), color: null, atlas: grande,
    };
    assert.throws(() => combinarLado([[entrada]]), /excede el máximo/);
});
