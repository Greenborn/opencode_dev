// Atlas: paleta de texels y atlas de caras (color por texel de voxel).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mallarChunk } from '../src/mallador.js';
import { MapaVoxel } from '../src/mapa.js';
import { construirAtlas, uvDeTexel, TIPO_ATLAS } from '../src/atlas.js';
import { crearMallaLado, crearTexturaAtlas, crearMaterialAtlas, cacheDeMateriales } from '../src/three.js';

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

const PALETA = [null, [1, 0, 0], [0, 1, 0], [0, 0, 1]];

/** Color RGB que la textura devuelve en el UV dado (muestreo NearestFilter). */
function muestrear(atlas, u, v) {
    const x = Math.floor(u * atlas.ancho), y = Math.floor(v * atlas.alto);
    const i = (y * atlas.ancho + x) * 4;
    return [atlas.datos[i], atlas.datos[i + 1], atlas.datos[i + 2]];
}

/** Igualdad con tolerancia (el atlas es Float32). */
const iguales = (a, b, msg) => { assert.equal(a.length, b.length, msg); a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < 1e-6, msg + ` [${i}]`)); };

function cadaTriangulo(lista, cb) {
    for (const e of lista) {
        const p = e.position;
        for (let t = 0; t < e.index.length; t += 3) {
            const [a, b, c] = [e.index[t], e.index[t + 1], e.index[t + 2]];
            cb([p[a * 3], p[a * 3 + 1], p[a * 3 + 2]], [p[b * 3], p[b * 3 + 1], p[b * 3 + 2]], [p[c * 3], p[c * 3 + 1], p[c * 3 + 2]], e, a, b, c);
        }
    }
}

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

function chunk(A, ALTO, fn, tintes = null) {
    const datos = new Uint8Array(A * ALTO * A);
    for (let x = 0; x < A; x++) for (let y = 0; y < ALTO; y++) for (let z = 0; z < A; z++) datos[(x * ALTO + y) * A + z] = fn(x, y, z);
    return { cx: 0, cz: 0, ancho: A, alto: ALTO, profundidad: A, datos, tintes };
}

test('el atlas devuelve el color correcto para cada tipo y tinte', () => {
    const colorTipos = [null, [0.5, 0.5, 0.5], [0.2, 0.4, 0.6]];
    const atlas = construirAtlas({ paletaTintes: PALETA, colorTipos });
    assert.equal(atlas.K, 4);
    for (const tipo of [1, 2, 5]) {
        for (let tinte = 0; tinte < 4; tinte++) {
            const [u, v] = uvDeTexel(atlas, tipo, tinte);
            const esperado = tinte > 0 ? PALETA[tinte] : (colorTipos[tipo] ?? [1, 1, 1]);
            iguales(muestrear(atlas, u, v), esperado, `tipo ${tipo} tinte ${tinte}`);
        }
    }
    // tinte fuera de la paleta se trata como sin tinte
    assert.deepEqual(uvDeTexel(atlas, 2, 9), uvDeTexel(atlas, 2, 0));
});

test('las UV de cada cara caen dentro del texel de su variante', () => {
    const atlas = construirAtlas({ paletaTintes: PALETA });
    for (let tipo = 0; tipo < 256; tipo += 37) for (let tinte = 0; tinte < 4; tinte++) {
        const [u, v] = uvDeTexel(atlas, tipo, tinte);
        const i = tipo * atlas.K + tinte, x = i % atlas.ancho, y = Math.floor(i / atlas.ancho);
        assert.ok(u > x / atlas.ancho && u < (x + 1) / atlas.ancho, 'u dentro del texel');
        assert.ok(v > y / atlas.alto && v < (y + 1) / atlas.alto, 'v dentro del texel');
    }
});

test('con atlas de caras: sin color por vértice; region y uvCara por vértice; un buffer por lado', () => {
    const rnd = rng(11);
    const c = chunk(8, 4, (x, y, z) => (y === 0 || rnd() < 0.3 ? 1 + Math.floor(rnd() * 3) : 0), null);
    c.tintes = new Uint16Array(c.datos.length).map(() => (rnd() < 0.4 ? 1 + Math.floor(rnd() * 3) : 0));
    const s = mallarChunk(c, () => undefined, { paletaTintes: PALETA, atlas: construirAtlas({ paletaTintes: PALETA }) });
    const entradas = [...s.opacos, ...s.transparentes];
    assert.ok(entradas.length > 0);
    for (const e of entradas) {
        assert.equal(e.color, null);
        assert.equal(e.tipo, TIPO_ATLAS);
        assert.equal(e.region.length, e.position.length / 3 * 4);
        assert.equal(e.uv.length, e.position.length / 3 * 2);
        // la posición local cae dentro del rectángulo (0..w, 0..h) de su bloque
        for (let i = 0; i < e.uv.length / 2; i++) {
            assert.ok(e.uv[i * 2] >= 0 && e.uv[i * 2] <= e.region[i * 4 + 2]);
            assert.ok(e.uv[i * 2 + 1] >= 0 && e.uv[i * 2 + 1] <= e.region[i * 4 + 3]);
        }
    }
});

