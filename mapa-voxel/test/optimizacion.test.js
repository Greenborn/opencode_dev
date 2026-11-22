// Contorno mínimo (sin T-junctions), vértices compartidos, triangulación sin
// vértice central, caras nunca visibles (alturaMinimaCamara) y omitir atributos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mallarChunk } from '../src/mallador.js';
import { MapaVoxel } from '../src/mapa.js';
import { crearMallaLado } from '../src/three.js';

function rng(seed) {
    return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function chunk(cx, cz, A, ALTO, fn, tintes = null) {
    const datos = new Uint8Array(A * ALTO * A);
    for (let x = 0; x < A; x++) for (let y = 0; y < ALTO; y++) for (let z = 0; z < A; z++) {
        datos[(x * ALTO + y) * A + z] = fn(x, y, z);
    }
    return { cx, cz, ancho: A, alto: ALTO, profundidad: A, datos, tintes };
}

const sinVecinos = () => undefined;
const entradas = s => [...s.opacos, ...s.transparentes];

/** Recorre los triángulos de una lista de entradas: cb(pa, pb, pc, entrada, ia, ib, ic). */
function cadaTriangulo(lista, cb) {
    for (const e of lista) {
        const p = e.position;
        for (let t = 0; t < e.index.length; t += 3) {
            const [a, b, c] = [e.index[t], e.index[t + 1], e.index[t + 2]];
            cb([p[a * 3], p[a * 3 + 1], p[a * 3 + 2]], [p[b * 3], p[b * 3 + 1], p[b * 3 + 2]], [p[c * 3], p[c * 3 + 1], p[c * 3 + 2]], e, a, b, c);
        }
    }
}

function cruz(a, b, c) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

/** Aristas con un número impar de triángulos (agujero o T-junction). */
function aristasAbiertas(lista) {
    const aristas = new Map();
    const clave = p => p.map(x => x.toFixed(4)).join(',');
    cadaTriangulo(lista, (a, b, c) => {
        const ps = [a, b, c];
        for (let k = 0; k < 3; k++) {
            const x = clave(ps[k]), y = clave(ps[(k + 1) % 3]);
            const e = x < y ? x + '|' + y : y + '|' + x;
            aristas.set(e, (aristas.get(e) ?? 0) + 1);
        }
    });
    return [...aristas.values()].filter(n => n % 2 !== 0).length;
}

/** Área por (normal, tipo, tinte, sol): la "imagen" de la malla. */
function firma(lista) {
    const area = new Map();
    cadaTriangulo(lista, (a, b, c, e, ia) => {
        const n = cruz(a, b, c);
        const ar = Math.hypot(...n) / 2;
        const col = e.color ? [0, 1, 2].map(k => e.color[ia * 3 + k]).join(',') : '-';
        const k = [e.normal[ia * 3], e.normal[ia * 3 + 1], e.normal[ia * 3 + 2], e.tipo, col, e.sol[ia]].join('|');
        area.set(k, (area.get(k) ?? 0) + ar);
    });
    return area;
}

const vertices = lista => lista.reduce((n, e) => n + e.position.length / 3, 0);
const triangulos = lista => lista.reduce((n, e) => n + e.index.length / 3, 0);

test('rectángulo interior sin T-junctions: sólo sus 4 esquinas y 2 triángulos', () => {
    // losa de 6x6 en y=0 que no toca los bordes del chunk de 8
    const c = chunk(0, 0, 8, 4, (x, y, z) => (y === 0 && x >= 1 && x <= 6 && z >= 1 && z <= 6 ? 1 : 0));
    const s = mallarChunk(c, sinVecinos);
    const e = s.opacos[0];
    let arriba = 0, triArriba = 0;
    for (let i = 0; i < e.normal.length / 3; i++) if (e.normal[i * 3 + 1] === 1) arriba++;
    cadaTriangulo([e], (a, b, cc, en, ia) => { if (en.normal[ia * 3 + 1] === 1) triArriba++; });
    assert.equal(arriba, 4);
    assert.equal(triArriba, 2);
    // 6 caras de la losa: 6 x 4 vértices, 12 triángulos
    assert.equal(vertices(s.opacos), 24);
    assert.equal(triangulos(s.opacos), 12);
});

test('T-junction: la esquina de una cara vecina parte la arista larga', () => {
    // piso 6x6 de tipo 1 con un bloque de tipo 2 encima en el medio: el contorno
    // del agujero del techo del piso lleva las esquinas del bloque
    const c = chunk(0, 0, 8, 4, (x, y, z) => {
        if (y === 0 && x >= 1 && x <= 6 && z >= 1 && z <= 6) return 1;
        if (y === 1 && x === 3 && z === 3) return 2;
        return 0;
    });
    const s = mallarChunk(c, sinVecinos);
    assert.equal(aristasAbiertas(entradas(s)), 0, 'sin agujeros ni T-junctions');
});

test('malla cerrada entre chunks con tintes e iluminación aleatorios', () => {
    const T = 6, ALTO = 5;
    const rnd = rng(4242);
    const m = new MapaVoxel({
        tamanoChunk: T, alto: ALTO,
        paletaTintes: [null, [1, 0, 0], [0, 1, 0], [0, 0, 1]],
        iluminacion: info => ({ sol: ((info.x * 7 + info.y * 3 + info.z * 5 + info.eje) % 4) / 3 }),
    });
    for (let cx = 0; cx < 2; cx++) for (let cz = 0; cz < 2; cz++) {
        const datos = new Uint8Array(T * ALTO * T), tintes = new Uint16Array(T * ALTO * T);
        for (let k = 0; k < datos.length; k++) {
            datos[k] = rnd() < 0.45 ? 1 + Math.floor(rnd() * 2) : 0;
            tintes[k] = Math.floor(rnd() * 4);
        }
        m.setChunk(cx, cz, datos, tintes);
    }
    m.mallarPendientes();
    const lista = [...m.salidas.values()].flatMap(entradas);
    assert.equal(aristasAbiertas(lista), 0, 'cada arista en un número par de triángulos, también en los bordes de chunk');
    let degenerados = 0, invertidos = 0;
    cadaTriangulo(lista, (a, b, c, e, ia) => {
        const n = cruz(a, b, c);
        if (Math.hypot(...n) < 1e-9) degenerados++;
        else if (n[0] * e.normal[ia * 3] + n[1] * e.normal[ia * 3 + 1] + n[2] * e.normal[ia * 3 + 2] <= 0) invertidos++;
    });
    assert.equal(degenerados, 0);
    assert.equal(invertidos, 0);
});

test('malla cerrada entre chunks en un relieve (rectángulos grandes que tocan los bordes)', () => {
    const T = 8, ALTO = 6;
    const rnd = rng(31);
    // alturas por bloques de 3x3 columnas: caras grandes, escalones y T-junctions en los bordes de chunk
    const alturas = [];
    for (let k = 0; k < 36; k++) alturas.push(1 + Math.floor(rnd() * (ALTO - 1)));
    const altura = (x, z) => alturas[Math.floor(x / 3) * 6 + Math.floor(z / 3)];
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO, alturaMinimaCamara: 0 });
    for (let cx = 0; cx < 2; cx++) for (let cz = 0; cz < 2; cz++) {
        const datos = new Uint8Array(T * ALTO * T);
        for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) {
            const h = altura(cx * T + x, cz * T + z);
            for (let y = 0; y < h; y++) datos[(x * ALTO + y) * T + z] = y === h - 1 ? 2 : 1;
        }
        m.setChunk(cx, cz, datos);
    }
    m.mallarPendientes();
    const lista = [...m.salidas.values()].flatMap(entradas);
    // sin la cara inferior (alturaMinimaCamara) la malla queda abierta sólo en el plano y = 0
    const abiertas = new Map();
    const clave = p => p.map(x => x.toFixed(4)).join(',');
    cadaTriangulo(lista, (a, b, c) => {
        const ps = [a, b, c];
        for (let k = 0; k < 3; k++) {
            const x = clave(ps[k]), y = clave(ps[(k + 1) % 3]);
            const e = x < y ? x + '|' + y : y + '|' + x;
            abiertas.set(e, { n: (abiertas.get(e)?.n ?? 0) + 1, y0: ps[k][1] === 0 && ps[(k + 1) % 3][1] === 0 });
        }
    });
    const malas = [...abiertas.values()].filter(v => v.n % 2 !== 0 && !v.y0).length;
    assert.equal(malas, 0);
});

