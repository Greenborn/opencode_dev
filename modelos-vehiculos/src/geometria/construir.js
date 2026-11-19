// Construcción de un vehículo: une las piezas de cada familia en una
// BufferGeometry por slot de material. Sin caché: eso lo decide el llamador.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fijarPaleta } from './primitivas.js';
import { turismo } from './familias/turismo.js';
import { furgon } from './familias/furgon.js';
import { bus } from './familias/bus.js';
import { camion } from './familias/camion.js';
import { moto } from './familias/moto.js';
import { dron } from './familias/dron.js';

const FORMAS = { turismo, pickup: turismo, furgon, bus, camion, moto, drone: dron };

/**
 * `scale` (opcional, 1 por defecto): escala uniforme de todo el vehículo. Se aplica
 * igual a todas las partes y slots, así las proporciones entre piezas se mantienen.
 *
 * @param {{forma:string, color:number, color2?:number, extra?:string, estilo?:string, scale?:number, largo:number, ancho:number, cuerpo:number, cabina:number, c0:number, c1:number}} def
 * @param {string} [nombre] sólo para los mensajes de error
 * @returns {{slot:number, geometria:THREE.BufferGeometry}[]}
 */
export function construirPartes(def, nombre = def.forma) {
    const fabricar = FORMAS[def.forma];
    if (!fabricar) throw new Error(`modelos-vehiculos: forma desconocida '${def.forma}' (${nombre})`);
    const s = def.scale != null ? def.scale : 1;
    if (!(s > 0)) throw new Error(`modelos-vehiculos: scale inválido (${nombre})`);
    fijarPaleta({ cuerpo: def.color, detalle: def.color2 != null ? def.color2 : def.color });
    const piezas = fabricar(def);

    const porSlot = new Map();
    for (const { slot, g } of piezas) {
        if (!porSlot.has(slot)) porSlot.set(slot, []);
        porSlot.get(slot).push(g);
    }
    const partes = [];
    for (const [slot, lista] of porSlot) {
        const geometria = mergeGeometries(lista, false);
        if (!geometria) throw new Error(`modelos-vehiculos: no se pudo fundir ${nombre}/${slot}`);
        if (s !== 1) geometria.scale(s, s, s);   // una única transformación uniforme para todas las partes
        geometria.computeBoundingSphere();
        partes.push({ slot, geometria });
        lista.forEach(g => g.dispose());
    }
    return partes;
}
