// Geometría three.js de los accesorios: caras fusionadas (greedy) con el mismo aspecto que un cubo por voxel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rigVoxel, voxelesPersonaje } from '@greenborn/modelos-personajes/geometria';
import { crearPersonajeVoxel, cuboVoxel } from '@greenborn/modelos-personajes/three';
import { voxelesAccesorios, adjuntarAccesorios } from '../src/index.js';
import '../src/three.js';

const MAT = new THREE.MeshBasicMaterial();   // en Node no hay NodeMaterial (WebGPU): material propio
const base = { piel: '#e0a878', pelo: 0, pelocolor: 0, remera: 0, pantalon: 0, calzado: 0 };
const CFGS = [
    { ...base, mano: 1, semillaCanasta: 42 },
    { ...base, cabeza: 1, lentes: 1, mano: 1, semillaCanasta: 7 },
    { ...base, cabeza: 2, cabezaColor: 1, lentes: 1, mano: 1, semillaCanasta: 3 },
];

// Área por (normal, color) de las caras visibles: con cubos, se cuentan sólo las caras sin vecino en la lista.
function firmaCubos(vox) {
    const ocup = new Set(vox.map(v => `${v.x},${v.y},${v.z}`)), f = new Map();
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const v of vox) for (const [dx, dy, dz] of dirs) {
        if (ocup.has(`${v.x + dx},${v.y + dy},${v.z + dz}`)) continue;
        const c = new THREE.Color(v.c), n = [dx, dz, dy];   // ejes del modelo: X = x, Y = z (altura), Z = y
        const k = `${n.join(',')}|${c.getHexString()}`;
        f.set(k, (f.get(k) || 0) + 1);
    }
    return f;
}
function firmaMalla(g) {
    const p = g.attributes.position, nr = g.attributes.normal, c = g.attributes.color, ix = g.index.array, f = new Map();
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    for (let t = 0; t < ix.length; t += 3) {
        A.fromBufferAttribute(p, ix[t]); B.fromBufferAttribute(p, ix[t + 1]); C.fromBufferAttribute(p, ix[t + 2]);
        const area = B.clone().sub(A).cross(C.clone().sub(A)).length() / 2;
        const n = [nr.getX(ix[t]), nr.getY(ix[t]), nr.getZ(ix[t])].map(Math.round);
        const k = `${n.join(',')}|${new THREE.Color(c.getX(ix[t]), c.getY(ix[t]), c.getZ(ix[t])).getHexString()}`;
        f.set(k, (f.get(k) || 0) + area);
    }
    return f;
}

test('misma superficie visible por normal y color que un cubo por voxel, con muchos menos vértices', () => {
    for (const cfg of CFGS) {
        const { marco, pivotes } = rigVoxel(cfg), vox = voxelesAccesorios(cfg);
        const pivoteDe = { body: [0, 0, 0], armB: pivotes.armB };
        for (const parte of ['body', 'armB']) {
            if (!vox[parte].length) continue;
            const pers = adjuntarAccesorios({ group: null, partes: { body: new THREE.Group(), armB: new THREE.Group() } }, cfg, { material: MAT });
            const g = pers.partes[parte].children[0].geometry;
            const ref = firmaCubos(vox[parte]), got = firmaMalla(g);
            assert.equal(got.size, ref.size, parte);
            for (const [k, a] of ref) assert.ok(Math.abs((got.get(k) || 0) - a) < 1e-6, `${parte} ${k}: ${got.get(k)} != ${a}`);
            const cubos = mergeGeometries(vox[parte].map(v => cuboVoxel(v, marco, pivoteDe[parte])), false);
            cubos.computeBoundingBox(); g.computeBoundingBox();
            assert.ok(cubos.boundingBox.min.distanceTo(g.boundingBox.min) < 1e-6 && cubos.boundingBox.max.distanceTo(g.boundingBox.max) < 1e-6, parte);
            assert.ok(g.attributes.position.count * 5 < cubos.attributes.position.count, `${parte}: ${g.attributes.position.count} vs ${cubos.attributes.position.count}`);
            for (const a of ['position', 'normal', 'color', 'acabado']) assert.ok(g.attributes[a], a);
        }
    }
});

test('se adjunta al personaje real sin errores', () => {
    const cfg = CFGS[2], pers = crearPersonajeVoxel(cfg, { material: MAT });
    const antes = pers.partes.body.children.length;
    adjuntarAccesorios(pers, cfg, { material: MAT });
    assert.equal(pers.partes.body.children.length, antes + 1);
    assert.ok(voxelesPersonaje);
});
