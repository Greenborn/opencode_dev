// Accesorios del personaje voxel en three.js. Se cuelgan de los pivotes del personaje que arma
// @greenborn/modelos-personajes (crearPersonajeVoxel), así se mueven con él:
//   - cabeza y lentes  -> partes.body (no se mueven con la caminata)
//   - canasta          -> partes.armB (sigue al brazo derecho)
//
// Usa el mismo marco y los mismos pivotes que el cuerpo (rigVoxel), así que cada voxel del
// accesorio cae en la misma posición que en el personaje.

import * as THREE from 'three';
import { rigVoxel } from '@greenborn/modelos-personajes/geometria';
import { materialUnido, geometriaVoxel } from '@greenborn/modelos-personajes/three';
import { voxelesAccesorios } from './voxeles.js';

const ORIGEN = [0, 0, 0];

/**
 * Geometría de los voxels de una parte, en el espacio de su pivote. null si no hay voxels.
 * Usa geometriaVoxel (greedy meshing de modelos-personajes >= 0.8.0): sólo caras expuestas, caras contiguas
 * del mismo color fundidas y vértices indexados. Mismo aspecto que un cubo por voxel (mismos atributos,
 * color por cara, silueta y límites), con muchos menos vértices.
 */
function geometriaParte(vox, marco, pivote) {
    if (!vox.length) return null;
    return geometriaVoxel(vox, marco, pivote);
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
