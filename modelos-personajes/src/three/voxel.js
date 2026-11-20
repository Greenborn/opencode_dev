// Personaje voxel en three.js: mismo esquema que el muñeco articulado (partes con pivote, pose de
// caminata, inclinación, PoolInstanciado y matrices de instancia), con geometría de cubos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
    PARTES_VOXEL, rigVoxel, posModeloVoxel, parteDeVoxel, angulosVoxelCaminata, claveVoxel,
} from '../geometria/voxel_rig.js';
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
 * Geometría de cada parte (en el espacio de su pivote), en orden de PARTES_VOXEL.
 * Cacheada por cfg: mismo cfg, misma geometría (como geometriaSkin en el muñeco articulado).
 * @returns {{ geometrias: THREE.BufferGeometry[], pivotes: number[][] }}
 */
export function piezasVoxelRigidas(cfg = {}) {
    const clave = claveVoxel(cfg);
    let r = cacheRig.get(clave);
    if (r) return r;
    const { marco, pivotes, porParte } = rigVoxel(cfg);
    const geometrias = PARTES_VOXEL.map(k => {
        const lista = porParte[k].map(v => cuboVoxel(v, marco, pivotes[k]));
        const g = mergeGeometries(lista, false);
        if (!g) throw new Error(`voxel: mergeGeometries falló en ${k}`);
        g.computeBoundingSphere();
        return g;
    });
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