test('contorno mínimo: misma superficie por normal/tipo/color/sol que el completo, con menos vértices', () => {
    const rnd = rng(99);
    const A = 8, ALTO = 6;
    const tintes = new Uint16Array(A * ALTO * A);
    for (let k = 0; k < tintes.length; k++) tintes[k] = rnd() < 0.3 ? 1 : 0;
    const c = chunk(0, 0, A, ALTO, (x, y) => (y === 0 || rnd() < 0.25 ? 1 : 0), tintes);
    const opts = { paletaTintes: [null, [0.5, 0.2, 0.1]], iluminacion: info => ({ sol: info.sentido > 0 ? 1 : 0.4 }) };
    const nueva = entradas(mallarChunk(c, sinVecinos, opts));
    const vieja = entradas(mallarChunk(c, sinVecinos, { ...opts, contornoCompleto: true }));
    const fa = firma(nueva), fb = firma(vieja);
    assert.equal(fa.size, fb.size);
    for (const [k, v] of fb) assert.ok(Math.abs((fa.get(k) ?? 0) - v) < 1e-6, 'área de ' + k);
    assert.ok(vertices(nueva) < vertices(vieja), `${vertices(nueva)} < ${vertices(vieja)}`);
    assert.ok(triangulos(nueva) < triangulos(vieja));
    assert.equal(aristasAbiertas(vieja), 0);
});

