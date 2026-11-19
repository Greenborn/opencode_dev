import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarDireccion, direccionDesdePosicion, ocluyenteEsfera, ocluyenteCilindro,
  rayoTocaOcluyente, nivelSolCara, SUN_SAMPLES, SUN_RAY_MAX,
} from '../src/rayos.js';

const SOL_CENIT = [0, 1, 0];

test('normalizarDireccion y direccionDesdePosicion', () => {
  const n = normalizarDireccion([3, 0, 4]);
  assert.ok(Math.abs(n[0] - 0.6) < 1e-12 && Math.abs(n[2] - 0.8) < 1e-12);
  const d = direccionDesdePosicion(null);
  assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-12);
});

test('esfera: rayo que la atraviesa y rayo que pasa de largo', () => {
  const e = ocluyenteEsfera({ x: 0, y: 5, z: 0, r: 1 });
  assert.equal(rayoTocaOcluyente(e, 0, 0, 0, SOL_CENIT, SUN_RAY_MAX), true);
  assert.equal(rayoTocaOcluyente(e, 3, 0, 0, SOL_CENIT, SUN_RAY_MAX), false);
  // la esfera queda por encima del alcance: no tapa
  assert.equal(rayoTocaOcluyente(e, 0, 0, 0, SOL_CENIT, 2), false);
});

test('cilindro vertical: sol inclinado, dentro del rango en Y', () => {
  const sol = normalizarDireccion([0.1, 1, 0]);
  const c = ocluyenteCilindro({ x: 0, z: 0, r: 0.5, y0: 2, y1: 4 });
  assert.equal(rayoTocaOcluyente(c, 0, 0, 0, sol, SUN_RAY_MAX), true);
  // partiendo por encima del fuste, el rayo sólo sube: no lo toca
  assert.equal(rayoTocaOcluyente(c, 0, 5, 0, sol, SUN_RAY_MAX), false);
});

test('cilindro con sol cenital no proyecta (comportamiento del juego)', () => {
  const c = ocluyenteCilindro({ x: 0, z: 0, r: 0.5, y0: 2, y1: 4 });
  assert.equal(rayoTocaOcluyente(c, 0, 0, 0, SOL_CENIT, SUN_RAY_MAX), false);
});

test('cara de espaldas al sol => 0', () => {
  const cfg = { bloqueo: () => 0, altoVolumen: 10, alcance: 20 };
  assert.equal(nivelSolCara(0, 0, 0, 1, false, SOL_CENIT, cfg), 0);
});

test('cara expuesta al sol => máximo nivel', () => {
  const cfg = { bloqueo: () => 0, altoVolumen: 10, alcance: 20 };
  assert.equal(nivelSolCara(0, 0, 0, 1, true, SOL_CENIT, cfg), SUN_SAMPLES);
});

test('bloque encima tapa todos los rayos => 0', () => {
  const cfg = { bloqueo: (x, y, z) => (y >= 1 ? 1 : 0), altoVolumen: 10, alcance: 20 };
  assert.equal(nivelSolCara(0, 0, 0, 1, true, SOL_CENIT, cfg), 0);
});

test('ocluyente de mundo con origen desplazado', () => {
  // ocluyente en mundo x=100; el volumen empieza en origenX=100 => tapa la celda local 0
  const cfg = {
    bloqueo: () => 0, altoVolumen: 10, alcance: 20,
    ocluyentes: [ocluyenteEsfera({ x: 100, y: 3, z: 0, r: 2 })], origenX: 100, origenZ: 0,
  };
  assert.equal(nivelSolCara(0, 0, 0, 1, true, SOL_CENIT, cfg), 0);
});
