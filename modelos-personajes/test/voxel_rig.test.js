import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  PARTES_VOXEL, rigVoxel, pivotesVoxel, angulosVoxelCaminata, escalaVoxelParaAlto, ALTO_VOXEL, voxelesPersonaje,
} from '../src/geometria/index.js';
import {
  crearPersonajeVoxel, animarCaminataVoxel, piezasVoxelRigidas, matrizParteVoxel,
} from '../src/three/voxel.js';

const cfg = { piel: '#e0a878', pelo: 2, pelocolor: 1, remera: 3, pantalon: 0, calzado: 2 };

test('rig: cada voxel cae en una parte y el cuerpo es la mayor parte', () => {
  const { porParte } = rigVoxel(cfg);
  const total = Object.values(porParte).reduce((n, l) => n + l.length, 0);
  assert.equal(total, voxelesPersonaje(cfg).length);
  assert.ok(porParte.body.length > porParte.legA.length);
  assert.ok(porParte.legA.length > 0 && porParte.armB.length > 0);
});

test('rig: pivotes de extremidades a la altura de cadera y hombro, a ambos lados', () => {
  const p = pivotesVoxel(voxelesPersonaje(cfg));
  assert.deepEqual(p.body, [0, 0, 0]);
  assert.equal(p.legA[1], 12);
  assert.equal(p.armA[1], 24);
  assert.ok(p.legA[0] < 0 && p.legB[0] > 0);
  assert.ok(p.armA[0] < 0 && p.armB[0] > 0);
});

test('caminata: piernas y brazos en contrafase, nula con fuerza 0', () => {
  const a = angulosVoxelCaminata(Math.PI / 2, 1);
  assert.ok(Math.abs(a.legA + a.legB) < 1e-9);
  assert.ok(Math.abs(a.armA + a.armB) < 1e-9);
  assert.ok(Math.abs(a.legA) > 0);
  const quieto = angulosVoxelCaminata(1.3, 0);
  assert.ok(PARTES_VOXEL.every(k => Math.abs(quieto[k]) < 1e-12));
});

test('caminata: reutiliza el objeto out con los mismos valores', () => {
  const out = {};
  const r = angulosVoxelCaminata(0.9, 0.6, out);
  assert.equal(r, out);
  assert.deepEqual({ ...out }, angulosVoxelCaminata(0.9, 0.6));
  angulosVoxelCaminata(2.1, 1, out);
  assert.deepEqual({ ...out }, angulosVoxelCaminata(2.1, 1));
});

test('escala: alto deseado se obtiene con escalaVoxelParaAlto', () => {
  assert.equal(escalaVoxelParaAlto(ALTO_VOXEL) * ALTO_VOXEL, ALTO_VOXEL);
  assert.ok(Math.abs(escalaVoxelParaAlto(1.8) * ALTO_VOXEL - 1.8) < 1e-9);
});

test('three: crearPersonajeVoxel tiene las 5 partes con geometría y atributo acabado', () => {
  const { group, partes } = crearPersonajeVoxel(cfg, { material: new THREE.MeshBasicMaterial() });
  assert.deepEqual(Object.keys(partes).sort(), [...PARTES_VOXEL].sort());
  const { geometrias } = piezasVoxelRigidas(cfg);
  for (const g of geometrias) {
    assert.ok(g.attributes.acabado && g.attributes.color);
    assert.ok(g.attributes.position.count > 0);
  }
  // la caché devuelve la misma geometría para la misma cfg
  assert.equal(piezasVoxelRigidas(cfg).geometrias[0], geometrias[0]);
  animarCaminataVoxel(partes, 0.7, 1);
  assert.ok(partes.legA.rotation.x !== 0);
  assert.ok(group.children.length === 5);
});

test('three: matriz de parte = base · pivote · rotación', () => {
  const base = new THREE.Matrix4().makeTranslation(10, 0, 0);
  const out = new THREE.Matrix4();
  matrizParteVoxel(out, base, [0, 12, 0], 0);
  const p = new THREE.Vector3().setFromMatrixPosition(out);
  assert.ok(Math.abs(p.x - 10) < 1e-9 && Math.abs(p.y - 12) < 1e-9);
});
