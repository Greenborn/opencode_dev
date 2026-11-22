// mallador.worker.js - Worker que malla chunks fuera del hilo principal.
//
// Protocolo (mensajes con `tipo`):
//   'config'  { config: { bloque, paletaTintes, tiposTransparentes, moduloIluminacion?,
//                         alturaMinimaCamara?, contornoCompleto?, atlas? } }
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
            alturaMinimaCamara: c.alturaMinimaCamara,
            contornoCompleto: c.contornoCompleto === true,
            atlas: c.atlas ?? null,   // { K, ancho, alto, ... } de construirAtlas (sólo datos)
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
        const transfer = new Set();   // sin duplicados: un bloque de atlas se comparte entre entradas
        for (const k of m.claves) {
            const ch = crudos.get(k);
            if (!ch) continue;
            const s = mallarChunk(ch, vecinos, opts);
            salidas.push(s);
            for (const lado of [s.opacos, s.transparentes]) {
                for (const e2 of lado) {
                    for (const arr of [e2.position, e2.normal, e2.uv, e2.sol, e2.luz, e2.index, e2.color, e2.region]) {
                        if (arr) transfer.add(arr.buffer);
                    }
                    if (e2.atlas) transfer.add(e2.atlas.datos.buffer);
                }
            }
        }
        self.postMessage({ tipo: 'salida', id: m.id, salidas }, [...transfer]);
    }
};
