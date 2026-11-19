import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PoolInstanciado, matrizCadaver, matrizRaizInstancia, matrizGrupoInstancia, matrizHuesoInstancia, geometriaCadaverFusionada } from '../src/index.js';

const geo = () => new THREE.BoxGeometry(1, 1, 1);
const mat = () => new THREE.MeshBasicMaterial();
const pos = (m, slot) => { const v = new THREE.Vector3(); m.getMatrixAt(slot, _mm); return v.setFromMatrixPosition(_mm); };
const _mm = new THREE.Matrix4();

test('pool: reservar, escribir y liberar con swap-remove', () => {
  const scene = new THREE.Scene();
  const pool = new PoolInstanciado(scene, geo(), mat(), { nombre: 't', atributos: [{ nombre: 'luzInst', tamano: 3 }] });
  for (const id of [1, 2, 3]) {
    pool.reservar(id);
    pool.poner(id, new THREE.Matrix4().makeTranslation(id * 10, 0, 0));
    pool.escribirAtributo(id, 'luzInst', [id / 10, 0, 0]);
  }
  assert.equal(pool.vivos, 3);
  assert.equal(pool.malla.count, 3);
  pool.liberar(1);                       // el último (3) ocupa el slot 0
  assert.equal(pool.vivos, 2);
  assert.equal(pool.slotDeId(3), 0);
  assert.ok(Math.abs(pos(pool.malla, 0).x - 30) < 1e-9);
  assert.ok(Math.abs(pool._attrs.get('luzInst').array[0] - 0.3) < 1e-6);
  pool.destruir();
});

test('pool: crece al doble al llenarse y no pierde datos', () => {
  const scene = new THREE.Scene();
  const pool = new PoolInstanciado(scene, geo(), mat(), { capacidadInicial: 2 });
  for (let id = 0; id < 5; id++) { pool.reservar(id); pool.poner(id, new THREE.Matrix4().makeTranslation(id, 0, 0)); }
  assert.equal(pool.capacidad, 8);
  assert.ok(Math.abs(pos(pool.malla, 4).x - 4) < 1e-9);
  pool.destruir();
});

test('matrices: raíz, grupo y hueso componen en el orden del juego', () => {
  const raiz = matrizRaizInstancia(new THREE.Matrix4(), 1, 2, 3, 0, 1);
  const grupo = matrizGrupoInstancia(new THREE.Matrix4(), 2, 1, 1, 1);
  const base = new THREE.Matrix4().multiplyMatrices(raiz, grupo);
  const out = matrizHuesoInstancia(new THREE.Matrix4(), base, new THREE.Matrix4(), new THREE.Matrix4());
  assert.ok(out.elements.every(Number.isFinite));
  assert.ok(Math.abs(new THREE.Vector3().setFromMatrixPosition(out).x - 1) < 1e-9);
});

test('matrizCadaver: a t=0 de pie y apoyado en el piso; tendido más bajo al hundirse', () => {
  const c = { x: 5, y: 0, z: 5, rotY: 0, sx: 1, sy: 1, sz: 1 };
  const m0 = matrizCadaver(new THREE.Matrix4(), c, 0, 1, 4);
  const m1 = matrizCadaver(new THREE.Matrix4(), c, 30, 1, 4);
  const p0 = new THREE.Vector3().setFromMatrixPosition(m0);
  const p1 = new THREE.Vector3().setFromMatrixPosition(m1);
  assert.ok(Number.isFinite(p0.y));
  assert.ok(p1.y < p0.y, 'hundido: la posición baja');
});

test('geometriaCadaverFusionada: una sola geometría con posiciones', () => {
  const colores = { cuerpo: 0x2e4a1a };
  const g = geometriaCadaverFusionada(colores);
  assert.ok(g.attributes.position.count > 100);
  assert.ok(g.boundingSphere);
});