test('con atlas la malla sigue cerrada entre chunks con tintes e iluminación', () => {
    const T = 6, ALTO = 5, rnd = rng(4242);
    const m = new MapaVoxel({
        tamanoChunk: T, alto: ALTO, paletaTintes: PALETA, atlas: true,
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
    const lista = [...m.salidas.values()].flatMap(s => [...s.opacos, ...s.transparentes]);
    assert.equal(aristasAbiertas(lista), 0);
});

test('con atlas de caras, el color de cada voxel de la cara sale del texel del bloque (ver atlas_caras.test.js)', () => {
    const rnd = rng(99);
    const A = 8, ALTO = 6;
    const tintes = new Uint16Array(A * ALTO * A);
    for (let k = 0; k < tintes.length; k++) tintes[k] = rnd() < 0.3 ? 1 + Math.floor(rnd() * 3) : 0;
    const c = chunk(A, ALTO, (x, y) => (y === 0 || rnd() < 0.25 ? 1 : 0), tintes);
    const atlas = construirAtlas({ paletaTintes: PALETA });
    const s = mallarChunk(c, () => undefined, { paletaTintes: PALETA, atlas });
    assert.equal(aristasAbiertas([...s.opacos, ...s.transparentes]), 0);
});

test('MapaVoxel con atlas: una sola geometría por lado y sin atributo color', () => {
    const m = new MapaVoxel({ tamanoChunk: 4, alto: 4, paletaTintes: PALETA, atlas: true, modo: 'estatico' });
    const datos = new Uint8Array(64);
    for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) datos[(x * 4) * 4 + z] = x < 2 ? 1 : 2;
    m.setChunk(0, 0, datos, new Uint16Array(64).fill(2));
    m.congelar();
    const comb = m.combinarTodo();
    assert.equal(comb.opacos.grupos.length, 1, 'un solo grupo (un material) por lado');
    assert.equal(comb.opacos.color, null);
});

test('three: textura del atlas sin mipmaps y material único; cacheDeMateriales lo reutiliza', () => {
    const THREE = {
        RGBAFormat: 1, FloatType: 2, NearestFilter: 3,
        DataTexture: class { constructor(d, w, h, f, t) { Object.assign(this, { d, w, h, f, t, needsUpdate: false }); } },
        MeshLambertMaterial: class { constructor(o) { Object.assign(this, o); } },
        BufferAttribute: class { constructor(a, s) { this.array = a; this.itemSize = s; } },
        BufferGeometry: class { constructor() { this.attributes = {}; this.groups = []; } setAttribute(n, a) { this.attributes[n] = a; } setIndex(a) { this.index = a; } addGroup(s, c, m) { this.groups.push({ s, c, m }); } clearGroups() { this.groups = []; } computeBoundingSphere() {} },
        Mesh: class { constructor(g, m) { this.geometry = g; this.material = m; } },
    };
    const atlas = construirAtlas({ paletaTintes: PALETA });
    const tex = crearTexturaAtlas(THREE, atlas);
    assert.equal(tex.magFilter, THREE.NearestFilter);
    assert.equal(tex.minFilter, THREE.NearestFilter);
    assert.equal(tex.generateMipmaps, false);
    assert.equal(tex.t, THREE.FloatType);
    assert.equal(tex.colorSpace, undefined, 'datos lineales: sin colorSpace sRGB');
    const mat = crearMaterialAtlas(THREE, atlas, { roughness: 0.8 });
    assert.equal(mat.map.w, atlas.ancho);
    assert.equal(mat.roughness, 0.8);
    const materialDe = cacheDeMateriales(() => mat);
    assert.equal(materialDe(TIPO_ATLAS, false, 'opacos'), materialDe(TIPO_ATLAS, false, 'opacos'));
});
