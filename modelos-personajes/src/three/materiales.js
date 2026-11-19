// Adaptador de materiales (sólo hilo principal). Un único NodeMaterial para todo
// el muñeco: metalness, roughness y emisión salen del atributo `acabado`, y el
// color del atributo `color` (ver geometria/constructor_piezas.js).
import * as THREE from 'three';
import { attribute, vec3, float } from 'three/tsl';
import { ref } from '../geometria/contexto.js';

const materialesUnidos = new Map();

/**
 * @param {{emisivo?: number, opacidad?: number, luz?: number}} [opciones]
 *   luz: luz horneada que recibe el personaje (0..1), con el color de ref.COLOR_LUZ_CALIDA.
 */
export function materialUnido({ emisivo = 0, opacidad = 1, luz = 0 } = {}) {
    const clave = `${emisivo}|${opacidad}|${luz}`;
    let mat = materialesUnidos.get(clave);
    if (mat) return mat;

    mat = new THREE.MeshStandardNodeMaterial();
    mat.color.setHex(0xffffff);
    mat.vertexColors = true;
    if (opacidad < 1) {
        mat.transparent = true;
        mat.opacity = opacidad;
    }

    const acabado = attribute('acabado', 'vec3');
    mat.metalnessNode = acabado.x;
    mat.roughnessNode = acabado.y;
    let emision = emisivo > 0 ? vec3(acabado.z.mul(float(emisivo))) : null;
    if (luz > 0) {
        const horneada = attribute('color', 'vec3').mul(vec3(...ref.COLOR_LUZ_CALIDA)).mul(float(luz));
        emision = emision ? emision.add(horneada) : horneada;
    }
    if (emision) mat.emissiveNode = emision;

    // compartido: nadie que lo use debe hacerle dispose()
    mat.__compartido = true;
    materialesUnidos.set(clave, mat);
    return mat;
}
