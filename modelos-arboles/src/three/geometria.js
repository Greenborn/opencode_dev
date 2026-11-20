// three/geometria.js - Adaptador a three.js (peer dependency). Convierte la
// especificación pura de `especificarArbol` en BufferGeometry, una por acabado.
//
// La instancia `THREE` se recibe como parámetro (mismo criterio que
// `@greenborn/mapa-voxel/three`): el paquete no fuerza versión ni la carga en
// un worker.

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { especificarArbol, ALTO_CUERPO_POR_DEFECTO } from '../especies.js';

/** Mete en la geometría un atributo `color` plano con ese color (por vértice). */
function pintar(THREE, geo, color) {
    const c = new THREE.Color(color);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        arr[i * 3] = c.r;
        arr[i * 3 + 1] = c.g;
        arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
}

/** Geometría de una sola primitiva, con su rotación, traslación y color. */
export function geometriaDePrimitiva(THREE, p) {
    let geo;
    switch (p.forma) {
        case 'caja':
            geo = new THREE.BoxGeometry(p.medidas[0], p.medidas[1], p.medidas[2]);
            break;
        case 'cilindro':
            geo = new THREE.CylinderGeometry(p.rSup, p.rInf, p.alto, p.segmentos, 1);
            break;
        case 'esfera':
            geo = new THREE.SphereGeometry(p.radio, p.segmentos, Math.max(4, p.segmentos - 2));
            break;
        case 'elipsoide':
            geo = new THREE.SphereGeometry(1, p.segmentos, Math.max(4, p.segmentos - 2));
            geo.scale(p.radios[0], p.radios[1], p.radios[2]);
            break;
        default:
            throw new Error(`modelos-arboles: forma desconocida '${p.forma}'`);
    }
    const rot = p.rot;
    if (rot) {
        if (rot[0]) geo.rotateX(rot[0]);
        if (rot[1]) geo.rotateY(rot[1]);
        if (rot[2]) geo.rotateZ(rot[2]);
    }
    geo.translate(p.pos[0], p.pos[1], p.pos[2]);
    return pintar(THREE, geo, p.color);
}

/** Une las primitivas de un acabado en una sola geometría. */
function geometriaDeSlot(THREE, primitivas) {
    const lista = primitivas.map(p => geometriaDePrimitiva(THREE, p));
    const geometria = lista.length === 1 ? lista[0] : mergeGeometries(lista, false);
    if (!geometria) throw new Error('modelos-arboles: mergeGeometries falló');
    geometria.computeBoundingBox();
    geometria.computeBoundingSphere();
    return geometria;
}

const cacheGeometria = new Map();

/**
 * Geometría de una especie, una por acabado (es lo que pide el instancing).
 * Cacheada por (especie, semilla, altoCuerpo): no depende de la escala ni de la
 * rotación de cada ejemplar.
 *
 * @param {typeof import('three')} THREE
 * @param {string} especie
 * @param {{semilla: number, altoCuerpo?: number}} op
 * @returns {{partes: {slot: number, geometria: object}[], radioTronco: number,
 *            alto: number, caja: object, perfil: Float64Array, radioColision: number}}
 */
export function geometriaArbol(THREE, especie, { semilla, altoCuerpo = ALTO_CUERPO_POR_DEFECTO } = {}) {
    const clave = `${especie}|${semilla}|${altoCuerpo}`;
    let a = cacheGeometria.get(clave);
    if (a) return a;

    const esp = especificarArbol(especie, { semilla, altoCuerpo });
    const partes = esp.partes.map(({ slot, primitivas }) => ({
        slot,
        geometria: geometriaDeSlot(THREE, primitivas)
    }));
    const caja = new THREE.Box3();
    for (const p of partes) caja.union(p.geometria.boundingBox);

    a = {
        partes,
        alto: caja.max.y,
        caja,
        radioTronco: esp.radioBase,
        perfil: esp.perfil,
        radioColision: esp.radioColision
    };
    cacheGeometria.set(clave, a);
    return a;
}
