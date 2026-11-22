// Pruebas del adaptador three.js: la optimización de vértices no cambia lo que se ve. Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ESPECIES, especificarArbol } from '../src/index.js';
import { geometriaArbol, geometriaDePrimitiva } from '../src/three/index.js';

// Geometría "cruda" de referencia (como la 0.1.0): todas las primitivas de un acabado, sin fusionar ni quitar nada.
function cruda(especie, semilla) {
    return especificarArbol(especie, { semilla }).partes.map(({ slot, primitivas }) =>
        ({ slot, geometria: mergeGeometries(primitivas.map(p => geometriaDePrimitiva(THREE, p)), false) }));
}
const contar = partes => partes.reduce((a, { geometria: g }) => {
    a.v += g.attributes.position.count; a.t += g.index.count / 3; return a;
}, { v: 0, t: 0 });

test('menos vértices y triángulos que la geometría cruda, en todas las especies', () => {
    const tot = { v0: 0, v1: 0, t0: 0, t1: 0 };
    for (const esp of ESPECIES) for (let s = 1; s <= 3; s++) {
        const a = contar(cruda(esp, s)), b = contar(geometriaArbol(THREE, esp, { semilla: s }).partes);
        assert.ok(b.v < a.v, `${esp}/${s}: ${b.v} >= ${a.v} vértices`);
        assert.ok(b.t <= a.t, `${esp}/${s}: ${b.t} > ${a.t} triángulos`);
        tot.v0 += a.v; tot.v1 += b.v; tot.t0 += a.t; tot.t1 += b.t;
    }
    assert.ok(tot.v1 < tot.v0 * 0.7, `reducción total de vértices insuficiente: ${tot.v1}/${tot.v0}`);
});

test('sin quitarOcultos conserva todos los triángulos (sólo comparte vértices y quita uv)', () => {
    for (const esp of ESPECIES) {
        const a = contar(cruda(esp, 5)), b = contar(geometriaArbol(THREE, esp, { semilla: 5, quitarOcultos: false }).partes);
        assert.equal(b.t, a.t, esp);
        assert.ok(b.v < a.v, esp);
    }
});

test('misma caja, mismos acabados y atributos position/normal/color, sin uv', () => {
    for (const esp of ESPECIES) {
        const ref = cruda(esp, 9), geo = geometriaArbol(THREE, esp, { semilla: 9 });
        const caja = new THREE.Box3();
        for (const { geometria } of ref) { geometria.computeBoundingBox(); caja.union(geometria.boundingBox); }
        assert.ok(geo.caja.min.distanceTo(caja.min) < 1e-6 && geo.caja.max.distanceTo(caja.max) < 1e-6, esp);
        for (const { geometria: g } of geo.partes) {
            assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position'], esp);
        }
        const slots = new Set(geo.partes.map(p => p.slot));
        for (const s of slots) assert.ok(ref.some(r => r.slot === s), esp);
    }
});

test('los triángulos que quedan son los originales: mismos vértices y color (no se inventa geometría)', () => {
    // Cada triángulo que queda debe existir en la geometría cruda (mismos vértices y color): no se inventa nada.
    const clave = (g, i) => {
        const p = g.attributes.position, c = g.attributes.color, r = x => Math.round(x * 1e4);
        return [r(p.getX(i)), r(p.getY(i)), r(p.getZ(i)), r(c.getX(i)), r(c.getY(i)), r(c.getZ(i))].join(',');
    };
    const tris = g => {
        const ix = g.index.array, out = new Set();
        for (let t = 0; t < ix.length; t += 3) out.add([clave(g, ix[t]), clave(g, ix[t + 1]), clave(g, ix[t + 2])].join('|'));
        return out;
    };
    for (const esp of ESPECIES) {
        const ref = cruda(esp, 3), geo = geometriaArbol(THREE, esp, { semilla: 3 });
        for (const { slot, geometria } of geo.partes) {
            const r = tris(ref.find(x => x.slot === slot).geometria);
            for (const t of tris(geometria)) assert.ok(r.has(t), `${esp}: triángulo nuevo en acabado ${slot}`);
        }
    }
});

test('la geometría se cachea por opciones', () => {
    const a = geometriaArbol(THREE, 'roble', { semilla: 11 });
    assert.equal(geometriaArbol(THREE, 'roble', { semilla: 11 }), a);
    assert.notEqual(geometriaArbol(THREE, 'roble', { semilla: 11, quitarOcultos: false }), a);
});
