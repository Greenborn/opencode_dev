// Accesorios del personaje voxel en three.js. Se cuelgan de los pivotes del personaje que arma
// @greenborn/modelos-personajes (crearPersonajeVoxel), así se mueven con él:
//   - cabeza y lentes  -> partes.body (no se mueven con la caminata)
//   - canasta          -> partes.armB (sigue al brazo derecho)
//
// Usa el mismo marco y los mismos pivotes que el cuerpo (rigVoxel), así que cada voxel del
// accesorio cae en la misma posición que en el personaje.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rigVoxel, posModeloVoxel } from '@greenborn/modelos-personajes/geometria';
import { materialUnido } from '@greenborn/modelos-personajes/three';
import { voxelesAccesorios } from './voxeles.js';

// Mismo acabado que el cuerpo (metalness, roughness, brillo), para que el material unido los trate igual.
const ACABADO = [0.1, 0.75, 0.35];
const ORIGEN = [0, 0, 0];

/** Geometría fusionada de los voxels de una parte, en el espacio de su pivote. null si no hay voxels. */
function geometriaParte(vox, marco, pivote) {
    if (!vox.length) return null;
    const cubos = vox.map(v => {
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
    });
    const g = mergeGeometries(cubos, false);
    cubos.forEach(c => c.dispose());
    if (!g) throw new Error('accesorios: mergeGeometries falló');
    g.computeBoundingSphere();
    return g;
}

/**
 * Agrega los accesorios de `cfg` a un personaje ya creado con crearPersonajeVoxel(cfg).
 * `personaje` = { group, partes }; se modifica y se devuelve. Si la cfg no tiene accesorios, no agrega nada.
 * opciones.material: material propio (por defecto materialUnido, igual que el cuerpo).
 */
export function adjuntarAccesorios(personaje, cfg = {}, { material } = {}) {
    const { marco, pivotes } = rigVoxel(cfg);
    const vox = voxelesAccesorios(cfg);
    const mat = material || materialUnido({});
    const pivoteDe = { body: ORIGEN, armB: pivotes.armB };
    for (const parte of ['body', 'armB']) {
        const g = geometriaParte(vox[parte], marco, pivoteDe[parte]);
        if (g) personaje.partes[parte].add(new THREE.Mesh(g, mat));
    }
    return personaje;
}
