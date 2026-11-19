// @greenborn/modelos-personajes - geometría del muñeco voxel articulado (bots,
// jugadores remotos, zombies y tenderos). Sin DOM ni materiales: apta para un
// Web Worker. Ver README.md.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ConstructorPiezas } from './constructor_piezas.js';

// --- medidas del modelo, en unidades locales (antes de escalar) -------------
// El muñeco va desde y = -1.15 (planta del pie) hasta y = 4.0 (coronilla).
export const BASE_MODELO = 1.15;                       // cuánto baja de y=0
export const TOPE_MODELO = 4.0;                        // coronilla
export const ALTO_MODELO = BASE_MODELO + TOPE_MODELO;  // 5.15 unidades locales

/** Escala necesaria para que el muñeco mida `alto` bloques. */
export function escalaParaAlto(alto) {
    return alto / ALTO_MODELO;
}

/** Desplazamiento en Y para que, con esa escala, los pies queden en position.y. */
export function offsetPies(escala) {
    return BASE_MODELO * escala;
}

// --- pivotes de los huesos --------------------------------------------------
const Y_CABEZA = 3.5;    // centro de la cabeza
const Y_TORSO = 2.0;     // centro del torso
const Y_HOMBRO = 3.0;
const X_HOMBRO = 0.75;
const Y_CADERA = 1.0;
const X_CADERA = 0.25;

// --- acabados (slots del constructor) --------------------------------------
const MATE = 0;    // tela, piel, cuero
const DURO = 1;    // metal, plástico, goma
const VIDRIO = 2;  // lentes de las gafas

/**
 * Metalness/roughness/brillo de cada acabado. No son tres materiales: van
 * horneados por vértice, así que el muñeco entero -piel mate, casco duro y
 * lentes brillantes- se dibuja con uno solo (ver `construirUnido`).
 */
const ACABADOS = [];
ACABADOS[MATE] = { metalness: 0.04, roughness: 0.82 };
ACABADOS[DURO] = { metalness: 0.45, roughness: 0.42 };
ACABADOS[VIDRIO] = { metalness: 0.9, roughness: 0.08, brillo: 0.35 };

// --- paleta -----------------------------------------------------------------

function oscurecer(hex, f) {
    const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
    const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
    const b = Math.min(255, Math.round((hex & 0xff) * f));
    return (r << 16) | (g << 8) | b;
}

/** Mezcla `a` hacia `b`: t=0 deja `a`, t=1 deja `b`. */
function mezclar(a, b, t) {
    const mix = (ca, cb) => Math.round(ca + (cb - ca) * t);
    const r = mix((a >> 16) & 0xff, (b >> 16) & 0xff);
    const g = mix((a >> 8) & 0xff, (b >> 8) & 0xff);
    const bl = mix(a & 0xff, b & 0xff);
    return (r << 16) | (g << 8) | bl;
}

const COLORES_POR_DEFECTO = {
    piel: 0xFFDBAC,
    cuerpo: 0x0000FF,
    piernas: 0x000080,
    ojos: 0xFFFFFF
};

/**
 * Completa la paleta a partir de los cuatro colores "públicos".
 *
 * El equipamiento no usa el color del jugador tal cual: lo mezcla con gris
 * oscuro militar. Así el color sigue identificando al jugador de lejos (es lo
 * que necesita el multijugador) pero el muñeco no queda de un solo tono
 * saturado de pies a cabeza.
 */
