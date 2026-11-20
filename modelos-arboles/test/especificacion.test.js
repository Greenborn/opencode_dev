// Pruebas del núcleo puro (sin three.js). Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESPECIES, especificarArbol, ALTO_CUERPO_POR_DEFECTO } from '../src/index.js';

test('hay trece especies declaradas', () => {
    assert.equal(ESPECIES.length, 13);
});

test('la especificación es determinista para la misma semilla', () => {
    const a = especificarArbol('roble', { semilla: 42 });
    const b = especificarArbol('roble', { semilla: 42 });
    assert.deepEqual(a.partes, b.partes);
    assert.equal(a.radioColision, b.radioColision);
});

test('otra semilla cambia la especificación', () => {
    const a = especificarArbol('pino', { semilla: 1 });
    const b = especificarArbol('pino', { semilla: 2 });
    assert.notEqual(JSON.stringify(a.partes), JSON.stringify(b.partes));
});

test('cada especie produce al menos un acabado con primitivas', () => {
    for (const id of ESPECIES) {
        const esp = especificarArbol(id, { semilla: 7 });
        assert.ok(esp.partes.length >= 1, id);
        for (const { slot, primitivas } of esp.partes) {
            assert.ok(Number.isInteger(slot) && slot >= 0 && slot <= 2, `${id} slot ${slot}`);
            assert.ok(primitivas.length > 0, id);
        }
        assert.ok(esp.radioColision > 0, id);
        assert.ok(esp.radioBase >= esp.radioColision - 1e-9, id);
    }
});

test('el radio de colisión se mide a la altura del cuerpo por defecto', () => {
    const a = especificarArbol('platano', { semilla: 3 });
    const b = especificarArbol('platano', { semilla: 3, altoCuerpo: ALTO_CUERPO_POR_DEFECTO });
    assert.equal(a.radioColision, b.radioColision);
});

test('una especie desconocida lanza error', () => {
    assert.throws(() => especificarArbol('inexistente', { semilla: 1 }), /especie desconocida/);
});
