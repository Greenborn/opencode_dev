// Transporte de geometrías entre un Web Worker y el hilo principal. El worker
// construye las BufferGeometry (three.js no necesita DOM) y devuelve sólo los
// typed arrays, que viajan transferidos sin copia. El hilo principal arma los
// BufferGeometry a partir de ellos: trabajo mínimo en el hilo que dibuja.
import * as THREE from 'three';

const ATRIBUTOS = ['position', 'normal', 'color'];

/**
 * @param {{slot:number, geometria:THREE.BufferGeometry}[]} partes
 * @returns {{datos:object[], transferibles:ArrayBuffer[]}}
 */
export function serializarPartes(partes) {
    const transferibles = [];
    const datos = partes.map(({ slot, geometria }) => {
        const attrs = {};
        for (const nombre of ATRIBUTOS) {
            const att = geometria.getAttribute(nombre);
            if (!att) continue;
            const copia = new Float32Array(att.array);
            attrs[nombre] = { array: copia, itemSize: att.itemSize };
            transferibles.push(copia.buffer);
        }
        const idx = geometria.getIndex();
        let index = null;
        if (idx) {
            const copia = new Uint32Array(idx.array);
            index = copia;
            transferibles.push(copia.buffer);
        }
        return { slot, attrs, index };
    });
    return { datos, transferibles };
}

/**
 * @param {ReturnType<typeof serializarPartes>['datos']} datos
 * @returns {{slot:number, geometria:THREE.BufferGeometry}[]}
 */
export function reconstruirPartes(datos) {
    return datos.map(({ slot, attrs, index }) => {
        const geometria = new THREE.BufferGeometry();
        for (const nombre of ATRIBUTOS) {
            const a = attrs[nombre];
            if (a) geometria.setAttribute(nombre, new THREE.BufferAttribute(a.array, a.itemSize));
        }
        if (index) geometria.setIndex(new THREE.BufferAttribute(index, 1));
        geometria.computeBoundingSphere();
        return { slot, geometria };
    });
}