test('los vértices con atributos idénticos se comparten', () => {
    const rnd = rng(7);
    const c = chunk(0, 0, 8, 4, () => (rnd() < 0.5 ? 1 : 0));
    for (const e of entradas(mallarChunk(c, sinVecinos))) {
        const vistos = new Set();
        let repetidos = 0;
        for (let i = 0; i < e.position.length / 3; i++) {
            const k = [...e.position.subarray(i * 3, i * 3 + 3), ...e.normal.subarray(i * 3, i * 3 + 3), e.sol[i], e.luz[i]].join(',');
            if (vistos.has(k)) repetidos++;
            vistos.add(k);
        }
        assert.equal(repetidos, 0);
    }
});

test('alturaMinimaCamara omite las caras -Y en planos <= valor y no evalúa su iluminación', () => {
    // suelo en y=1 (agua debajo en y=0 en una franja) y un voxel flotante en y=3
    const c = chunk(0, 0, 4, 5, (x, y, z) => (y === 1 || (y === 0 && x === 0) || (y === 3 && x === 2 && z === 2) ? 1 : 0));
    let llamadasAbajoBajas = 0;
    const iluminacion = info => { if (info.sentido < 0 && info.eje === 1 && info.y < 2) llamadasAbajoBajas++; return { sol: 1 }; };
    const s = mallarChunk(c, sinVecinos, { alturaMinimaCamara: 2, iluminacion });
    const planosAbajo = new Set();
    for (const e of entradas(s)) {
        for (let i = 0; i < e.normal.length / 3; i++) if (e.normal[i * 3 + 1] === -1) planosAbajo.add(e.position[i * 3 + 1]);
    }
    assert.deepEqual([...planosAbajo], [3], 'sólo queda la cara inferior del voxel flotante');
    assert.equal(llamadasAbajoBajas, 0);
    const sinOpcion = mallarChunk(c, sinVecinos);
    assert.ok(vertices(entradas(sinOpcion)) > vertices(entradas(s)));
});

test('MapaVoxel y el worker reciben alturaMinimaCamara', () => {
    const T = 4, ALTO = 4;
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO, alturaMinimaCamara: 1 });
    const datos = new Uint8Array(T * ALTO * T);
    for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) datos[(x * ALTO) * T + z] = 1;
    m.setChunk(0, 0, datos);
    m.mallarPendientes();
    const e = m.salida(0, 0).opacos[0];
    assert.ok(![...e.normal].some((v, i) => i % 3 === 1 && v === -1), 'sin caras -Y');
});

test('crearMallaLado con omitir no sube esos atributos', () => {
    const THREE = {
        BufferAttribute: class { constructor(arr, size) { this.array = arr; this.itemSize = size; } },
        BufferGeometry: class {
            constructor() { this.attributes = {}; this.groups = []; }
            setAttribute(n, a) { this.attributes[n] = a; }
            setIndex(a) { this.index = a; }
            addGroup() {} clearGroups() {} computeBoundingSphere() {}
        },
        Mesh: class { constructor(g, m) { this.geometry = g; this.material = m; } },
    };
    const m = new MapaVoxel({ tamanoChunk: 4, alto: 4, paletaTintes: [null, [1, 1, 0]] });
    const datos = new Uint8Array(64).fill(1), tintes = new Uint16Array(64).fill(1);
    m.setChunk(0, 0, datos, tintes);
    m.mallarPendientes();
    const mesh = crearMallaLado(THREE, m.combinarTodo().opacos, { materialDe: () => ({}), omitir: ['uv', 'luz'] });
    assert.deepEqual(Object.keys(mesh.geometry.attributes).sort(), ['color', 'normal', 'position', 'sol']);
});
