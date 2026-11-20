// three/materiales.js - Materiales del arbolado (peer dependency: three).
// Equivalente a `materialPiezas` del juego: color por vértice y emisión neutra
// opcional. La emisión EN CERO por defecto: un árbol a la sombra se ve como
// silueta, no se ilumina solo.

const cacheMateriales = new Map();

/**
 * Material estándar con color por vértice.
 * @param {typeof import('three')} THREE
 */
export function materialPiezas(THREE, { metalness = 0.1, roughness = 0.75, emisivo = 0, brillo = 0 } = {}) {
    const m = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        metalness,
        roughness
    });
    if (emisivo > 0) {
        m.emissive = new THREE.Color(0xffffff).multiplyScalar(0.35 + brillo);
        m.emissiveIntensity = emisivo;
    }
    return m;
}

/** Acabados del arbolado: 0 corteza, 1 hoja, 2 flor/fruto. */
export const ACABADO = Object.freeze({ CORTEZA: 0, HOJA: 1, FLOR: 2 });

/**
 * Los tres materiales del arbolado para una emisión dada, cacheados.
 * @param {typeof import('three')} THREE
 * @param {number} emisivo
 * @returns {object[]} material por acabado (índice = ACABADO.*)
 */
export function materialesArbol(THREE, emisivo = 0) {
    const clave = String(emisivo);
    let m = cacheMateriales.get(clave);
    if (!m) {
        m = [];
        m[ACABADO.CORTEZA] = materialPiezas(THREE, { metalness: 0.0, roughness: 0.92, emisivo });
        m[ACABADO.HOJA] = materialPiezas(THREE, { metalness: 0.0, roughness: 0.85, emisivo });
        // flores y frutos: un pelín más de emisión, son el punto de color del árbol
        m[ACABADO.FLOR] = materialPiezas(THREE, { metalness: 0.0, roughness: 0.7, emisivo, brillo: 0.15 });
        cacheMateriales.set(clave, m);
    }
    return m;
}
