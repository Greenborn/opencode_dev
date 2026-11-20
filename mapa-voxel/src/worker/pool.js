// pool.js - Pool de workers de mallado (hilo principal).
//
// Cada worker mantiene una caché de chunks crudos. Para mallar un chunk, el
// worker necesita también sus 4 vecinos (culling de bordes), así que el pool
// envía sólo los crudos que el worker todavía no conoce (igual que
// `workerConoce` en el juego). Los datos se COPIAN antes de enviarlos: el
// hilo principal conserva los suyos para futuras ediciones.
//
// Uso:
//   const pool = crearPoolMallado({ url: new URL('./worker/mallador.worker.js', import.meta.url),
//                                   config: { bloque: 1, paletaTintes, tiposTransparentes: [8] } });
//   await mapa.mallarConPool(pool);

const CANTIDAD_POR_DEFECTO = () => {
    const hc = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    return Math.max(2, Math.min(4, hc - 1));
};

/**
 * @param {Object} opts
 * @param {string|URL} opts.url           URL del worker (ver mallador.worker.js)
 * @param {Object} opts.config            config inicial (bloque, paletaTintes, tiposTransparentes, moduloIluminacion)
 * @param {number} [opts.cantidad]        número de workers
 */
export function crearPoolMallado({ url, config, cantidad = CANTIDAD_POR_DEFECTO() }) {
    const trabajadores = [];
    for (let i = 0; i < cantidad; i++) {
        const w = new Worker(url, { type: 'module' });
        const t = { w, conoce: new Map(), carga: 0, pendientes: new Map() };   // clave -> versión enviada
        w.onmessage = (ev) => {
            const msg = ev.data;
            if (msg.tipo !== 'salida') return;
            const res = t.pendientes.get(msg.id);
            t.pendientes.delete(msg.id);
            t.carga--;
            res.resolver(msg.salidas);
        };
        w.onerror = (err) => {
            for (const res of t.pendientes.values()) res.rechazar(err);
            t.pendientes.clear();
        };
        w.postMessage({ tipo: 'config', config });
        trabajadores.push(t);
    }
    let siguienteId = 1;

    function menosCargado() {
        let mejor = trabajadores[0];
        for (const t of trabajadores) if (t.carga < mejor.carga) mejor = t;
        return mejor;
    }

    return {
        cantidad: trabajadores.length,

        /**
         * Malla `claves` en un worker. `obtenerChunk(clave)` devuelve el chunk
         * crudo ({cx, cz, ancho, alto, profundidad, datos, tintes}) o undefined.
         * @returns {Promise<Array>} salidas de mallado (una por clave con datos)
         */
        mallar(claves, obtenerChunk) {
            const t = menosCargado();
            const aEnviar = [];
            const necesarios = new Set();
            for (const k of claves) {
                necesarios.add(k);
                const [cx, cz] = k.split('_').map(Number);
                for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    necesarios.add((cx + dx) + '_' + (cz + dz));
                }
            }
            for (const k of necesarios) {
                const ch = obtenerChunk(k);
                if (!ch || !ch.datos) continue;
                // Si el worker ya tiene esta versión, no se reenvía. Si el chunk
                // cambió desde el último envío, se manda de nuevo.
                if (t.conoce.get(k) === ch.version) continue;
                aEnviar.push({
                    cx: ch.cx, cz: ch.cz, ancho: ch.ancho, alto: ch.alto, profundidad: ch.profundidad,
                    datos: ch.datos.slice(),
                    tintes: ch.tintes ? ch.tintes.slice() : null,
                });
                t.conoce.set(k, ch.version);
            }
            if (aEnviar.length) {
                const transfer = [];
                for (const c of aEnviar) { transfer.push(c.datos.buffer); if (c.tintes) transfer.push(c.tintes.buffer); }
                t.w.postMessage({ tipo: 'datos', chunks: aEnviar }, transfer);
            }
            const id = siguienteId++;
            t.carga++;
            return new Promise((resolver, rechazar) => {
                t.pendientes.set(id, { resolver, rechazar });
                t.w.postMessage({ tipo: 'mallar', id, claves });
            });
        },

        /** Avisa a los workers que un chunk ya no existe (descarga o cambio de datos). */
        olvidar(claves) {
            for (const t of trabajadores) {
                const quitar = claves.filter(k => t.conoce.has(k));
                if (quitar.length === 0) continue;
                quitar.forEach(k => t.conoce.delete(k));
                t.w.postMessage({ tipo: 'olvidar', claves: quitar });
            }
        },

        terminar() {
            for (const t of trabajadores) t.w.terminate();
            trabajadores.length = 0;
        },
    };
}
