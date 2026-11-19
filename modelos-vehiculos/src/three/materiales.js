// Materiales compartidos por todos los vehículos (un draw call por slot).
import * as THREE from 'three';
import { OPACO, VIDRIO, FARO, PILOTO, AZUL } from '../geometria/primitivas.js';

let compartidos = null;

/** Materiales por slot, creados una sola vez. */
export function materialesVehiculo() {
    if (compartidos) return compartidos;
    const luz = (color, emisivo) => new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: emisivo, metalness: 0, roughness: 0.3
    });
    compartidos = [];
    // Carrocería y vidrio SIN relleno emisivo a propósito: un auto estacionado
    // en la sombra tiene que quedar invisible (ver EMISIVO_ARBOL en el juego).
    compartidos[OPACO] = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.5 });
    compartidos[VIDRIO] = new THREE.MeshStandardMaterial({
        color: 0x86a9c4, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.26,
        side: THREE.DoubleSide, depthWrite: false
    });
    compartidos[FARO] = luz(0xfff2c0, 0.9);
    compartidos[PILOTO] = luz(0xd01212, 0.8);
    compartidos[AZUL] = luz(0x3a74ff, 0.85);
    return compartidos;
}

/** Partes listas para dibujar: `{geometry, material}` por slot. */
export function subMeshes(partes) {
    const mats = materialesVehiculo();
    return partes.map(({ slot, geometria }) => ({ geometry: geometria, material: mats[slot] }));
}
