// mallador.worker.js - Worker que malla chunks fuera del hilo principal.
//
// Protocolo (mensajes con `tipo`):
//   'config'  { config: { bloque, paletaTintes, tiposTransparentes, moduloIluminacion? } }
//   'datos'   { chunks: [{ cx, cz, ancho, alto, profundidad, datos, tintes }] }  (se cachean)
//   'olvidar' { claves: string[] }
//   'mallar'  { id, claves: string[] }  -> responde { tipo:'salida', id, salidas }
//
// `moduloIluminacion` es la URL de un módulo ES que exporta `iluminacion(info)`:
// las funciones no cruzan postMessage, por eso el hook se carga aquí.
// Los buffers de las salidas viajan como transferables (sin copia).

import { mallarChunk } from '../mallador.js';

const crudos = new Map();   // clave -> chunk crudo
let opts = { bloque: 1, paletaTintes: [], esTransparente: () => false, iluminacion: null };
let setTransp = new Set();

const vecinos = (cx, cz) => crudos.get(cx + '_' + cz);

self.onmessage = async (e) => {
    const m = e.data;
    if (m.tipo === 'config') {
        const c = m.config;
        setTransp = new Set(c.tiposTransparentes ?? []);
        opts = {
            bloque: c.bloque ?? 1,
            paletaTintes: c.paletaTintes ?? [],
            esTransparente: tipo => setTransp.has(tipo),
            iluminacion: null,
        };
        if (c.moduloIluminacion) {
            const mod = await import(c.moduloIluminacion);
            opts.iluminacion = mod.iluminacion ?? null;
        }
        return;
    }
    if (m.tipo === 'datos') {
        for (const ch of m.chunks) crudos.set(ch.cx + '_' + ch.cz, ch);
        return;
    }
    if (m.tipo === 'olvidar') {
        for (const k of m.claves) crudos.delete(k);
        return;
    }
    if (m.tipo === 'mallar') {
        const salidas = [];
        const transfer = [];
        for (const k of m.claves) {
            const ch = crudos.get(k);
            if (!ch) continue;
            const s = mallarChunk(ch, vecinos, opts);
            salidas.push(s);
            for (const lado of [s.opacos, s.transparentes]) {
                for (const e2 of lado) {
                    transfer.push(e2.position.buffer, e2.normal.buffer, e2.uv.buffer, e2.sol.buffer, e2.luz.buffer, e2.index.buffer);
                    if (e2.color) transfer.push(e2.color.buffer);
                }
            }
        }
        self.postMessage({ tipo: 'salida', id: m.id, salidas }, transfer);
    }
};
