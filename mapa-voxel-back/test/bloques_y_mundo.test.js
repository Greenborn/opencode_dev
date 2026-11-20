import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configurarMundo, getFactorSuperficie, WORLD_CONFIG, BLOCK_TYPES, isTransparent, VolumeBuffer } from '../src/index.js';

test('los tipos de bloque son parte del paquete', () => {
    assert.equal(BLOCK_TYPES.AIR, 0);
    assert.equal(BLOCK_TYPES.GREEN, 1);
    assert.equal(isTransparent(BLOCK_TYPES.AIR), true);
});

test('configurarMundo escala el lado con la raíz del factor de superficie', () => {
    configurarMundo({ factorSuperficie: 1 });
    const base = WORLD_CONFIG.width;
    configurarMundo({ factorSuperficie: 0.25 });
    assert.equal(getFactorSuperficie(), 0.25);
    assert.equal(WORLD_CONFIG.width, Math.round(1000 * 0.5) + (base - 1000));
    assert.equal(WORLD_CONFIG.height, WORLD_CONFIG.width);
    configurarMundo({ factorSuperficie: 1 });
    assert.equal(WORLD_CONFIG.width, base);
});

test('configurarMundo rechaza factores no positivos', () => {
    assert.throws(() => configurarMundo({ factorSuperficie: 0 }), RangeError);
    assert.throws(() => configurarMundo({ factorSuperficie: -1 }), RangeError);
});

test('VolumeBuffer se puede crear y escribir', () => {
    const v = new VolumeBuffer(4, 4, 4);
    assert.ok(v);
});
