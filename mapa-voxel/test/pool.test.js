// Prueba del camino con workers. Node no trae Web Worker, así que se simula
// `Worker` ejecutando el módulo del worker en el mismo proceso: el worker
// asigna `self.onmessage` y responde con `self.postMessage`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MapaVoxel } from '../src/mapa.js';
import { crearPoolMallado } from '../src/worker/pool.js';

globalThis.self = globalThis;
let instancia = null;
globalThis.postMessage = msg => instancia.onmessage({ data: msg });
globalThis.Worker = class {
    constructor() { instancia = this; this.onmessage = null; }
    postMessage(msg) {
        // el worker real procesa cada mensaje de forma asíncrona
        queueMicrotask(() => globalThis.onmessage({ data: msg }));
    }
    terminate() {}
};

const T = 4, ALTO = 4;
function cargar(mapa) {
    for (let cx = 0; cx < 2; cx++) for (let cz = 0; cz < 2; cz++) {
        const datos = new Uint8Array(T * ALTO * T);
        for (let x = 0; x < T; x++) for (let y = 0; y < ALTO; y++) for (let z = 0; z < T; z++) {
            datos[(x * ALTO + y) * T + z] = ((x + 2 * cx + z + cz + y) % 3 === 0) ? 1 + ((x + y) % 3) : 0;
        }
        mapa.setChunk(cx, cz, datos);
    }
}

test('mallado con pool produce la misma geometría que el mallado síncrono', async () => {
    // carga el worker DESPUÉS de definir `self`: asigna self.onmessage al evaluarse
    await import('../src/worker/mallador.worker.js');
    const pool = crearPoolMallado({
        url: new URL('../src/worker/mallador.worker.js', import.meta.url),
        config: { bloque: 1, paletaTintes: [], tiposTransparentes: [] },
        cantidad: 1,
    });
    const sync = new MapaVoxel({ tamanoChunk: T, alto: ALTO });
    cargar(sync);
    sync.mallarPendientes();

    const async = new MapaVoxel({ tamanoChunk: T, alto: ALTO });
    cargar(async);
    const aplicados = await async.mallarConPool(pool, { lote: 2 });
    pool.terminar();

    assert.equal(aplicados, 4);
    for (const k of ['0_0', '0_1', '1_0', '1_1']) {
        const [cx, cz] = k.split('_').map(Number);
        const a = sync.salida(cx, cz), b = async.salida(cx, cz);
        assert.deepEqual([...b.opacos.map(e => e.position.length)], [...a.opacos.map(e => e.position.length)], k);
        assert.deepEqual([...b.opacos.map(e => e.index.length)], [...a.opacos.map(e => e.index.length)], k);
        for (let i = 0; i < a.opacos.length; i++) {
            assert.deepEqual([...b.opacos[i].position], [...a.opacos[i].position], `posiciones ${k}`);
        }
    }
});