export function paletaCompleta(colores) {
    const c = { ...COLORES_POR_DEFECTO, ...(colores || {}) };
    const chaleco = mezclar(c.cuerpo, 0x33373c, 0.74);
    const casco = mezclar(c.cuerpo, 0x3b4038, 0.68);
    const bota = 0x2d2621;
    const base = {
        piel: c.piel,
        pielOsc: oscurecer(c.piel, 0.82),
        uniforme: c.cuerpo,
        uniformeOsc: oscurecer(c.cuerpo, 0.7),
        pantalon: c.piernas,
        pantalonOsc: oscurecer(c.piernas, 0.75),
        ojos: c.ojos,
        pupila: 0x14181d,
        chaleco,
        chalecoOsc: oscurecer(chaleco, 0.78),
        casco,
        cascoOsc: oscurecer(casco, 0.7),
        insignia: mezclar(c.cuerpo, 0xffffff, 0.45),
        mochila: mezclar(c.cuerpo, 0x2b2f26, 0.82),
        correas: 0x2f3237,
        cinturon: 0x241f1b,
        guante: 0x26282b,
        bota,
        botaOsc: oscurecer(bota, 0.6),
        oscuro: 0x1b1d20,
        metal: 0x8d939b,
        vidrio: 0x7fc9e4
    };
    return { ...base, ...(colores || {}) };
}

// --- esqueleto --------------------------------------------------------------
//
// El orden de esta tabla ES el índice de hueso que llevan los vértices en el
// atributo `skinIndex`, así que agregar huesos al final es seguro y
// reordenarlos no.
//
//   clave   nombre con el que queda en `partes` (los mismos que usaba la
//           versión de un Group por hueso: no hay que tocar a quien anima)
//   padre   índice del hueso del que cuelga, -1 para la raíz
//   pos     posición de reposo RELATIVA al padre
//   pieza   piezas del hueso; los huesos izquierdo y derecho se construyen por
//           separado porque hay piezas asimétricas (el pulgar, los bolsillos
//           laterales, el auricular de la radio)
//   centro  dónde está authorada la pieza dentro del hueso (sólo el torso, que
//           se dibuja alrededor de su centro y no del pivote de la raíz)
export const HUESOS = [
    { clave: 'raizGroup', padre: -1, pos: [0, 0, 0], centro: [0, Y_TORSO, 0], pieza: p => torso(p) },
    { clave: 'cabezaGroup', padre: 0, pos: [0, Y_CABEZA, 0], pieza: p => cabeza(p) },
    { clave: 'brazoIzqGroup', padre: 0, pos: [-X_HOMBRO, Y_HOMBRO, 0], pieza: p => brazoSuperior(p) },
    { clave: 'codoIzqGroup', padre: 2, pos: [0, -1, 0], pieza: p => brazoInferior(p, -1) },
    { clave: 'brazoDerGroup', padre: 0, pos: [X_HOMBRO, Y_HOMBRO, 0], pieza: p => brazoSuperior(p) },
    { clave: 'codoDerGroup', padre: 4, pos: [0, -1, 0], pieza: p => brazoInferior(p, 1) },
    { clave: 'piernaIzqGroup', padre: 0, pos: [-X_CADERA, Y_CADERA, 0], pieza: p => piernaSuperior(p, -1) },
    { clave: 'rodillaIzqGroup', padre: 6, pos: [0, -1, 0], pieza: p => piernaInferior(p) },
    { clave: 'piernaDerGroup', padre: 0, pos: [X_CADERA, Y_CADERA, 0], pieza: p => piernaSuperior(p, 1) },
    { clave: 'rodillaDerGroup', padre: 8, pos: [0, -1, 0], pieza: p => piernaInferior(p) }
];

/** Posición de reposo de cada hueso en coordenadas del modelo. */
export const REPOSO = HUESOS.map(() => [0, 0, 0]);
for (let i = 0; i < HUESOS.length; i++) {
    const { padre, pos } = HUESOS[i];
    const base = padre >= 0 ? REPOSO[padre] : [0, 0, 0];
    REPOSO[i] = [base[0] + pos[0], base[1] + pos[1], base[2] + pos[2]];
}

// --- cache de geometrías por paleta ----------------------------------------
const cacheSkin = new Map();

export function geometriaSkin(paleta) {
    const clave = JSON.stringify(paleta);
    let g = cacheSkin.get(clave);
    if (!g) {
        g = construirSkin(paleta);
        cacheSkin.set(clave, g);
    }
    return g;
}

