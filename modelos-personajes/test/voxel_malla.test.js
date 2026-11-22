import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  PARTES_VOXEL, rigVoxel, posModeloVoxel, mallaVoxelGreedy, generadorSembrado, personajeAleatorio,
} from '../src/geometria/index.js';
import { piezasVoxelRigidas, geometriaVoxel, cuboVoxel } from '../src/three/voxel.js';

const R = generadorSembrado(4242);
const cfgs = [
  { piel: '#e0a878', pelo: 2, pelocolor: 1, remera: 3, pantalon: 0, calzado: 2 },
  { piel: '#8d5524', pelo: 1, pelocolor: 3, remera: 4, pantalon: 4, calzado: 1 },
  { piel: '#c68642', pelo: 4, pelocolor: 0, remera: 6, pantalon: 1, calzado: 3 },
  ...Array.from({ length: 5 }, () => personajeAleatorio(R)),
];
const r3 = x => Math.round(x * 1000);
const triangulos = g => g.index.count / 3;

// Caras unitarias visibles de una lista de voxels (vecino vacío en la misma lista), como texto ordenable.
function carasEsperadas(vox, marco, pivote) {
  const ocupado = new Set(vox.map(v => `${v.x},${v.y},${v.z}`));
  const out = [];
  // dirección en el modelo [nx, ny, nz] y el vecino en coordenadas de voxel (Y del modelo = v.z, Z = v.y)
  const dirs = [[[1, 0, 0], [1, 0, 0]], [[-1, 0, 0], [-1, 0, 0]], [[0, 1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, -1]], [[0, 0, 1], [0, 1, 0]], [[0, 0, -1], [0, -1, 0]]];
  for (const v of vox) {
    const c = new THREE.Color(v.c);
    const p = posModeloVoxel(v, marco);
    for (const [n, dv] of dirs) {
      if (ocupado.has(`${v.x + dv[0]},${v.y + dv[1]},${v.z + dv[2]}`)) continue;
      const centro = [0, 1, 2].map(e => r3(p[e] - pivote[e] + n[e] / 2));
      out.push(`${centro}|${n}|${c.r.toFixed(5)},${c.g.toFixed(5)},${c.b.toFixed(5)}`);
    }
  }
  return out.sort();
}

// Caras unitarias que cubren los rectángulos de la geometría (cada 6 índices = un rectángulo).
function carasDeGeometria(g) {
  const pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, idx = g.index.array;
  const out = [];
  for (let q = 0; q < idx.length; q += 6) {
    const vs = [...new Set(Array.from(idx.subarray(q, q + 6)))];
    assert.equal(vs.length, 4);
    const n = [nor.getX(vs[0]), nor.getY(vs[0]), nor.getZ(vs[0])];
    const c = `${col.getX(vs[0]).toFixed(5)},${col.getY(vs[0]).toFixed(5)},${col.getZ(vs[0]).toFixed(5)}`;
    for (const v of vs) assert.equal(`${col.getX(v).toFixed(5)},${col.getY(v).toFixed(5)},${col.getZ(v).toFixed(5)}`, c);
    const lo = [0, 1, 2].map(e => Math.min(...vs.map(v => pos.getComponent(v, e))));
    const hi = [0, 1, 2].map(e => Math.max(...vs.map(v => pos.getComponent(v, e))));
    const d = n.findIndex(x => x !== 0), u = (d + 1) % 3, w = (d + 2) % 3;
    assert.ok(Math.abs(hi[d] - lo[d]) < 1e-4);
    const nu = Math.round(hi[u] - lo[u]), nw = Math.round(hi[w] - lo[w]);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nw; j++) {
      const centro = [0, 0, 0];
      centro[d] = r3(lo[d]); centro[u] = r3(lo[u] + i + 0.5); centro[w] = r3(lo[w] + j + 0.5);
      out.push(`${centro}|${n}|${c}`);
    }
  }
  return out.sort();
}

// Volumen encerrado (teorema de la divergencia): con la superficie cerrada y bien orientada = voxels.
function volumen(g) {
  const p = g.attributes.position, idx = g.index.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let v = 0;
  for (let t = 0; t < idx.length; t += 3) {
    a.fromBufferAttribute(p, idx[t]); b.fromBufferAttribute(p, idx[t + 1]); c.fromBufferAttribute(p, idx[t + 2]);
    v += a.dot(b.clone().cross(c)) / 6;
  }
  return v;
}

