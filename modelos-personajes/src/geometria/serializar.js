// Transporte de geometrías entre un Web Worker y el hilo principal. El worker
// construye la geometría y devuelve sólo typed arrays (copiados y transferibles,
// sin copia adicional). El hilo principal arma los BufferGeometry con ellos.
// Conserva el tipo de cada array (Uint16 en skinIndex, Float32 en el resto).
import * as THREE from 'three';
import { calcularHumanoide } from './humanoide.js';

/** @returns {{datos: object, transferibles: ArrayBuffer[]}} */
export function serializarGeometria(geometria) {
    const transferibles = [];
    const attrs = {};
    for (const [nombre, att] of Object.entries(geometria.attributes)) {
        const copia = new att.array.constructor(att.array);
        attrs[nombre] = { array: copia, itemSize: att.itemSize };
        transferibles.push(copia.buffer);
    }
    const idx = geometria.getIndex();
    let index = null;
    if (idx) {
        index = new idx.array.constructor(idx.array);
        transferibles.push(index.buffer);
    }
    return { datos: { attrs, index }, transferibles };
}

/** @returns {THREE.BufferGeometry} */
export function reconstruirGeometria({ attrs, index }) {
    const g = new THREE.BufferGeometry();
    for (const [nombre, a] of Object.entries(attrs)) {
        g.setAttribute(nombre, new THREE.BufferAttribute(a.array, a.itemSize));
    }
    if (index) g.setIndex(new THREE.BufferAttribute(index, 1));
    g.computeBoundingSphere();
    return g;
}

/** Serializa el muñeco de una paleta: skin (una malla con esqueleto) y rígidas (una por hueso). */
export function serializarHumanoide(colores) {
    const { skin, rigidas } = calcularHumanoide(colores);
    const transferibles = [];
    const a = serializarGeometria(skin);
    transferibles.push(...a.transferibles);
    const rig = rigidas.map(g => {
        const s = serializarGeometria(g);
        transferibles.push(...s.transferibles);
        return s.datos;
    });
    return { datos: { skin: a.datos, rigidas: rig }, transferibles };
}

/** Inverso de serializarHumanoide: `{skin, rigidas}` listo para sembrarHumanoide. */
export function reconstruirHumanoide({ skin, rigidas }) {
    return { skin: reconstruirGeometria(skin), rigidas: rigidas.map(reconstruirGeometria) };
}
