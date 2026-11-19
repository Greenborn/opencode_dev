import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  voxelesPersonaje, serializarVoxeles, reconstruirVoxeles,
  personajeDesdeSemilla, personajeAleatorio, normalizarPersonaje, CATALOGO_PERSONAJE,
} from '../src/geometria/index.js';

const norm = a => a.map(v => `${v.x},${v.y},${v.z},${v.c}`).join('|');

test('voxelesPersonaje es determinista y produce voxels con color válido', () => {
  const cfg = { piel: '#e0a878', pelo: 2, pelocolor: 1, remera: 3, pantalon: 0, calzado: 2 };
  const a = voxelesPersonaje(cfg), b = voxelesPersonaje(cfg);
  assert.ok(a.length > 1000);
  assert.equal(norm(a), norm(b));
  assert.ok(a.every(v => /^#[0-9a-f]{6}$/i.test(v.c)));
});

test('piel inválida y peinado inválido caen en valores por defecto', () => {
  const malo = voxelesPersonaje({ piel: 'rojo', pelo: 99 });
  const base = voxelesPersonaje({ piel: '#e0a878', pelo: 0 });
  assert.equal(norm(malo), norm(base));
});

test('transporte por typed arrays es reversible', () => {
  const vox = voxelesPersonaje({ piel: '#123abc', pelo: 4 });
  const { datos, transferibles } = serializarVoxeles(vox);
  assert.equal(transferibles.length, 2);
  assert.equal(norm(reconstruirVoxeles(datos)), norm(vox));
});

test('personaje aleatorio sembrado es reproducible y usa el catálogo', () => {
  const p = personajeDesdeSemilla(42);
  assert.deepEqual(p, personajeDesdeSemilla(42));
  assert.notDeepEqual(p, personajeDesdeSemilla(43));
  assert.ok(p.pelo < CATALOGO_PERSONAJE.pelo.length);
  assert.ok(p.remera < CATALOGO_PERSONAJE.remera.length);
  assert.match(p.piel, /^#[0-9a-f]{6}$/);
});

test('piel natural sólo de la lista natural', () => {
  for (let k = 0; k < 50; k++) {
    const p = personajeDesdeSemilla(k, { piel: 'naturales' });
    assert.ok(CATALOGO_PERSONAJE.pielesNaturales.includes(p.piel));
  }
});

test('personajeAleatorio acepta un generador de números', () => {
  const p = personajeAleatorio(() => 0);
  assert.equal(p.pelo, 0);
  assert.equal(p.remera, 0);
  assert.equal(p.nombre, CATALOGO_PERSONAJE.nombres[0]);
});

test('normalizarPersonaje completa y acota', () => {
  const n = normalizarPersonaje({ pelo: -1, remera: 500, piel: 'x' });
  assert.equal(n.pelo, 0);
  assert.equal(n.remera, 0);
  assert.match(n.piel, /^#[0-9a-f]{6}$/);
});
