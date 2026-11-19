// Aplicación de las poses a three.js. Los números salen de src/animacion/poses.js.
//
// Dos caminos de dibujo, y cada uno tiene sus funciones:
//  1) Muñeco con esqueleto (crearMuneco): aplicarMuerte, aplicarInclinacion,
//     aplicarAgachado, animarCaminata (ya existía en three/esqueleto.js).
//  2) Pool instanciado (muchos personajes en pocas draw calls): matrizHuesoInstancia,
//     matrizRaizInstancia, matrizCadaver y geometriaCadaverFusionada. Ver PoolInstanciado.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
    geometriasRigidas, poseCaminataRigida, INVERSAS_HUESO, escalaParaAlto, offsetPies
} from '../geometria/humanoide.js';
import { ANIMACION, poseMuerte, poseCadaver, suavizar, inclinacionObjetivo } from '../animacion/poses.js';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _qYaw = new THREE.Quaternion();
const _qCaida = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _uno = new THREE.Vector3(1, 1, 1);
const _eje = new THREE.Vector3(1, 0, 0);
const _ejeY = new THREE.Vector3(0, 1, 0);
const _base = new THREE.Matrix4();
const _pivote = new THREE.Matrix4();
const _grupo = new THREE.Matrix4();
const _tmp = new THREE.Matrix4();

/**
 * Muerte del muñeco en pie: gira el modelo sobre X y baja la raíz.
 * @param {THREE.Object3D} modelo       grupo que se inclina (rotation.x)
 * @param {THREE.Object3D} raiz         nodo que baja (position.y)
 * @param {number} yOriginal            altura de la raíz antes de morir
 * @param {number} t                    segundos desde la muerte
 * @param {number} altoImpacto          alto del personaje (ANIMACION escala la caída con él)
 */
export function aplicarMuerte(modelo, raiz, yOriginal, t, altoImpacto) {
    const p = poseMuerte(t, altoImpacto);
    modelo.rotation.x = p.giro;
    raiz.position.y = yOriginal - p.caida;
}

/** Inclinación hacia adelante al correr, suavizada. Devuelve el nuevo valor. */
export function aplicarInclinacion(modelo, corriendo, dt) {
    modelo.rotation.x = suavizar(modelo.rotation.x, inclinacionObjetivo(corriendo), dt, ANIMACION.TASA_INCLINAR);
    return modelo.rotation.x;
}

/** Altura del muñeco (escala Y), suavizada hacia la del estado agachado o de pie. */
export function aplicarAgachado(modelo, escalaYObjetivo, dt) {
    modelo.scale.y = suavizar(modelo.scale.y, escalaYObjetivo, dt, ANIMACION.TASA_AGACHAR);
    return modelo.scale.y;
}

/**
 * Matriz de un hueso de una instancia: out = base · pose_i · inversa_i
 * (equivale a `bone.matrixWorld · boneInverse` del SkinnedMesh).
 * @param {THREE.Matrix4} out
 * @param {THREE.Matrix4} base    raíz · escala del grupo (ver matrizRaizInstancia)
 * @param {THREE.Matrix4} pose    pose del hueso i (poseCaminataRigida)
 * @param {THREE.Matrix4} inversa INVERSAS_HUESO[i]
 */
export function matrizHuesoInstancia(out, base, pose, inversa) {
    return out.multiplyMatrices(base, pose).multiply(inversa);
}

/**
 * Raíz de una instancia: pies en (x, y + offset, z) y rumbo rotY + π, sin escala.
 * Luego se multiplica por la escala del grupo (ver matrizGrupoInstancia).
 */
export function matrizRaizInstancia(out, x, y, z, rotY, escalaY) {
    _pos.set(x, y + offsetPies(escalaY), z);
    _euler.set(0, rotY + Math.PI, 0);
    _quat.setFromEuler(_euler);
    return out.compose(_pos, _quat, _uno);
}

/** Escala del grupo del muñeco para una instancia: escalaBase × (sx, sy, sz) del tipo. */
export function matrizGrupoInstancia(out, escalaBase, sx, sy, sz) {
    return out.makeScale(escalaBase * sx, escalaBase * sy, escalaBase * sz);
}

/**
 * Matriz de un cadáver instanciado en el segundo `t` desde su muerte.
 * M = T(P) · Ry(rumbo + π) · Rx(caída) · T(0, offsetPies, 0) · S(escala)
 * con el pivote en los pies, así que al caer se apoya en el suelo.
 * @param {THREE.Matrix4} out
 * @param {{x:number,y:number,z:number,rotY:number,sx:number,sy:number,sz:number}} c
 * @param {number} t                 segundos desde la muerte
 * @param {number} escalaBase        escalaParaAlto(alto de impacto)
 * @param {number} altoImpacto       alto del personaje (para levante y hundimiento)
 */
export function matrizCadaver(out, c, t, escalaBase, altoImpacto) {
    const p = poseCadaver(t);
    const escalaY = escalaBase * c.sy;
    const levante = ANIMACION.CADAVER_LEVANTE * altoImpacto * c.sy;
    const profundidad = ANIMACION.CADAVER_PROFUNDIDAD * altoImpacto * c.sy;
    _pos.set(c.x, c.y + levante - p.hundimiento * profundidad, c.z);
    _qYaw.setFromAxisAngle(_ejeY, c.rotY + Math.PI);
    _qCaida.setFromAxisAngle(_eje, p.angulo);
    _quat.multiplyQuaternions(_qYaw, _qCaida);
    _base.compose(_pos, _quat, _uno);
    _pivote.makeTranslation(0, offsetPies(escalaY), 0);
    _grupo.makeScale(escalaBase * c.sx, escalaY, escalaBase * c.sz);
    return out.copy(_base).multiply(_pivote).multiply(_grupo);
}

/**
 * Geometría única de los cadáveres: el muñeco en reposo (pose de caminata en 0)
 * fundido en una sola BufferGeometry. Así todos los cadáveres son un solo draw call.
 * Lanza si mergeGeometries falla (colores con atributos incompatibles).
 */
export function geometriaCadaverFusionada(colores) {
    const poses = INVERSAS_HUESO.map(() => new THREE.Matrix4());
    poseCaminataRigida(0, 0, poses, true);
    const partes = geometriasRigidas(colores).map((g, i) => {
        const c = g.clone();
        c.applyMatrix4(_tmp.multiplyMatrices(poses[i], INVERSAS_HUESO[i]));
        return c;
    });
    const geo = mergeGeometries(partes, false);
    if (!geo) throw new Error('geometriaCadaverFusionada: mergeGeometries falló');
    geo.computeBoundingSphere();
    return geo;
}

