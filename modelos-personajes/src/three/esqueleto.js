// @greenborn/modelos-personajes - esqueleto y poses del muñeco (hilo principal,
// requiere three.js con el renderer). La geometría viene de ../geometria.
import * as THREE from 'three';
import { HUESOS, REPOSO, paletaCompleta, geometriaSkin, inversasDeReposo } from '../geometria/humanoide.js';
import { materialUnido } from './materiales.js';

/**
 * Construye el muñeco voxel.
 *
 * @param {object} opciones
 *   colores   {piel, cuerpo, piernas, ojos} y, si se quiere, cualquier color
 *             derivado de la paleta (chaleco, casco, bota, ...)
 *   sombras   si las partes proyectan/reciben sombra (default true)
 *   proyecta  si además PROYECTAN sombra al shadow map (default true); con
 *             false sólo la reciben (lo móvil usa un blob, ver sombra_blob.js)
 *   emisivo   intensidad de emisión del material (útil para que un jugador
 *             remoto no se vea negro en zonas sin luz)
 * @returns {{group: THREE.Group, partes: object}}
 *   `partes` trae los huesos con los mismos nombres de siempre -cabezaGroup,
 *   brazoIzqGroup, codoIzqGroup, brazoDerGroup, codoDerGroup, piernaIzqGroup,
 *   rodillaIzqGroup, piernaDerGroup, rodillaDerGroup-, que ahora son
 *   `THREE.Bone` en vez de `THREE.Group`: se rotan exactamente igual.
 *   `malla` es la única malla del muñeco. Los ojos, las manos y los pies no
 *   son meshes propias (van fusionadas en la cabeza, el antebrazo y la
 *   pantorrilla): `ojoIzquierdo`/`ojoDerecho`/`manoIzq`/`manoDer`/`pieIzq`/
 *   `pieDer` son nodos vacíos en el lugar exacto donde estaban, que es para lo
 *   único que se usaban (colgar cosas y medir).
 */
export function crearMuneco(opciones = {}) {
    const paleta = paletaCompleta(opciones.colores);
    const sombras = opciones.sombras !== false;
    const proyecta = opciones.proyecta !== false;
    const emisivo = opciones.emisivo || 0;

    const group = new THREE.Group();
    const partes = {};

    // --- esqueleto -----------------------------------------------------------
    const huesos = [];
    for (let i = 0; i < HUESOS.length; i++) {
        const h = HUESOS[i];
        const hueso = new THREE.Bone();
        hueso.position.set(h.pos[0], h.pos[1], h.pos[2]);
        if (h.padre >= 0) huesos[h.padre].add(hueso);
        huesos.push(hueso);
        partes[h.clave] = hueso;
    }

    // --- malla única ---------------------------------------------------------
    const malla = new THREE.SkinnedMesh(geometriaSkin(paleta), materialUnido({ emisivo }));
    malla.name = 'muñeco';   // ver window.debugDrawCalls() en script.js
    if (sombras) {
        malla.castShadow = proyecta;
        malla.receiveShadow = true;
    }
    malla.add(huesos[0]);
    // bindMatrix identidad: la geometría ya está en la pose de reposo del
    // esqueleto, y `bindMatrixInverse` (que three recalcula solo, porque el
    // bindMode es 'attached') cancela la transformada del grupo. O sea: mover,
    // girar o achatar `group` afecta al muñeco igual que cuando cada hueso era
    // una malla colgada de él.
    malla.bind(new THREE.Skeleton(huesos, inversasDeReposo()), new THREE.Matrix4());
    group.add(malla);
    partes.malla = malla;

    // --- anclas (no se dibujan: sirven para colgar y para medir) ------------
    const ancla = (clave, padre, x, y, z) => {
        const n = new THREE.Object3D();
        n.position.set(x, y, z);
        padre.add(n);
        partes[clave] = n;
    };
    // donde estaban las esferas de los ojos
    ancla('ojoIzquierdo', partes.cabezaGroup, -0.2, -0.13, 0.46);
    ancla('ojoDerecho', partes.cabezaGroup, 0.2, -0.13, 0.46);
    for (const lado of ['Izq', 'Der']) {
        // la mano: donde iba la caja `mano`, de la que colgaba el arma
        ancla(`mano${lado}`, partes[`codo${lado}Group`], 0, -1, 0);
        ancla(`pie${lado}`, partes[`rodilla${lado}Group`], 0, -1, 0.05);
    }

    return { group, partes };
}

