import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  voxelesPersonaje, serializarVoxeles, reconstruirVoxeles,
  personajeDesdeSemilla, personajeAleatorio, normalizarPersonaje, CATALOGO_PERSONAJE,
  personajePolicia, personajeAleatorioConPolicia, COLOR_UNIFORME_POLICIA, COLOR_PLACA_POLICIA,
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

test('policía: uniforme fijo, gorra y placa; sin cfg.policia el personaje no cambia', () => {
  const base = { piel: '#e0a878', pelo: 4, pelocolor: 0, remera: 1, pantalon: 1, calzado: 0 };
  const pol = voxelesPersonaje({ ...base, policia: true });
  const com = voxelesPersonaje(base);
  assert.notEqual(norm(pol), norm(com));
  assert.ok(pol.some(v => v.c === COLOR_UNIFORME_POLICIA));
  assert.ok(pol.some(v => v.c === COLOR_PLACA_POLICIA));
  assert.equal(norm(voxelesPersonaje({ ...base, policia: false })), norm(com));
});

test('personajePolicia es reproducible y marca policia', () => {
  const p = personajePolicia(generadorSemillaTest(7));
  assert.equal(p.policia, true);
  assert.equal(p.pelo, 4);
  assert.deepEqual(p, personajePolicia(generadorSemillaTest(7)));
});

test('personajeAleatorioConPolicia: prob 0 nunca policía, prob 1 siempre', () => {
  for (let k = 0; k < 20; k++) {
    assert.equal(personajeAleatorioConPolicia(generadorSemillaTest(k), {}, 0).policia, undefined);
    assert.equal(personajeAleatorioConPolicia(generadorSemillaTest(k), {}, 1).policia, true);
  }
});

test('normalizarPersonaje conserva policia', () => {
  assert.equal(normalizarPersonaje({ policia: true, pelo: 4 }).policia, true);
  assert.equal(normalizarPersonaje({ pelo: 4 }).policia, undefined);
});

function generadorSemillaTest(s) {
  let a = s >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test('pelocolor, remera, pantalon y calzado aceptan un #rrggbb libre (como piel)', () => {
  const base = { piel: '#e0a878', pelo: 0, pelocolor: 0, remera: 0, pantalon: 0, calzado: 0 };
  const libre = { ...base, pelocolor: '#123456', remera: '#abcdef', pantalon: '#010203', calzado: '#fedcba' };
  const colores = new Set(voxelesPersonaje(libre).map(v => v.c));
  for (const c of ['#123456', '#abcdef', '#010203', '#fedcba']) assert.ok(colores.has(c), c);
  // un color libre no altera el resto de las categorías (sólo cambia el color que le toca)
  assert.notEqual(norm(voxelesPersonaje(libre)), norm(voxelesPersonaje(base)));
});

test('normalizarPersonaje conserva colores libres en minúscula y acota pelo', () => {
  const n = normalizarPersonaje({ remera: '#ABCDEF', pelocolor: '#00ff00', pelo: '#ffffff', calzado: 'rojo' });
  assert.equal(n.remera, '#abcdef');
  assert.equal(n.pelocolor, '#00ff00');
  assert.equal(n.pelo, 0);
  assert.equal(n.calzado, 0);
});
