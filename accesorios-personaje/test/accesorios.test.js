import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voxelesPersonaje } from '@greenborn/modelos-personajes/geometria';
import * as A from '../src/index.js';

const base = { piel: '#e0a878', pelo: 0, pelocolor: 0, remera: 0, pantalon: 0, calzado: 0 };
const celdas = lista => lista.map(v => v.x + ',' + v.y + ',' + v.z);

test('sin accesorios no hay voxels', () => {
    const v = A.voxelesAccesorios({ ...base, ...A.ACCESORIOS_DEFECTO });
    assert.equal(v.body.length, 0);
    assert.equal(v.armB.length, 0);
});

test('gorra va al cuerpo, y no se dibuja con el peinado 4 (gorra integrada)', () => {
    assert.ok(A.voxelesAccesorios({ ...base, cabeza: 1 }).body.length > 0);
    assert.equal(A.voxelesAccesorios({ ...base, pelo: 4, cabeza: 1 }).body.length, 0);
});

test('sombrero sin celdas duplicadas y con cinta sobre la copa', () => {
    const s = A.voxelesAccesorios({ ...base, cabeza: 2, cabezaColor: 1 }).body;
    assert.equal(new Set(celdas(s)).size, s.length);
    assert.ok(s.some(v => v.z === 37));
    assert.equal(s.filter(v => v.z === 35 && v.c === A.COLOR_CINTA).length, 36);
});

test('lentes: dos aros 4x4 delante de la cara', () => {
    const l = A.voxelesAccesorios({ ...base, lentes: 1 }).body;
    assert.equal(l.length, 32);
    assert.ok(l.every(v => v.y === 8 && v.z >= 27 && v.z <= 30));
});

test('canasta va al brazo derecho, es determinista por semilla y sin duplicados', () => {
    const a = A.voxelesAccesorios({ ...base, mano: 1, semillaCanasta: 42 });
    assert.equal(a.body.length, 0);
    assert.ok(a.armB.length > 0);
    assert.deepEqual(a, A.voxelesAccesorios({ ...base, mano: 1, semillaCanasta: 42 }));
    assert.notDeepEqual(a, A.voxelesAccesorios({ ...base, mano: 1, semillaCanasta: 43 }));
    assert.equal(new Set(celdas(a.armB)).size, a.armB.length);
});

test('los accesorios no solapan el cuerpo base (lentes y gorra)', () => {
    const cuerpo = new Set(celdas(voxelesPersonaje(base)));
    const v = A.voxelesAccesorios({ ...base, lentes: 1, cabeza: 1 });
    assert.equal(celdas(v.body).filter(c => cuerpo.has(c)).length, 0);
});

test('generador: une cuerpo y accesorios; normaliza fuera de rango', () => {
    const r = A.personajeConAccesorios(() => 0.5);
    for (const k of ['cabeza', 'cabezaColor', 'lentes', 'mano', 'semillaCanasta']) assert.ok(k in r);
    assert.equal(A.normalizarAccesorios({ cabeza: 9, lentes: 'x' }).cabeza, 0);
    assert.equal(A.normalizarAccesorios({}).mano, 0);
});