/**
 * Arma la geometría completa del muñeco (una sola vez por paleta): las piezas
 * de cada hueso, llevadas a la pose de reposo y marcadas con el índice de su
 * hueso, fusionadas en una única geometría con esqueleto.
 *
 * Skinning RÍGIDO: cada vértice pesa 1 en un solo hueso. Es lo que hace que un
 * muñeco de cajas articuladas se vea igual que antes -las piezas no se
 * deforman, giran enteras con su hueso- pero en una sola malla.
 */
function construirSkin(p) {
    const piezas = [];
    for (let i = 0; i < HUESOS.length; i++) {
        const h = HUESOS[i];
        const { geometria } = h.pieza(p).construirUnido(ACABADOS);
        const c = h.centro || [0, 0, 0];
        geometria.translate(REPOSO[i][0] + c[0], REPOSO[i][1] + c[1], REPOSO[i][2] + c[2]);

        const n = geometria.attributes.position.count;
        const indices = new Uint16Array(n * 4);
        const pesos = new Float32Array(n * 4);
        for (let v = 0; v < n; v++) {
            indices[v * 4] = i;
            pesos[v * 4] = 1;
        }
        geometria.setAttribute('skinIndex', new THREE.BufferAttribute(indices, 4));
        geometria.setAttribute('skinWeight', new THREE.BufferAttribute(pesos, 4));
        piezas.push(geometria);
    }

    const geometria = mergeGeometries(piezas, false);
    if (!geometria) throw new Error('modelo_humanoide: mergeGeometries falló');
    geometria.computeBoundingBox();
    geometria.computeBoundingSphere();
    return geometria;
}

/**
 * Inversas de la pose de reposo (`boneInverses` del esqueleto). Son
 * traslaciones puras -ningún hueso nace rotado ni escalado-, iguales para
 * todas las paletas, pero `THREE.Skeleton` guarda el array que se le pasa, así
 * que cada muñeco se lleva una copia propia.
 */
export function inversasDeReposo() {
    return REPOSO.map(r => new THREE.Matrix4().makeTranslation(-r[0], -r[1], -r[2]));
}

// --- cabeza -----------------------------------------------------------------
// Coordenadas locales al centro de la cabeza (que va en y = 3.5), así que el
// cráneo ocupa -0.5..0.5 y el tope absoluto de cualquier pieza es ±0.5 en Y.
function cabeza(p) {
    const c = new ConstructorPiezas(3);

    c.caja([1, 1, 1], [0, 0, 0], p.piel, MATE);
    c.caja([0.9, 0.26, 0.94], [0, -0.38, 0.02], p.pielOsc, MATE);        // mandíbula

    // casco
    c.caja([1.06, 0.36, 1.08], [0, 0.32, -0.01], p.casco, DURO);
    c.caja([0.16, 0.08, 1.0], [0, 0.46, -0.01], p.cascoOsc, DURO);       // cresta
    c.caja([0.86, 0.09, 0.2], [0, 0.17, 0.46], p.cascoOsc, DURO);        // visera
    c.caja([1.0, 0.16, 0.1], [0, 0.1, -0.5], p.cascoOsc, DURO);          // cubrenuca
    for (const s of [-1, 1]) {
        c.caja([0.07, 0.4, 0.07], [0.49 * s, -0.12, 0.16], p.correas, DURO); // barbuquejo
    }

    // gafas subidas a la frente
    c.caja([1.0, 0.14, 1.06], [0, 0.04, 0], p.oscuro, DURO);
    for (const s of [-1, 1]) {
        c.caja([0.32, 0.13, 0.05], [0.21 * s, 0.04, 0.53], p.vidrio, VIDRIO);
    }

    // cara
    for (const s of [-1, 1]) {
        c.esfera(0.1, [0.2 * s, -0.13, 0.46], p.ojos, MATE);
        c.esfera(0.05, [0.2 * s, -0.13, 0.51], p.pupila, MATE);
        c.caja([0.08, 0.2, 0.18], [0.52 * s, -0.1, -0.02], p.piel, MATE); // orejas
    }
    c.caja([0.13, 0.16, 0.1], [0, -0.22, 0.5], p.piel, MATE);            // nariz
    c.caja([0.26, 0.05, 0.05], [0, -0.36, 0.5], p.oscuro, MATE);         // boca

    // auricular + micrófono de la radio (sólo del lado derecho)
    c.caja([0.1, 0.24, 0.24], [0.51, -0.06, -0.02], p.oscuro, DURO);
    c.caja([0.05, 0.05, 0.3], [0.4, -0.26, 0.26], p.oscuro, DURO, [0, 0.5, 0]);
    c.caja([0.07, 0.07, 0.07], [0.24, -0.3, 0.42], p.metal, DURO);

    return c;
}