/**
 * Ciclo de caminata calculado en el hilo principal: el mismo movimiento que
 * hace `worker_entidad.js`, pero sin un Worker por entidad (con 10 jugadores
 * remotos eso serían 10 hilos para mover 8 rotaciones).
 *
 * @param {object} partes       resultado de crearModeloHumanoide
 * @param {number} fase         fase del ciclo en radianes
 * @param {number} fuerza       0 = quieto, 1 = caminando a fondo
 * @param {boolean} conBrazos   false para animar sólo las piernas, cuando los
 *                              brazos los manda otra cosa (un arma sostenida
 *                              con `apuntarBrazo`)
 */
export function animarCaminata(partes, fase, fuerza = 1, conBrazos = true) {
    const s = Math.sin(fase) * fuerza;
    const c = Math.cos(fase) * fuerza;

    if (conBrazos) {
        partes.brazoIzqGroup.rotation.set(s * 0.7, 0, 0);
        partes.brazoDerGroup.rotation.set(-s * 0.7, 0, 0);
        partes.codoIzqGroup.rotation.set(-Math.max(0, c) * 0.5, 0, 0);
        partes.codoDerGroup.rotation.set(-Math.max(0, -c) * 0.5, 0, 0);
    }

    partes.piernaIzqGroup.rotation.x = -s * 0.8;
    partes.piernaDerGroup.rotation.x = s * 0.8;
    partes.rodillaIzqGroup.rotation.x = Math.max(0, -c) * 0.9;
    partes.rodillaDerGroup.rotation.x = Math.max(0, c) * 0.9;
}
const LARGO_SEGMENTO = 1;

const _d = new THREE.Vector3();
const _n = new THREE.Vector3();
const _eje = new THREE.Vector3();
const _sup = new THREE.Vector3();
const _inf = new THREE.Vector3();
const _ejeY = new THREE.Vector3();
const _ejeZ = new THREE.Vector3();
const _base = new THREE.Matrix4();

/**
 * Pone el brazo de `lado` con la mano en `objetivo`.
 *
 * @param {object} partes
 * @param {'Izq'|'Der'} lado
 * @param {THREE.Vector3} objetivo  en coordenadas del modelo (las mismas que
 *                                  `partes.brazoDerGroup.position`)
 */
export function apuntarBrazo(partes, lado, objetivo) {
    const hombro = partes[`brazo${lado}Group`];
    const codo = partes[`codo${lado}Group`];

    _d.copy(objetivo).sub(hombro.position);
    const alcance = LARGO_SEGMENTO * 2;
    const dist = Math.min(alcance - 0.04, Math.max(0.08, _d.length()));
    _n.copy(_d).normalize();

    // Eje de flexión del codo: perpendicular a la dirección del brazo y a la
    // vertical. Con el brazo apuntando adelante da ~±X, o sea el codo cae para
    // abajo, que es como se dobla un codo. Si el objetivo está justo encima o
    // justo debajo del hombro el producto cruz se degenera y se usa X.
    _eje.set(0, 1, 0).cross(_n);
    if (_eje.lengthSq() < 1e-6) _eje.set(1, 0, 0);
    _eje.normalize();

    const alfa = Math.acos(Math.min(1, (dist / 2) / LARGO_SEGMENTO));
    _sup.copy(_n).applyAxisAngle(_eje, alfa);    // dirección del brazo superior
    _inf.copy(_n).applyAxisAngle(_eje, -alfa);   // dirección del antebrazo

    // El hueso cuelga hacia -Y, así que la base del hombro tiene su -Y sobre
    // el brazo superior y su X sobre el eje del codo.
    _ejeY.copy(_sup).negate();
    _ejeZ.copy(_eje).cross(_ejeY).normalize();
    _base.makeBasis(_eje, _ejeY, _ejeZ);
    hombro.quaternion.setFromRotationMatrix(_base);

    // dentro de ese marco al antebrazo sólo le queda girar en X
    codo.rotation.set(Math.atan2(-_inf.dot(_ejeZ), -_inf.dot(_ejeY)), 0, 0);
}
