import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MapaVoxel } from '../src/mapa.js';

const T = 4, ALTO = 4;

function llenar(mapa, cxs, czs, tipo = 1) {
    for (const cx of cxs) for (const cz of czs) {
        mapa.setChunk(cx, cz, new Uint8Array(T * ALTO * T).fill(tipo));
    }
}

test('dinámico: editar un voxel de borde marca también al vecino', () => {
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO });
    llenar(m, [0, 1], [0]);
    m.mallarPendientes();
    assert.equal(m.pendientes, 0);
    m.setVoxel(T - 1, 1, 0, 0);          // borde derecho de (0,0): afecta a (1,0)
    assert.ok(m.sucios.has('0_0'));
    assert.ok(m.sucios.has('1_0'), 'el vecino debe remallarse');
});

test('dinámico: editar un voxel interior sólo marca su chunk', () => {
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO });
    llenar(m, [0, 1], [0]);
    m.mallarPendientes();
    m.setVoxel(1, 1, 1, 0);
    assert.deepEqual([...m.sucios], ['0_0']);
});

test('presupuesto de tiempo: con 0 ms procesa al menos un chunk', () => {
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO });
    llenar(m, [0, 1, 2], [0]);
    const n = m.mallarPendientes({ presupuestoMs: 0 });
    assert.equal(n, 1);
    assert.equal(m.pendientes, 2);
});

test('estático: setVoxel lanza error; congelar libera datos y bloquea nuevas cargas', () => {
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO, modo: 'estatico' });
    llenar(m, [0], [0]);
    assert.throws(() => m.setVoxel(0, 0, 0, 0), /estático/);
    const m2 = new MapaVoxel({ tamanoChunk: T, alto: ALTO });
    llenar(m2, [0, 1], [0]);
    m2.congelar();
    assert.throws(() => m2.setVoxel(0, 0, 0, 0), /estático/);
    assert.throws(() => m2.setChunk(5, 5, new Uint8Array(T * ALTO * T)), /congelado/);
    assert.equal(m2.chunks.get('0_0').datos, null, 'datos liberados');
    assert.ok(m2.salida(0, 0), 'la malla queda disponible');
});

test('estático: combinarTodo une el mapa en un grupo por material', () => {
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO, modo: 'estatico' });
    llenar(m, [0, 1], [0], 1);
    m.congelar();
    const comb = m.combinarTodo();
    assert.ok(comb.opacos);
    assert.equal(comb.opacos.materiales.length, 1);
    assert.equal(comb.transparentes, null);
});

test('regionDe agrupa chunks en bloques de regionTamano', () => {
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO, regionTamano: 2 });
    assert.equal(m.regionDe(0, 0), m.regionDe(1, 1));
    assert.notEqual(m.regionDe(1, 0), m.regionDe(2, 0));
});

test('tipoEn y setVoxel usan coordenadas de mundo entre chunks', () => {
    const m = new MapaVoxel({ tamanoChunk: T, alto: ALTO });
    llenar(m, [0, 1], [0], 0);
    m.setVoxel(5, 2, 3, 7);
    assert.equal(m.tipoEn(5, 2, 3), 7);
    assert.equal(m.tipoEn(5, ALTO + 1, 3), 0);
});