// --- torso ------------------------------------------------------------------
// Local al centro del torso (y = 2.0): el torso ocupa -1..1 en Y.
function torso(p) {
    const c = new ConstructorPiezas(3);

    c.caja([1.0, 2.0, 0.5], [0, 0, 0], p.uniforme, MATE);
    c.caja([1.1, 0.34, 0.56], [0, 0.82, 0], p.uniformeOsc, MATE);        // yugo de hombros
    c.caja([0.34, 0.3, 0.34], [0, 1.08, 0], p.piel, MATE);               // cuello

    // chaleco antibalas
    c.caja([1.04, 1.02, 0.6], [0, 0.34, 0], p.chaleco, MATE);
    c.caja([1.0, 0.18, 0.62], [0, 0.78, 0], p.chalecoOsc, MATE);         // cuello del chaleco
    c.caja([0.6, 0.5, 0.07], [0, 0.48, 0.32], p.oscuro, DURO);           // placa pectoral
    for (let i = -1; i <= 1; i++) {
        c.caja([0.19, 0.3, 0.1], [i * 0.3, 0.06, 0.32], p.oscuro, DURO); // cargadores
    }

    // tirantes, radio y antena
    for (const s of [-1, 1]) {
        c.caja([0.14, 1.1, 0.06], [0.3 * s, 0.42, 0.31], p.correas, MATE);
    }
    c.caja([0.14, 0.2, 0.1], [-0.3, 0.72, 0.32], p.oscuro, DURO);
    c.caja([0.03, 0.34, 0.03], [-0.3, 0.97, 0.32], p.oscuro, DURO);

    // cinturón
    c.caja([1.06, 0.2, 0.56], [0, -0.86, 0], p.cinturon, MATE);
    c.caja([0.2, 0.16, 0.07], [0, -0.86, 0.3], p.metal, DURO);           // hebilla
    for (const s of [-1, 1]) {
        c.caja([0.24, 0.26, 0.12], [0.36 * s, -0.93, 0.26], p.oscuro, DURO);
    }
    c.cilindro(0.11, 0.28, [0.42, -0.92, -0.22], p.oscuro, DURO);        // cantimplora

    // mochila
    c.caja([0.72, 0.92, 0.14], [0, 0.26, -0.305], p.mochila, MATE);
    for (const s of [-1, 1]) {
        c.caja([0.08, 0.9, 0.17], [0.3 * s, 0.26, -0.3], p.correas, MATE);
    }
    c.cilindro(0.09, 0.66, [0, 0.76, -0.29], p.mochila, MATE, [0, 0, Math.PI / 2], 8);

    return c;
}

// --- brazos -----------------------------------------------------------------
// Local al hombro (±0.75, 3, 0). El brazo cuelga hacia -Y. Es simétrico, así
// que los dos hombros comparten la geometría.
function brazoSuperior(p) {
    const c = new ConstructorPiezas(3);
    c.caja([0.5, 1.0, 0.5], [0, -0.5, 0], p.uniforme, MATE);             // manga
    c.caja([0.52, 0.26, 0.54], [0, -0.14, 0], p.chaleco, MATE);          // hombrera
    c.caja([0.2, 0.18, 0.04], [0, -0.42, 0.26], p.insignia, MATE);       // insignia
    c.caja([0.52, 0.12, 0.52], [0, -0.94, 0], p.uniformeOsc, MATE);      // puño de la manga
    return c;
}

