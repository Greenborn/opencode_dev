// Accesorios del personaje voxel en three.js. Se cuelgan de los pivotes del personaje que arma
// @greenborn/modelos-personajes (crearPersonajeVoxel), así se mueven con él:
//   - cabeza y lentes  -> partes.body (no se mueven con la caminata)
//   - canasta          -> partes.armB (sigue al brazo derecho)
//
// Usa el mismo marco y los mismos pivotes que el cuerpo (rigVoxel), así que cada voxel del
// accesorio cae en la misma posición que en el personaje.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rigVoxel } from '@greenborn/modelos-personajes/geometria';
import { materialUnido, cuboVoxel } from '@greenborn/modelos-personajes/three';
import { voxelesAccesorios } from './voxeles.js';

const ORIGEN = [0, 0, 0];

/** Geometría fusionada de los voxels de una parte (cubos de cuboVoxel), en el espacio de su pivote. null si no hay voxels. */
function geometriaParte(vox, marco, pivote) {
    if (!vox.length) return null;
    const cubos = vox.map(v => cuboVoxel(v, marco, pivote));
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
