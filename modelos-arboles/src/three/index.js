// three/index.js - API de three.js del paquete: geometría cacheada, submallas
// para EntityInstanceManager (instancing) y un árbol suelto para previews.

import { geometriaArbol } from './geometria.js';
import { materialesArbol } from './materiales.js';

export { geometriaArbol, geometriaDePrimitiva } from './geometria.js';
export { materialesArbol, materialPiezas, ACABADO } from './materiales.js';

/** Emisión por defecto del arbolado: en cero a propósito (ver materiales.js). */
export const EMISIVO_ARBOL = 0;

/**
 * Submallas de una especie: `{ geometry, material }` por acabado. Pensado para
 * instancing: la geometría se arma una vez y se comparte.
 *
 * @param {typeof import('three')} THREE
 * @param {string} especie
 * @param {{semilla: number, altoCuerpo?: number, emisivo?: number}} op
 */
export function subMeshesArbol(THREE, especie, op) {
    const emisivo = op.emisivo != null ? op.emisivo : EMISIVO_ARBOL;
    const mats = materialesArbol(THREE, emisivo);
    return geometriaArbol(THREE, especie, op).partes.map(({ slot, geometria }) => ({
        geometry: geometria,
        material: mats[slot]
    }));
}

/**
 * Árbol suelto como `THREE.Group`. Sólo lleva `userData` de medidas
 * (especie, radioTronco, alto); el juego agrega su propio estado de corte.
 *
 * @param {typeof import('three')} THREE
 * @param {string} especie
 * @param {{semilla: number, altoCuerpo?: number, emisivo?: number, sombras?: boolean}} op
 */
export function crearModeloArbol(THREE, especie, op) {
    const geo = geometriaArbol(THREE, especie, op);
    const mats = materialesArbol(THREE, op.emisivo != null ? op.emisivo : EMISIVO_ARBOL);

    const g = new THREE.Group();
    for (const { slot, geometria } of geo.partes) {
        const malla = new THREE.Mesh(geometria, mats[slot]);
        if (op.sombras) {
            malla.castShadow = true;
            malla.receiveShadow = true;
        }
        malla.name = `arbol_${especie}_${slot}`;
        g.add(malla);
    }
    g.userData.especie = especie;
    g.userData.radioTronco = geo.radioTronco;
    g.userData.alto = geo.alto;
    return g;
}

