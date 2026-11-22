// Personaje voxel en three.js: mismo esquema que el muñeco articulado (partes con pivote, pose de
// caminata, inclinación, PoolInstanciado y matrices de instancia), con geometría de cubos.
import * as THREE from 'three';
import {
    PARTES_VOXEL, rigVoxel, posModeloVoxel, parteDeVoxel, angulosVoxelCaminata, claveVoxel,
} from '../geometria/voxel_rig.js';
import { mallaVoxelGreedy } from '../geometria/voxel_malla.js';
import { materialUnido } from './materiales.js';

// Acabado por defecto, igual que ConstructorPiezas: metalness, roughness, brillo (emisión).
const ACABADO = [0.1, 0.75, 0.35];
const _t = new THREE.Matrix4(), _r = new THREE.Matrix4();
const cacheRig = new Map();

/**
 * Cubo de un voxel con su color y acabado por vértice, en el espacio del pivote `pivote`.
 * Público (subruta /three): lo usa @greenborn/accesorios-personaje para armar sus piezas con el mismo acabado.
 */
export function cuboVoxel(v, marco, pivote) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const [x, y, z] = posModeloVoxel(v, marco);
    g.translate(x - pivote[0], y - pivote[1], z - pivote[2]);
    const n = g.attributes.position.count;
    const color = new Float32Array(n * 3), acabado = new Float32Array(n * 3);
    const c = new THREE.Color(v.c);
    for (let i = 0; i < n; i++) {
        color.set([c.r, c.g, c.b], i * 3);
        acabado.set(ACABADO, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    g.setAttribute('acabado', new THREE.BufferAttribute(acabado, 3));
    return g;
}

/**
 * Geometría de una lista de voxels en el espacio del pivote `pivote`, con greedy meshing
 * (mallaVoxelGreedy): sólo caras expuestas, caras contiguas del mismo color fundidas y vértices
 * indexados. Mismos atributos que cuboVoxel (position, normal, color, acabado), sin uv (el material
 * no lo usa), y mismo volumen, silueta, límites y color por cara que fusionar un cuboVoxel por voxel.
 * Las caras sólo se quitan contra vecinos de la MISMA lista: cada parte del rig rota por separado.
 * Pública (subruta /three) para armar otras piezas voxel (p. ej. accesorios) con el mismo acabado.
 * @returns {THREE.BufferGeometry}
 */
export function geometriaVoxel(vox, marco, pivote) {
    const n = vox.length;
    const celdas = new Int32Array(n * 3), claves = new Int32Array(n);
    const paleta = [], idx = new Map();
    for (let i = 0; i < n; i++) {
        const v = vox[i];
        // ejes del modelo (posModeloVoxel): X = v.x, Y = v.z (altura), Z = v.y (frente)
        celdas[i * 3] = v.x; celdas[i * 3 + 1] = v.z; celdas[i * 3 + 2] = v.y;
        let k = idx.get(v.c);
        if (k === undefined) { paleta.push(new THREE.Color(v.c)); k = paleta.length; idx.set(v.c, k); }
        claves[i] = k;
    }
    const m = mallaVoxelGreedy(celdas, claves);
    // la celda entera (x, z, y) va de posModeloVoxel - 0.5 a + 0.5: origen = esquina menos el pivote
    const o = [-marco.mx - pivote[0], -pivote[1], -marco.my - pivote[2]];
    const nv = m.claves.length;
    const pos = new Float32Array(nv * 3), color = new Float32Array(nv * 3), acabado = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
        for (let e = 0; e < 3; e++) pos[i * 3 + e] = m.posiciones[i * 3 + e] + o[e];
        const c = paleta[m.claves[i] - 1];
        color[i * 3] = c.r; color[i * 3 + 1] = c.g; color[i * 3 + 2] = c.b;
        acabado.set(ACABADO, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(m.normales, 3));
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    g.setAttribute('acabado', new THREE.BufferAttribute(acabado, 3));
    g.setIndex(new THREE.BufferAttribute(m.indices, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
}

/**
 * Geometría de cada parte (en el espacio de su pivote), en orden de PARTES_VOXEL, con greedy
 * meshing (geometriaVoxel): en un peatón típico ~20 veces menos vértices que un cubo por voxel.
 * Cacheada por cfg: mismo cfg, misma geometría (como geometriaSkin en el muñeco articulado).
 * @returns {{ geometrias: THREE.BufferGeometry[], pivotes: number[][] }}
 */
export function piezasVoxelRigidas(cfg = {}) {
    const clave = claveVoxel(cfg);
    let r = cacheRig.get(clave);
    if (r) return r;
    const { marco, pivotes, porParte } = rigVoxel(cfg);
    const geometrias = PARTES_VOXEL.map(k => geometriaVoxel(porParte[k], marco, pivotes[k]));
    r = { geometrias, pivotes: PARTES_VOXEL.map(k => pivotes[k]) };
    cacheRig.set(clave, r);
    return r;
}

/**
 * Personaje voxel del paquete. Mismo contrato que crearMuneco: { group, partes }.
 * opciones.material: material propio (por defecto materialUnido, que usa NodeMaterial/WebGPU).
 * group mide 36 unidades (escalaVoxelParaAlto(alto) para el alto deseado); los pies quedan en y = 0.
 * partes: pivotes (Group) de cuerpo, legA, legB, armA, armB; animarCaminataVoxel rota esos Group.
 */
export function crearPersonajeVoxel(cfg = {}, { material } = {}) {
    const { geometrias, pivotes } = piezasVoxelRigidas(cfg);
    const mat = material || materialUnido({});
    const group = new THREE.Group();
    const partes = {};
    PARTES_VOXEL.forEach((k, i) => {
        const pivote = new THREE.Group();
        pivote.position.set(...pivotes[i]);
        pivote.add(new THREE.Mesh(geometrias[i], mat));
        group.add(pivote);
        partes[k] = pivote;
    });
    return { group, partes };
}

/** Caminata del personaje voxel: rota las partes con angulosVoxelCaminata. */
export function animarCaminataVoxel(partes, fase, fuerza = 1) {
    const a = angulosVoxelCaminata(fase, fuerza);
    for (const k of PARTES_VOXEL) partes[k].rotation.x = a[k];
}

/**
 * Matriz de una parte en una instancia: out = base · T(pivote) · Rx(angulo).
 * base = raíz de la instancia (matrizRaizInstancia · matrizGrupoInstancia); pivote y angulo por parte.
 */
export function matrizParteVoxel(out, base, pivote, angulo) {
    _t.makeTranslation(pivote[0], pivote[1], pivote[2]);
    _r.makeRotationX(angulo);
    return out.multiplyMatrices(base, _t.multiply(_r));
}

/** Pose de todas las partes de una instancia: devuelve matrices en orden de PARTES_VOXEL. */
export function matricesVoxelInstancia(out, base, pivotes, angulos) {
    PARTES_VOXEL.forEach((k, i) => matrizParteVoxel(out[i], base, pivotes[i], angulos[k]));
    return out;
}

/** Nombre de parte de un voxel (re-exportado para tests y herramientas). */
export { parteDeVoxel };
