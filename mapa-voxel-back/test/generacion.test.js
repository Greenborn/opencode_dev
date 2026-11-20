import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configurarMundo, registrarPlugins, construirMapa, buffersTransferibles } from '../src/index.js';
import { PLUGINS_FALSOS } from '../fixtures/plugins_falsos.js';

test('construirMapa genera chunks, luces, índice de salas y punto de inicio', { timeout: 300000 }, () => {
    configurarMundo({ factorSuperficie: 0.01 });
    registrarPlugins(PLUGINS_FALSOS);
    const mapa = construirMapa({ modo: null });
    assert.ok(Object.keys(mapa.chunks).length > 0, 'debe haber chunks');
    assert.ok(Array.isArray(mapa.lights) && mapa.lights.length >= 2);
    assert.ok(mapa.roomIndex, 'índice de salas');
    assert.ok(mapa.startPosition, 'posición inicial');
    assert.equal(mapa.modo, null);
    assert.ok(buffersTransferibles(mapa).length > 0);
});

test('la generación es determinista con la misma semilla de Math.random', { timeout: 300000 }, () => {
    configurarMundo({ factorSuperficie: 0.01 });
    const original = Math.random;
    const correr = () => {
        let s = 42;
        Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        try { return construirMapa({}); } finally { Math.random = original; }
    };
    const a = correr(), b = correr();
    assert.equal(a.structures.length, b.structures.length);
    assert.deepEqual(a.startPosition, b.startPosition);
});
