// three/geometria.js - Adaptador a three.js (peer dependency). Convierte la
// especificación pura de `especificarArbol` en BufferGeometry, una por acabado.
//
// La instancia `THREE` se recibe como parámetro (mismo criterio que
// `@greenborn/mapa-voxel/three`): el paquete no fuerza versión ni la carga en
// un worker.

import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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

// ---- Optimización de vértices (sin cambio visual) ----
// 1) Sin `uv`: los materiales del arbolado no usan texturas, y la uv distinta por cara impedía compartir vértices.
// 2) mergeVertices: comparte los vértices con posición, normal y color idénticos (mismo sombreado).
// 3) quitarOcultos: descarta los triángulos que quedan enteros DENTRO de otra pieza convexa y cerrada del mismo
//    árbol (por ejemplo, la punta del tronco metida en la copa, o esferas de copa solapadas). Los materiales son
//    opacos, así que desde afuera no se ven; sólo se notaría con la cámara metida dentro de una pieza.

const EPS_OCULTO = 1e-4;   // margen: una cara apoyada sobre la superficie de otra pieza NO se descarta

/**
 * Planos `[nx, ny, nz, d]` (normal hacia afuera) de una geometría cerrada si es convexa; si no, null.
 * Todas las formas de `geometriaDePrimitiva` son convexas (caja, cilindro/cono cerrado, esfera, elipsoide).
 */
function planosConvexos(geo) {
    const p = geo.attributes.position.array, ix = geo.index.array, out = [];
    for (let t = 0; t < ix.length; t += 3) {
        const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
        const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
        const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const L = Math.hypot(nx, ny, nz);
        if (L < 1e-9) continue;                     // triángulo degenerado (polos de la esfera)
        nx /= L; ny /= L; nz /= L;
        out.push([nx, ny, nz, -(nx * p[a] + ny * p[a + 1] + nz * p[a + 2])]);
    }
    for (const q of out)                             // convexa: todos sus vértices del lado interior de cada plano
        for (let k = 0; k < p.length; k += 3)
            if (q[0] * p[k] + q[1] * p[k + 1] + q[2] * p[k + 2] + q[3] > 1e-5) return null;
    return out;
}

function adentro(planos, x, y, z) {
    for (const q of planos) if (q[0] * x + q[1] * y + q[2] * z + q[3] > -EPS_OCULTO) return false;
    return true;
}

/** Deja en `geo` sólo los triángulos que no están enteros dentro de otra pieza convexa (`otras`). */
function quitarTriangulosOcultos(geo, otras) {
    if (!otras.length) return geo;
    const p = geo.attributes.position.array, ix = geo.index.array, quedan = [];
    for (let t = 0; t < ix.length; t += 3) {
        const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
        let oculto = false;
        for (const pl of otras) {
            if (adentro(pl, p[a], p[a + 1], p[a + 2]) && adentro(pl, p[b], p[b + 1], p[b + 2]) && adentro(pl, p[c], p[c + 1], p[c + 2])) { oculto = true; break; }
        }
        if (!oculto) quedan.push(ix[t], ix[t + 1], ix[t + 2]);
    }
    geo.setIndex(quedan);
    return geo;
}

/**
 * Une las primitivas de un acabado en una sola geometría. `piezas`: todas las piezas del árbol (de todos los
 * acabados) como `{ geo, planos }`, para descartar lo que queda tapado por cualquiera de ellas.
 */
function geometriaDeSlot(THREE, propias, piezas, quitarOcultos) {
    const lista = [];
    for (const pz of propias) {
        const geo = pz.geo.clone();
        geo.deleteAttribute('uv');
        if (quitarOcultos) quitarTriangulosOcultos(geo, piezas.filter(o => o !== pz && o.planos).map(o => o.planos));
        if (geo.index.count) lista.push(geo);
    }
    if (!lista.length) return null;                  // el acabado quedó entero adentro de otras piezas
    const unida = lista.length === 1 ? lista[0] : mergeGeometries(lista, false);
    if (!unida) throw new Error('modelos-arboles: mergeGeometries falló');
    const geometria = mergeVertices(unida);          // sólo conserva los vértices referenciados por el índice
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
 * @param {{semilla: number, altoCuerpo?: number, quitarOcultos?: boolean}} op
 *   quitarOcultos (true por defecto): descarta triángulos tapados por otra pieza del mismo árbol.
 * @returns {{partes: {slot: number, geometria: object}[], radioTronco: number,
 *            alto: number, caja: object, perfil: Float64Array, radioColision: number}}
 */
export function geometriaArbol(THREE, especie, { semilla, altoCuerpo = ALTO_CUERPO_POR_DEFECTO, quitarOcultos = true } = {}) {
    const clave = `${especie}|${semilla}|${altoCuerpo}|${quitarOcultos ? 1 : 0}`;
    let a = cacheGeometria.get(clave);
    if (a) return a;

    const esp = especificarArbol(especie, { semilla, altoCuerpo });
    const porParte = esp.partes.map(({ primitivas }) => primitivas.map(pr => {
        const geo = geometriaDePrimitiva(THREE, pr);
        return { geo, planos: quitarOcultos ? planosConvexos(geo) : null };
    }));
    const piezas = porParte.flat();
    const partes = [];
    esp.partes.forEach(({ slot }, k) => {
        const geometria = geometriaDeSlot(THREE, porParte[k], piezas, quitarOcultos);
        if (geometria) partes.push({ slot, geometria });
    });
    for (const pz of piezas) pz.geo.dispose();
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
