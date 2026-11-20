// Cableado del adaptador three.js con un doble mínimo de THREE (sin la librería).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MapaVoxel } from '../src/mapa.js';
import { crearMallaLado, cacheDeMateriales, liberarMalla, crearMallasPorRegion } from '../src/three.js';

const THREE = {
    BufferAttribute: class { constructor(arr, size) { this.array = arr; this.itemSize = size; } },
    BufferGeometry: class {
        constructor() { this.attributes = {}; this.groups = []; this.index = null; this.disposed = false; }
        setAttribute(n, a) { this.attributes[n] = a; }
        setIndex(a) { this.index = a; }
        addGroup(s, c, m) { this.groups.push({ start: s, count: c, materialIndex: m }); }
        clearGroups() { this.groups = []; }
        computeBoundingSphere() {}
        dispose() { this.disposed = true; }
    },
    Mesh: class { constructor(g, m) { this.geometry = g; this.material = m; this.frustumCulled = false; this.parent = null; } },
};

test('crearMallaLado arma atributos, grupos por material y la malla', () => {
    const T = 4, ALTO = 4;
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO, tiposTransparentes: [8] });
    const datos = new Uint8Array(T * ALTO * T);
    for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) datos[(x * ALTO + 0) * T + z] = x < 2 ? 1 : 2;
    m.setChunk(0, 0, datos);
    m.congelar();
    const comb = m.combinarTodo();
    const creados = [];
    const materialDe = cacheDeMateriales((tipo, conTinte, lado) => { const mat = { tipo, conTinte, lado }; creados.push(mat); return mat; });
    const mesh = crearMallaLado(THREE, comb.opacos, { materialDe, lado: 'opacos', nombre: 'suelo' });
    assert.ok(mesh.geometry.attributes.position);
    assert.ok(mesh.geometry.attributes.sol && mesh.geometry.attributes.luz);
    assert.equal(mesh.geometry.index.array.length, comb.opacos.index.length);
    assert.equal(mesh.material.length, 2, 'dos materiales (tipos 1 y 2)');
    assert.equal(mesh.geometry.groups.length, 2);
    assert.equal(mesh.name, 'suelo_opacos');
    // la caché evita crear materiales duplicados
    materialDe(1, false, 'opacos'); materialDe(1, false, 'opacos');
    assert.equal(creados.length, 2);
    liberarMalla(mesh);
    assert.equal(mesh.geometry.disposed, true);
});

test('crearMallaLado con un solo material no usa grupos', () => {
    const T = 4, ALTO = 4;
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO });
    m.setChunk(0, 0, new Uint8Array(T * ALTO * T).fill(3));
    m.congelar();
    const mesh = crearMallaLado(THREE, m.combinarTodo().opacos, { materialDe: () => 'mat' });
    assert.equal(mesh.material, 'mat');
    assert.equal(mesh.geometry.groups.length, 0);
});

test('crearMallasPorRegion genera una malla por región con materiales compartidos', () => {
    const T = 4, ALTO = 4;
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO, modo: 'estatico', regionTamano: 2 });
    for (const [cx, cz] of [[0, 0], [1, 1], [2, 0], [5, 5]]) {
        const datos = new Uint8Array(T * ALTO * T);
        for (let x = 0; x < T; x++) for (let z = 0; z < T; z++) datos[(x * ALTO) * T + z] = 1;
        m.setChunk(cx, cz, datos);
    }
    m.congelar();
    const materialDe = cacheDeMateriales(() => ({}));
    const { opacos, transparentes } = crearMallasPorRegion(THREE, m, { materialDe });
    assert.equal(opacos.length, 3, 'regiones 0_0 (2 chunks), 1_0 y 2_2');
    assert.equal(transparentes.length, 0);
    assert.ok(opacos.every(x => x.material === opacos[0].material), 'material compartido');
});