test('mallaVoxelGreedy: un bloque de un color son 6 rectángulos', () => {
  const celdas = [], claves = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 2; y++) { celdas.push(x, y, 0); claves.push(1); }
  const m = mallaVoxelGreedy(celdas, claves);
  assert.equal(m.indices.length, 6 * 6);
  assert.equal(m.claves.length, 24);                     // 4 vértices por cara (normales distintas)
  assert.ok(m.indices instanceof Uint16Array);
  // dos colores en tablero no se funden entre sí, pero se quitan las caras internas
  const t = mallaVoxelGreedy([0, 0, 0, 1, 0, 0], [1, 2]);
  assert.equal(t.indices.length, 10 * 6);
  assert.equal(mallaVoxelGreedy([], []).indices.length, 0);
});

test('piezasVoxelRigidas: mucho menos vértices y triángulos que un cubo por voxel', () => {
  let antesV = 0, antesT = 0, despuesV = 0, despuesT = 0;
  for (const cfg of cfgs) {
    const { porParte } = rigVoxel(cfg);
    const { geometrias } = piezasVoxelRigidas(cfg);
    PARTES_VOXEL.forEach((k, i) => {
      const n = porParte[k].length;
      antesV += n * 24; antesT += n * 12;
      despuesV += geometrias[i].attributes.position.count; despuesT += triangulos(geometrias[i]);
      assert.ok(geometrias[i].attributes.position.count < n * 24 / 5, `${k}: pocos vértices`);
    });
  }
  assert.ok(despuesV * 10 < antesV, `vértices ${antesV} -> ${despuesV}`);
  assert.ok(despuesT * 8 < antesT, `triángulos ${antesT} -> ${despuesT}`);
});

test('piezasVoxelRigidas: mismas caras visibles, colores, límites y volumen que los cubos sueltos', () => {
  for (const cfg of cfgs) {
    const { marco, pivotes, porParte } = rigVoxel(cfg);
    const { geometrias } = piezasVoxelRigidas(cfg);
    PARTES_VOXEL.forEach((k, i) => {
      const g = geometrias[i], vox = porParte[k];
      assert.deepEqual(Object.keys(g.attributes).sort(), ['acabado', 'color', 'normal', 'position']);
      assert.deepEqual(carasDeGeometria(g), carasEsperadas(vox, marco, pivotes[k]));
      assert.ok(Math.abs(volumen(g) - vox.length) < 1e-2, `${k}: volumen ${volumen(g)} != ${vox.length}`);
      // límites iguales a fusionar un cuboVoxel por voxel (el paquete hasta 0.7.x)
      const cubos = mergeGeometries(vox.map(v => cuboVoxel(v, marco, pivotes[k])), false);
      cubos.computeBoundingBox();
      assert.ok(g.boundingBox.min.distanceTo(cubos.boundingBox.min) < 1e-5);
      assert.ok(g.boundingBox.max.distanceTo(cubos.boundingBox.max) < 1e-5);
      // mismo acabado que cuboVoxel
      const a = g.attributes.acabado, ac = cubos.attributes.acabado;
      assert.deepEqual([a.getX(0), a.getY(0), a.getZ(0)], [ac.getX(0), ac.getY(0), ac.getZ(0)]);
    });
  }
});

test('geometriaVoxel: triángulos antihorarios vistos desde afuera (coinciden con la normal)', () => {
  const { marco, pivotes, porParte } = rigVoxel(cfgs[0]);
  const g = geometriaVoxel(porParte.body, marco, pivotes.body);
  const p = g.attributes.position, nor = g.attributes.normal, idx = g.index.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    a.fromBufferAttribute(p, idx[t]); b.fromBufferAttribute(p, idx[t + 1]); c.fromBufferAttribute(p, idx[t + 2]);
    n.fromBufferAttribute(nor, idx[t]);
    assert.ok(b.sub(a).cross(c.sub(a)).dot(n) > 0);
  }
});