// Local al codo (0, -1, 0 dentro del hombro, o sea y = 2.0 del modelo).
function brazoInferior(p, signo) {
    const c = new ConstructorPiezas(3);
    c.caja([0.5, 0.24, 0.52], [0, -0.06, 0.01], p.oscuro, DURO);         // codera
    c.caja([0.46, 1.0, 0.46], [0, -0.5, 0], p.piel, MATE);               // antebrazo
    c.caja([0.48, 0.1, 0.48], [0, -0.86, 0], p.oscuro, MATE);            // muñequera
    c.caja([0.44, 0.3, 0.46], [0, -1.06, 0.01], p.guante, MATE);         // dorso del guante
    c.caja([0.42, 0.14, 0.2], [0, -1.14, 0.22], p.guante, MATE);         // dedos
    c.caja([0.12, 0.16, 0.18], [-0.2 * signo, -1.0, 0.14], p.guante, MATE); // pulgar
    return c;
}

// --- piernas ----------------------------------------------------------------
// Local a la cadera (±0.25, 1, 0). Ojo: la zona de impacto de cada pierna es
// media silueta (x de 0 a ±0.568), así que ninguna pieza puede pasar de 0.5 de
// ancho centrada en el pivote.
function piernaSuperior(p, signo) {
    const c = new ConstructorPiezas(3);
    c.caja([0.5, 1.0, 0.5], [0, -0.5, 0], p.pantalon, MATE);             // muslo
    c.caja([0.5, 0.26, 0.52], [0, -0.04, 0], p.pantalonOsc, MATE);       // cadera
    c.caja([0.08, 0.3, 0.26], [0.21 * signo, -0.52, 0.02], p.pantalonOsc, MATE); // bolsillo
    c.caja([0.5, 0.1, 0.5], [0, -0.8, 0], p.correas, MATE);              // correa de la funda
    return c;
}

// Local a la rodilla (0, -1, 0 dentro de la cadera, o sea y = 0 del modelo).
// Es simétrica, así que las dos piernas comparten la geometría.
function piernaInferior(p) {
    const c = new ConstructorPiezas(3);
    c.caja([0.5, 0.28, 0.54], [0, -0.05, 0.02], p.oscuro, DURO);         // rodillera
    c.caja([0.46, 1.0, 0.46], [0, -0.5, 0], p.pantalon, MATE);           // pantorrilla
    c.caja([0.5, 0.38, 0.5], [0, -0.78, 0], p.bota, MATE);               // caña de la bota
    c.caja([0.5, 0.22, 0.62], [0, -1.0, 0.05], p.bota, MATE);            // empeine
    c.caja([0.46, 0.16, 0.16], [0, -1.03, 0.3], p.botaOsc, DURO);        // puntera
    c.caja([0.5, 0.13, 0.66], [0, -1.085, 0.04], p.oscuro, DURO);        // suela
    for (let i = 0; i < 2; i++) {
        c.caja([0.3, 0.04, 0.05], [0, -0.86 + i * 0.1, 0.24], p.oscuro, MATE); // cordones
    }
    return c;
}

// --- versión rígida para instancing ------------------------------------------
//
// Los zombies de horda se dibujan con InstancedMesh (ver
// multijugador/zombies_instanciados.js), que no admite huesos. Por eso acá se
// exponen las piezas de cada hueso como geometrías rígidas separadas, y la
// pose del esqueleto como matrices de cada hueso: M_i = pose_i · inversa_i.

/** Índice de cada hueso en HUESOS (orden de la lista). */
export const IDX_HUESO = Object.freeze(Object.fromEntries(HUESOS.map((h, i) => [h.clave, i])));

/** Padre de cada hueso (-1 para la raíz). */
export const PADRE_HUESO = HUESOS.map(h => h.padre);

/** Inversas de la pose de reposo, por hueso (las mismas de `crearModeloHumanoide`). */
export const INVERSAS_HUESO = inversasDeReposo();

const cacheRigida = new Map();

/**
 * Una geometría por hueso, en coordenadas del modelo (ya llevadas a la pose de
 * reposo), listas para dibujarse con la matriz `pose_i · inversa_i`.
 * Cacheadas por paleta, igual que `geometriaSkin`.
 */
