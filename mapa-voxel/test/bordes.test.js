// Acoplamiento entre chunks (0.6): las aristas de borde se calculan con los datos
// de los vecinos, así que los chunks vecinos casan sin forzar todos los enteros.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MapaVoxel } from '../src/mapa.js';
import { mallarChunk } from '../src/mallador.js';

const T = 4, ALTO = 4;

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

/** Datos aleatorios de un chunk: tipos 0..3 (0 = aire), con algún tinte. */
function datosAleatorios(rnd) {
    const datos = new Uint8Array(T * ALTO * T), tintes = new Uint16Array(T * ALTO * T);
    for (let i = 0; i < datos.length; i++) {
        const r = rnd();
        datos[i] = r < 0.4 ? 0 : 1 + Math.floor(rnd() * 3);
        if (datos[i] && rnd() < 0.2) tintes[i] = 1;
    }
    return { datos, tintes };
}

/** Malla de un conjunto de chunks (mapa de claves "cx_cz") con sus vecinos. */
function mallarTodos(chunks, paletaTintes = [null, [1, 0, 0]]) {
    const vecinos = (cx, cz) => chunks.get(cx + '_' + cz);
    const salidas = [];
    for (const c of chunks.values()) {
        salidas.push(mallarChunk(c, vecinos, { paletaTintes, alturaMinimaCamara: -Infinity }));
    }
    return salidas;
}

/** Aristas (por posición) de todas las caras de las salidas: cada arista debe aparecer un número par de veces. */
function aristasAbiertas(salidas) {
    const cuenta = new Map();
    const key = (i, e) => [0, 1, 2].map(k => e.position[i * 3 + k].toFixed(4)).join(',');
    for (const s of salidas) for (const e of [...s.opacos, ...s.transparentes]) {
        for (let t = 0; t < e.index.length; t += 3) {
            for (let k = 0; k < 3; k++) {
                const a = key(e.index[t + k], e), b = key(e.index[t + (k + 1) % 3], e);
                const id = a < b ? a + '|' + b : b + '|' + a;
                cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
            }
        }
    }
    return [...cuenta.values()].filter(n => n % 2 !== 0).length;
}

/** Firma de la malla de un chunk: posiciones e índices de cada entrada (para comparar salidas). */
function firma(salida) {
    const lados = [salida.opacos, salida.transparentes];
    return JSON.stringify(lados.map(l => l.map(e => [e.tipo, e.conTinte, Array.from(e.position), Array.from(e.index)])));
}

test('chunks vecinos casan: la malla combinada de un mapa aleatorio no tiene aristas abiertas', () => {
    for (let seed = 1; seed <= 6; seed++) {
        const rnd = rng(seed * 97);
        const chunks = new Map();
        for (let cx = 0; cx < 3; cx++) for (let cz = 0; cz < 3; cz++) {
            const { datos, tintes } = datosAleatorios(rnd);
            chunks.set(cx + '_' + cz, { cx, cz, ancho: T, alto: ALTO, profundidad: T, datos, tintes });
        }
        assert.equal(aristasAbiertas(mallarTodos(chunks)), 0, `semilla ${seed}`);
    }
});

test('T-junction entre chunks: una cara alta del vecino parte la arista del suelo sin romper la malla', () => {
    // suelo de 4x4 en el chunk izquierdo; el derecho tiene un bloque que toca su borde en z=1
    const izq = new Uint8Array(T * ALTO * T), der = new Uint8Array(T * ALTO * T);
    for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) izq[(x * ALTO + 0) * T + z] = 1;
    for (let z = 0; z < T; z++) for (let y = 0; y < 2; y++) der[(0 * ALTO + y) * T + z] = 2;
    der[(0 * ALTO + 0) * T + 1] = 3;
    const chunks = new Map([
        ['0_0', { cx: 0, cz: 0, ancho: T, alto: ALTO, profundidad: T, datos: izq }],
        ['1_0', { cx: 1, cz: 0, ancho: T, alto: ALTO, profundidad: T, datos: der }],
    ]);
    assert.equal(aristasAbiertas(mallarTodos(chunks)), 0);
});

test('remallado: tras editar voxeles de borde, cada chunk coincide con un mapa construido de cero', () => {
    const rnd = rng(4242);
    const copia = new Map();
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO, paletaTintes: [null, [1, 0, 0]] });
    for (let cx = 0; cx < 3; cx++) for (let cz = 0; cz < 2; cz++) {
        const { datos, tintes } = datosAleatorios(rnd);
        m.setChunk(cx, cz, datos.slice(), tintes.slice());
        copia.set(cx + '_' + cz, { datos: datos.slice(), tintes: tintes.slice() });
    }
    m.mallarPendientes();
    // ediciones en bordes y en el interior (la malla de los vecinos depende de ellas)
    const ediciones = [[0, 1, 0, 2], [T - 1, 2, 1, 0], [T, 0, 0, 3], [2 * T - 1, 1, 2, 1], [T + 2, 3, 1, 0], [T + 1, 1, 1, 2]];
    for (const [x, y, z, tipo] of ediciones) {
        m.setVoxel(x, y, z, tipo);
        const cx = Math.floor(x / T), cz = Math.floor(z / T);
        const lx = x - cx * T, lz = z - cz * T;
        const c = copia.get(cx + '_' + cz);
        c.datos[(lx * ALTO + y) * T + lz] = tipo;
        c.tintes[(lx * ALTO + y) * T + lz] = 0;
    }
    m.mallarPendientes();

    // mapa de referencia construido de cero con los mismos datos
    const ref = new MapaVoxel({ tamanoChunk: T, alto: ALTO, paletaTintes: [null, [1, 0, 0]] });
    for (const [k, c] of copia) {
        const [cx, cz] = k.split('_').map(Number);
        ref.setChunk(cx, cz, c.datos, c.tintes);
    }
    ref.mallarPendientes();
    for (const k of m.chunks.keys()) {
        const [cx, cz] = k.split('_').map(Number);
        assert.equal(firma(m.salida(cx, cz)), firma(ref.salida(cx, cz)), `chunk ${k}`);
    }
});