export function geometriasRigidas(colores) {
    const paleta = paletaCompleta(colores);
    const clave = JSON.stringify(paleta);
    let lista = cacheRigida.get(clave);
    if (!lista) {
        lista = HUESOS.map((h, i) => {
            const { geometria } = h.pieza(paleta).construirUnido(ACABADOS);
            const c = h.centro || [0, 0, 0];
            geometria.translate(REPOSO[i][0] + c[0], REPOSO[i][1] + c[1], REPOSO[i][2] + c[2]);
            geometria.computeBoundingSphere();
            return geometria;
        });
        cacheRigida.set(clave, lista);
    }
    return lista;
}

const _rot = new THREE.Matrix4();
const _loc = new THREE.Matrix4();

/**
 * Matrices de cada hueso en espacio del grupo del muñeco (equivalente a
 * `bone.matrixWorld` relativo a `group`) para la pose de `animarCaminata`.
 * Sólo usa la rotación en X de cada hueso, igual que esa función.
 * Cabeza y raíz quedan en reposo: en la versión instanciada no siguen la mira.
 * @param {number} fase
 * @param {number} fuerza    0..1
 * @param {THREE.Matrix4[]} out  arreglo de HUESOS.length matrices, se reescribe
 * @param {boolean} conBrazos
 */
export function poseCaminataRigida(fase, fuerza, out, conBrazos = true) {
    const s = Math.sin(fase) * fuerza;
    const c = Math.cos(fase) * fuerza;
    const rx = new Array(HUESOS.length).fill(0);
    if (conBrazos) {
        rx[IDX_HUESO.brazoIzqGroup] = s * 0.7;
        rx[IDX_HUESO.brazoDerGroup] = -s * 0.7;
        rx[IDX_HUESO.codoIzqGroup] = -Math.max(0, c) * 0.5;
        rx[IDX_HUESO.codoDerGroup] = -Math.max(0, -c) * 0.5;
    }
    rx[IDX_HUESO.piernaIzqGroup] = -s * 0.8;
    rx[IDX_HUESO.piernaDerGroup] = s * 0.8;
    rx[IDX_HUESO.rodillaIzqGroup] = Math.max(0, -c) * 0.9;
    rx[IDX_HUESO.rodillaDerGroup] = Math.max(0, c) * 0.9;

    for (let i = 0; i < HUESOS.length; i++) {
        const [px, py, pz] = HUESOS[i].pos;
        _loc.makeTranslation(px, py, pz).multiply(_rot.makeRotationX(rx[i]));
        if (PADRE_HUESO[i] >= 0) out[i].multiplyMatrices(out[PADRE_HUESO[i]], _loc);
        else out[i].copy(_loc);
    }
    return out;
}


// --- API de caché y precálculo ----------------------------------------------

/** Clave de caché de una paleta (la misma que usan geometriaSkin y geometriasRigidas). */
export function claveHumanoide(colores) {
    return JSON.stringify(paletaCompleta(colores));
}

/** Geometría con esqueleto (una sola malla) de la paleta. Cacheada. */
export function construirMuneco(colores) {
    return geometriaSkin(paletaCompleta(colores));
}

/**
 * Construye (y cachea) skin y rígidas de una paleta. Pensado para el worker de
 * precálculo: devuelve geometrías listas para serializarHumanoide.
 */
export function calcularHumanoide(colores) {
    return { skin: construirMuneco(colores), rigidas: geometriasRigidas(colores) };
}

/**
 * Siembra la caché con geometrías ya construidas (p. ej. llegadas de un worker).
 * No pisa lo que ya estuviera cacheado.
 * @param {object} colores
 * @param {{skin: THREE.BufferGeometry, rigidas: THREE.BufferGeometry[]}} geos
 */
export function sembrarHumanoide(colores, { skin, rigidas }) {
    const clave = claveHumanoide(colores);
    if (skin && !cacheSkin.has(clave)) cacheSkin.set(clave, skin);
    if (rigidas && !cacheRigida.has(clave)) cacheRigida.set(clave, rigidas);
}
