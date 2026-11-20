// especies.js - Las trece especies de árbol como ESPECIFICACIÓN pura: no importa
// three.js ni el DOM. Cada especie describe sus piezas (cajas, cilindros, esferas,
// elipsoides, con color, acabado y transformación) y `especificar.js` las junta por
// acabado. El adaptador `three/` las convierte en geometrías.
//
// Convenciones del modelo (el juego las da por ciertas):
//   * La base del tronco está en y = 0.
//   * El eje del tronco pasa por x = z = 0 (centro del parterre).
//   * Todo lo que baja al suelo (fuste y raíces) queda dentro del radio de tronco
//     presupuestado por la especie; las ramas y la copa sí pueden asomarse.
//
// Las unidades son bloques (el jugador mide 4 y una casa 12).

import { Vec3 } from './vec.js';
import { ConstructorPiezas } from './constructor.js';
import { rngSemilla } from './rng.js';

// --- acabados ---------------------------------------------------------------
const CORTEZA = 0;  // madera: fuste, ramas, raíces
const HOJA = 1;     // follaje
const FLOR = 2;     // flores y frutos

// --- paleta -----------------------------------------------------------------
// cortezas
const CORT_PLATANO = 0xa9a697;
const CORT_PLATANO_CLARA = 0xc6c3b2;
const CORT_PLATANO_OSC = 0x7d7a6a;
const CORT_ROBLE = 0x594734;
const CORT_ROBLE_OSC = 0x3d3023;
const CORT_FRESNO = 0x6f6555;
const CORT_FRESNO_OSC = 0x4d453a;
const CORT_PINO = 0x6b4328;
const CORT_PINO_OSC = 0x4a2d1b;
const CORT_CIPRES = 0x5c4a36;
const CORT_PALMA = 0x8a7352;
const CORT_PALMA_OSC = 0x6a5739;
const CORT_SAUCE = 0x5a4a38;
const CORT_SAUCE_OSC = 0x3f3326;
const CORT_JACARANDA = 0x7a6f5e;
const CORT_JACARANDA_OSC = 0x554d40;
const CORT_ALAMO = 0x8f8a76;
const CORT_ALAMO_OSC = 0x655f4f;
const CORT_CEIBO = 0x6b503a;
const CORT_CEIBO_OSC = 0x463425;
const CORT_ABEDUL = 0xdedacb;
const CORT_ABEDUL_OSC = 0x2a2824;
const CORT_NARANJO = 0x6d5a42;
const CORT_SECO = 0x7c7263;
const CORT_SECO_OSC = 0x5a5247;

// follajes
const VERDE_MEDIO = 0x3f6b2a;
const VERDE_OSC = 0x2c4c1d;
const VERDE_CLARO = 0x5c8c35;
const VERDE_AMARILLO = 0x74993a;
const VERDE_PINO = 0x24412a;
const VERDE_PINO_CLARO = 0x335c35;
const VERDE_CIPRES = 0x2b4730;
const VERDE_CIPRES_CLARO = 0x3a5c3b;
const VERDE_PALMA = 0x3f7336;
const VERDE_PALMA_OSC = 0x2c5427;
const VERDE_SAUCE = 0x6d9148;
const VERDE_SAUCE_OSC = 0x50713a;
const VERDE_JACARANDA = 0x4d7a36;
const VERDE_ALAMO = 0x6e9442;
const VERDE_ALAMO_OSC = 0x4f7030;
const VERDE_CEIBO = 0x426b2c;
const VERDE_ABEDUL = 0x7aa24a;
const VERDE_ABEDUL_CLARO = 0x95b85e;
const VERDE_NARANJO = 0x2f5a26;
const VERDE_NARANJO_CLARO = 0x3e7230;

// flores y frutos
const LILA = 0x8a76cc;
const LILA_CLARO = 0xa894e0;
const ROJO_CEIBO = 0xc23a2c;
const NARANJA_FRUTA = 0xe08a1c;
const COCO = 0x6b5436;

const V = (x, y, z) => new Vec3(x, y, z);

// ---------------------------------------------------------------------------
// Helpers de construcción
//
// Todos reciben el "contexto" del árbol que se está armando: el
// ConstructorPiezas, el generador pseudoaleatorio de la especie (sembrado fijo,
// así la geometría es siempre la misma y se cachea) y el acumulador del radio
// del tronco.
// ---------------------------------------------------------------------------

/**
 * Alturas (en bloques, una casilla por bloque) para las que se guarda el grosor
 * del tronco. El árbol más alto mide 17, así que con 24 sobra.
 */
const CASILLAS_PERFIL = 24;

function nuevoContexto(semilla) {
    return {
        c: new ConstructorPiezas(3),
        rnd: rngSemilla(semilla),
        radioBase: 0,
        // grosor del tronco bloque a bloque de altura. Es lo que necesita la
        // colisión: el cilindro con el que choca un jugador tiene que tener el
        // radio del tronco A LA ALTURA DEL CUERPO, no el del árbol entero (en
        // una palmera, que se va de vertical allá arriba, no es lo mismo).
        perfil: new Float64Array(CASILLAS_PERFIL)
    };
}

/** Anota que una pieza del tronco llega a `r` bloques alrededor de `p`. */
function anotarBase(ctx, p, r) {
    const d = Math.sqrt(p.x * p.x + p.z * p.z) + r;
    if (d > ctx.radioBase) ctx.radioBase = d;
    const casilla = Math.floor(p.y);
    if (casilla >= 0 && casilla < CASILLAS_PERFIL && d > ctx.perfil[casilla]) {
        ctx.perfil[casilla] = d;
    }
}

/**
 * Anota un tramo de tronco entero (de `a` a `b`), rellenando todas las alturas
 * que cruza. Hace falta porque un tramo de tronco mide dos o tres bloques: si
 * sólo se anotaran sus dos extremos, las alturas del medio quedarían en cero y
 * el cilindro de colisión saldría más fino que el tronco.
 */
function anotarTramoTronco(ctx, a, b, rA, rB) {
    const r = Math.max(rA, rB);
    anotarBase(ctx, a, rA);
    anotarBase(ctx, b, rB);
    const d = Math.max(Math.sqrt(a.x * a.x + a.z * a.z), Math.sqrt(b.x * b.x + b.z * b.z)) + r;
    const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y)));
    const y1 = Math.min(CASILLAS_PERFIL - 1, Math.floor(Math.max(a.y, b.y)));
    for (let y = y0; y <= y1; y++) {
        if (d > ctx.perfil[y]) ctx.perfil[y] = d;
    }
}

/**
 * Fuste: el tronco propiamente dicho, en varios tramos que se van afinando.
 *
 * @param {object} op
 *   alto, rBase, rTope   geometría básica
 *   tramos               en cuántos cilindros se parte (más = curva más suave)
 *   inclina, rumbo       cuánto se va de vertical la punta, y hacia dónde
 *   curva                exponente de la inclinación: 2 deja la base vertical
 *   afina                exponente del adelgazamiento (>1 = se afina arriba)
 *   serpentea            amplitud del vaivén lateral que le quita el aire de poste
 *   color                color, o lista de colores que se alternan por tramo
 * @returns {{puntos: Vec3[], radios: number[]}} el eje de la base a
 *   la punta y el radio en cada nodo. Los dos hacen falta para colgarle cosas
 *   al tronco (anillos, cicatrices, lenticelas) EN el tronco: si se calculan
 *   aparte quedan desplazados en cuanto el fuste tiene inclinación o vaivén.
 */
function fuste(ctx, op) {
    const { c, rnd } = ctx;
    const tramos = op.tramos || 4;
    const rumbo = op.rumbo || 0;
    const inclina = op.inclina || 0;
    const expCurva = op.curva == null ? 2 : op.curva;
    const expAfina = op.afina || 1;
    const colores = Array.isArray(op.color) ? op.color : [op.color];
    const dirX = Math.sin(rumbo), dirZ = Math.cos(rumbo);

    const puntos = [];
    const radios = [];
    for (let i = 0; i <= tramos; i++) {
        const t = i / tramos;
        const k = Math.pow(t, expCurva);
        // el vaivén se anula en los dos extremos, así que la base sigue
        // centrada en el parterre y la punta donde la pide `inclina`.
        const vaiven = op.serpentea ? Math.sin(Math.PI * t) * op.serpentea : 0;
        puntos.push(V(
            dirX * inclina * k + (rnd() - 0.5) * 2 * vaiven,
            op.alto * t,
            dirZ * inclina * k + (rnd() - 0.5) * 2 * vaiven
        ));
        radios.push(op.rBase + (op.rTope - op.rBase) * Math.pow(t, expAfina));
    }

    for (let i = 0; i < tramos; i++) {
        c.tramo([radios[i + 1], radios[i]], puntos[i], puntos[i + 1],
            colores[i % colores.length], CORTEZA, op.segmentos || 7);
        anotarTramoTronco(ctx, puntos[i], puntos[i + 1], radios[i], radios[i + 1]);
    }
    return { puntos, radios };
}

/** Punto medio de dos nodos del eje, y el radio del fuste ahí. */
function entreNodos(eje, i) {
    const a = eje.puntos[i], b = eje.puntos[i + 1];
    return {
        p: V((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2),
        r: (eje.radios[i] + eje.radios[i + 1]) / 2
    };
}

/**
 * Ensanchamiento de la base: las raíces que salen al ras y le dan asiento al
 * árbol. Son lo que más come del presupuesto del parterre, así que `largo`
 * nunca se multiplica por más de 1.
 */
function raices(ctx, op) {
    const { c, rnd } = ctx;
    const cantidad = op.cantidad || 5;
    const alto = op.alto || 0.7;
    const giro = rnd() * Math.PI * 2;
    for (let i = 0; i < cantidad; i++) {
        const a = giro + (i / cantidad) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
        const largo = op.largo * (0.75 + rnd() * 0.25);
        const dx = Math.cos(a), dz = Math.sin(a);
        const rPunta = op.rBase * 0.16;
        const arriba = V(dx * op.rBase * 0.45, alto * (0.7 + rnd() * 0.5), dz * op.rBase * 0.45);
        const abajo = V(dx * (op.rBase + largo), 0.03, dz * (op.rBase + largo));
        c.tramo([rPunta, op.rBase * 0.5], arriba, abajo, op.color, CORTEZA, 5);
        anotarTramoTronco(ctx, arriba, abajo, op.rBase * 0.5, rPunta);
    }
}

/**
 * Rama que sale de un punto del tronco hacia afuera, en tramos cada vez más
 * finos. `combadura` curva el recorrido: positiva lo levanta (roble), negativa
 * lo deja caer (sauce, abedul).
 *
 * @returns {{punta: Vec3, radio: number, puntos: Vec3[]}}
 */
function rama(ctx, desde, op) {
    const { c, rnd } = ctx;
    const tramos = op.tramos || 2;
    const dx = Math.sin(op.rumbo), dz = Math.cos(op.rumbo);
    let p = desde.clone();
    let r = op.radio;
    const puntos = [p];
    for (let i = 0; i < tramos; i++) {
        const t = (i + 1) / tramos;
        const elev = op.elevacion + (op.combadura || 0) * t;
        const paso = (op.largo / tramos) * (0.85 + rnd() * 0.3);
        const horiz = Math.cos(elev) * paso;
        const sig = V(p.x + dx * horiz, p.y + Math.sin(elev) * paso, p.z + dz * horiz);
        const rSig = r * (0.55 + rnd() * 0.17);
        c.tramo([rSig, r], p, sig, op.color, CORTEZA, i === 0 ? 6 : 5);
        p = sig;
        r = rSig;
        puntos.push(p);
    }
    return { punta: p, radio: r, puntos };
}

/**
 * Mata de follaje: una masa principal y unas cuantas más chicas pegadas
 * alrededor, en dos o tres tonos. Es lo que diferencia una copa de un globo.
 */
function mata(ctx, centro, radio, op) {
    const { c, rnd } = ctx;
    const colores = op.colores;
    const achata = op.achata == null ? 1 : op.achata;
    const slot = op.slot == null ? HOJA : op.slot;
    const seg = op.segmentos || 6;
    c.elipsoide([radio, radio * achata, radio], [centro.x, centro.y, centro.z],
        colores[0], slot, seg);
    // las masas satélite van con un lado menos: son las que se repiten y a la
    // distancia a la que se ve un árbol nadie les cuenta las caras.
    const segChico = Math.max(5, seg - 1);
    const bolas = op.bolas == null ? 2 : op.bolas;
    for (let i = 0; i < bolas; i++) {
        const a = rnd() * Math.PI * 2;
        const d = radio * (0.45 + rnd() * 0.4);
        const rr = radio * (0.42 + rnd() * 0.28);
        c.elipsoide([rr, rr * achata, rr], [
            centro.x + Math.cos(a) * d,
            centro.y + (rnd() - 0.45) * radio * achata * 0.7,
            centro.z + Math.sin(a) * d
        ], colores[colores.length > 1 ? 1 + (i % (colores.length - 1)) : 0], slot, segChico);
    }
}

/** Cono de follaje apoyado en `y`, centrado en el eje: las capas del pino. */
function cono(ctx, y, radio, alto, color, segmentos = 8) {
    ctx.c.cilindro([0, radio], alto, [0, y + alto / 2, 0], color, HOJA, null, segmentos);
}

/**
 * Caja con su eje largo apuntando de `a` a `b`: hojas de palmera, cortinas del
 * sauce, lenticelas del abedul. Mucho más barata que una esfera y, a la
 * distancia a la que se ven los árboles, se lee igual.
 */
function laja(ctx, ancho, grosor, a, b, color, slot = HOJA) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const largo = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (largo < 1e-6) return;
    const p = Math.acos(Math.max(-1, Math.min(1, dy / largo)));
    const g = Math.atan2(dx, dz);
    ctx.c.caja([ancho, largo, grosor],
        [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], color, slot, [p, g, 0]);
}

/** Salpica flores o frutos sobre la cáscara de una copa ya construida. */
function adornos(ctx, centros, radios, { cantidad, radio, colores, slot = FLOR }) {
    const { c, rnd } = ctx;
    for (let i = 0; i < cantidad; i++) {
        const k = i % centros.length;
        const centro = centros[k];
        const r = radios[k] * (0.8 + rnd() * 0.25);
        // punto cualquiera de la esfera de la mata
        const u = rnd() * 2 - 1;
        const a = rnd() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        c.esfera(radio * (0.75 + rnd() * 0.5), [
            centro.x + s * Math.cos(a) * r,
            centro.y + u * r * 0.8,
            centro.z + s * Math.sin(a) * r
        ], colores[i % colores.length], slot, 4);
    }
}

// ---------------------------------------------------------------------------
// Plátano de sombra: el árbol de vereda clásico. Corteza clara manchada,
// tronco recto y copa alta, ancha y aplastada.
// ---------------------------------------------------------------------------
function platano(ctx) {
    const eje = fuste(ctx, {
        alto: 12, rBase: 0.40, rTope: 0.17, tramos: 5,
        inclina: 0.12, serpentea: 0.05, afina: 0.85,
        color: [CORT_PLATANO, CORT_PLATANO_CLARA, CORT_PLATANO, CORT_PLATANO_OSC, CORT_PLATANO_CLARA]
    });
    raices(ctx, { rBase: 0.40, largo: 0.20, cantidad: 5, color: CORT_PLATANO_OSC });

    // las manchas de corteza vieja: anillos cortos de otro tono, calzados
    // sobre el eje real del fuste
    for (let i = 0; i < 4; i++) {
        const { p, r } = entreNodos(eje, i);
        ctx.c.cilindro(r * 1.05, 0.5 + ctx.rnd() * 0.6, [p.x, p.y, p.z],
            i % 2 ? CORT_PLATANO_OSC : CORT_PLATANO_CLARA, CORTEZA, null, 7);
        anotarBase(ctx, p, r * 1.05);
    }

    const copas = [];
    const radiosCopa = [];
    // tres ramas madre a media altura y tres más arriba, alternadas
    for (let i = 0; i < 6; i++) {
        const desde = eje.puntos[i < 3 ? 3 : 4];
        const { punta } = rama(ctx, desde, {
            rumbo: (i / 3) * Math.PI + (i < 3 ? 0 : Math.PI / 3),
            elevacion: i < 3 ? 0.72 : 0.95,
            largo: i < 3 ? 2.4 : 1.9,
            radio: i < 3 ? 0.15 : 0.12,
            tramos: 2, combadura: 0.2, color: CORT_PLATANO_OSC
        });
        copas.push(punta);
        radiosCopa.push(i < 3 ? 1.75 : 1.5);
    }
    // y la masa central que cierra la cúpula
    copas.push(V(eje.puntos[5].x, 11.4, eje.puntos[5].z));
    radiosCopa.push(1.95);

    for (let i = 0; i < copas.length; i++) {
        mata(ctx, copas[i], radiosCopa[i], {
            colores: [VERDE_MEDIO, VERDE_CLARO, VERDE_OSC], achata: 0.78, bolas: 2
        });
    }
}

// ---------------------------------------------------------------------------
// Roble: bajo, grueso y retorcido, más ancho que alto.
// ---------------------------------------------------------------------------
function roble(ctx) {
    const eje = fuste(ctx, {
        alto: 9.5, rBase: 0.45, rTope: 0.25, tramos: 4,
        inclina: 0.18, serpentea: 0.10, afina: 1.1,
        color: [CORT_ROBLE, CORT_ROBLE_OSC]
    });
    raices(ctx, { rBase: 0.45, largo: 0.24, cantidad: 6, alto: 0.85, color: CORT_ROBLE_OSC });

    const copas = [];
    const radiosCopa = [];
    for (let i = 0; i < 5; i++) {
        const desde = eje.puntos[i < 3 ? 2 : 3];
        const { punta, puntos } = rama(ctx, desde, {
            rumbo: (i / 5) * Math.PI * 2 + 0.3,
            elevacion: 0.38 + ctx.rnd() * 0.3,
            largo: i < 3 ? 2.9 : 2.3,
            radio: 0.19, tramos: 3, combadura: 0.28, color: CORT_ROBLE
        });
        copas.push(punta);
        radiosCopa.push(1.85 + ctx.rnd() * 0.35);
        // una ramita secundaria a mitad de camino, que es lo que hace que un
        // roble se vea nudoso y no como un paraguas
        if (i % 2 === 0) {
            const { punta: p2 } = rama(ctx, puntos[1], {
                rumbo: (i / 5) * Math.PI * 2 + 1.5,
                elevacion: 0.6, largo: 1.4, radio: 0.1, tramos: 2, color: CORT_ROBLE_OSC
            });
            copas.push(p2);
            radiosCopa.push(1.25);
        }
    }
    copas.push(V(eje.puntos[4].x, 9.3, eje.puntos[4].z));
    radiosCopa.push(1.7);

    for (let i = 0; i < copas.length; i++) {
        mata(ctx, copas[i], radiosCopa[i], {
            colores: [VERDE_OSC, VERDE_MEDIO, VERDE_AMARILLO], achata: 0.88,
            bolas: radiosCopa[i] > 1.5 ? 2 : 1
        });
    }
}

// ---------------------------------------------------------------------------
// Fresno: tronco recto, ramificación opuesta (las ramas salen de a pares) y
// copa ovalada. Es el otro árbol de vereda de siempre.
// ---------------------------------------------------------------------------
function fresno(ctx) {
    const eje = fuste(ctx, {
        alto: 11, rBase: 0.38, rTope: 0.15, tramos: 5,
        inclina: 0.08, serpentea: 0.04,
        color: [CORT_FRESNO, CORT_FRESNO_OSC]
    });
    raices(ctx, { rBase: 0.38, largo: 0.20, cantidad: 5, color: CORT_FRESNO_OSC });

    const copas = [];
    const radiosCopa = [];
    for (let par = 0; par < 3; par++) {
        const desde = eje.puntos[2 + par];
        const base = par * 1.05;
        for (const lado of [0, Math.PI]) {
            const { punta } = rama(ctx, desde, {
                rumbo: base + lado,
                elevacion: 0.8 - par * 0.1,
                largo: 2.1 - par * 0.25,
                radio: 0.14 - par * 0.02,
                tramos: 2, combadura: 0.15, color: CORT_FRESNO_OSC
            });
            copas.push(punta);
            radiosCopa.push(1.5 - par * 0.1);
        }
    }
    copas.push(V(eje.puntos[5].x, 10.6, eje.puntos[5].z));
    radiosCopa.push(1.55);

    for (let i = 0; i < copas.length; i++) {
        mata(ctx, copas[i], radiosCopa[i], {
            colores: [VERDE_MEDIO, VERDE_AMARILLO, VERDE_OSC], achata: 0.95, bolas: 2
        });
    }
}

// ---------------------------------------------------------------------------
// Pino: fuste recto que se ve de abajo a arriba y capas de aguja en cono.
// Es la especie más barata de todas: los conos son casi gratis.
// ---------------------------------------------------------------------------
function pino(ctx) {
    fuste(ctx, {
        alto: 14, rBase: 0.33, rTope: 0.08, tramos: 5, inclina: 0.05,
        color: [CORT_PINO, CORT_PINO_OSC]
    });
    raices(ctx, { rBase: 0.33, largo: 0.16, cantidad: 4, alto: 0.6, color: CORT_PINO_OSC });

    const CAPAS = 6;
    for (let i = 0; i < CAPAS; i++) {
        const t = i / (CAPAS - 1);
        const y = 3.2 + t * 9.4;
        const radio = 2.45 * (1 - t * 0.82);
        const alto = 2.9 * (1 - t * 0.5);
        // los muñones de rama que asoman por debajo de cada verticilo
        const ramas = 4 - Math.floor(t * 2);
        for (let j = 0; j < ramas; j++) {
            const a = ctx.rnd() * Math.PI * 2;
            ctx.c.tramo([0.035, 0.07], V(0, y + 0.15, 0),
                V(Math.sin(a) * radio * 0.95, y - 0.1, Math.cos(a) * radio * 0.95),
                CORT_PINO_OSC, CORTEZA, 4);
        }
        cono(ctx, y, radio, alto, i % 2 ? VERDE_PINO : VERDE_PINO_CLARO, 8);
        // una segunda falda un poco más chica y girada rompe el cono perfecto
        ctx.c.cilindro([0, radio * 0.72], alto * 0.8,
            [(ctx.rnd() - 0.5) * 0.3, y + alto * 0.45, (ctx.rnd() - 0.5) * 0.3],
            i % 2 ? VERDE_PINO_CLARO : VERDE_PINO, HOJA, null, 7);
    }
    // la punta
    cono(ctx, 12.4, 0.5, 2.0, VERDE_PINO_CLARO, 7);
}

// ---------------------------------------------------------------------------
// Ciprés: una columna. Casi no se le ve el tronco.
// ---------------------------------------------------------------------------
function cipres(ctx) {
    fuste(ctx, {
        alto: 13, rBase: 0.26, rTope: 0.07, tramos: 4,
        color: [CORT_CIPRES]
    });
    raices(ctx, { rBase: 0.26, largo: 0.12, cantidad: 4, alto: 0.5, color: CORT_CIPRES });

    const CAPAS = 8;
    for (let i = 0; i < CAPAS; i++) {
        const t = i / (CAPAS - 1);
        const y = 1.4 + t * 11.0;
        // huso: angosto abajo, más ancho a un tercio de altura, en punta arriba
        const ancho = 1.15 * Math.sin(Math.PI * (0.16 + t * 0.78));
        ctx.c.elipsoide([ancho, 1.25, ancho], [
            (ctx.rnd() - 0.5) * 0.22, y, (ctx.rnd() - 0.5) * 0.22
        ], i % 2 ? VERDE_CIPRES : VERDE_CIPRES_CLARO, HOJA, 7);
    }
    ctx.c.elipsoide([0.3, 0.9, 0.3], [0, 12.9, 0], VERDE_CIPRES_CLARO, HOJA, 6);
}

// ---------------------------------------------------------------------------
// Palmera: fuste curvo con las cicatrices de las hojas viejas, corona de
// frondas y un racimo de cocos.
// ---------------------------------------------------------------------------
function palmera(ctx) {
    const eje = fuste(ctx, {
        alto: 12, rBase: 0.32, rTope: 0.19, tramos: 6,
        inclina: 0.42, curva: 2.1, afina: 0.7, segmentos: 8,
        color: [CORT_PALMA, CORT_PALMA_OSC]
    });
    raices(ctx, { rBase: 0.32, largo: 0.14, cantidad: 5, alto: 0.5, color: CORT_PALMA_OSC });

    // cicatrices: los anillos que dejan las hojas viejas al caerse
    for (let i = 0; i < 6; i++) {
        const { p, r } = entreNodos(eje, i);
        ctx.c.cilindro(r * 1.09, 0.18, [p.x, p.y, p.z], CORT_PALMA_OSC, CORTEZA, null, 8);
        anotarBase(ctx, p, r * 1.09);
    }

    const corona = eje.puntos[6];
    const FRONDAS = 7;
    for (let i = 0; i < FRONDAS; i++) {
        const rumbo = (i / FRONDAS) * Math.PI * 2 + 0.2;
        const dx = Math.sin(rumbo), dz = Math.cos(rumbo);
        const largo = 2.9 + ctx.rnd() * 0.7;
        // el raquis se arquea: sale hacia arriba y termina cayendo
        const nodos = [corona.clone()];
        let elev = 0.55 + ctx.rnd() * 0.25;
        for (let k = 0; k < 3; k++) {
            const prev = nodos[k];
            const paso = largo / 3;
            nodos.push(V(prev.x + dx * Math.cos(elev) * paso,
                prev.y + Math.sin(elev) * paso,
                prev.z + dz * Math.cos(elev) * paso));
            elev -= 0.62;
        }
        for (let k = 0; k < 3; k++) {
            ctx.c.tramo([0.045 - k * 0.012, 0.075 - k * 0.012], nodos[k], nodos[k + 1],
                CORT_PALMA_OSC, CORTEZA, 4);
        }
        // las pinnas: dos pares de láminas a cada lado del raquis
        const lateral = V(dz, 0, -dx);
        for (let k = 1; k <= 2; k++) {
            const centro = nodos[k];
            const siguiente = nodos[k + 1];
            const ancho = 0.95 - k * 0.2;
            for (const s of [-1, 1]) {
                laja(ctx, 1.5, 0.05, centro, V(
                    centro.x + lateral.x * ancho * s + (siguiente.x - centro.x) * 0.7,
                    centro.y + (siguiente.y - centro.y) * 0.7 - 0.35,
                    centro.z + lateral.z * ancho * s + (siguiente.z - centro.z) * 0.7
                ), k === 1 ? VERDE_PALMA : VERDE_PALMA_OSC);
            }
        }
    }
    // el cogollo central y los cocos
    ctx.c.elipsoide([0.42, 0.5, 0.42], [corona.x, corona.y + 0.2, corona.z],
        VERDE_PALMA_OSC, HOJA, 6);
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.c.esfera(0.19, [corona.x + Math.cos(a) * 0.38, corona.y - 0.3,
            corona.z + Math.sin(a) * 0.38], COCO, FLOR, 6);
    }
}

// ---------------------------------------------------------------------------
// Sauce llorón: tronco corto y grueso, ramas que se van para arriba y cortinas
// de follaje colgando hasta casi el suelo.
// ---------------------------------------------------------------------------
function sauce(ctx) {
    const eje = fuste(ctx, {
        alto: 9, rBase: 0.42, rTope: 0.22, tramos: 4,
        inclina: 0.15, serpentea: 0.08,
        color: [CORT_SAUCE, CORT_SAUCE_OSC]
    });
    raices(ctx, { rBase: 0.42, largo: 0.22, cantidad: 6, alto: 0.8, color: CORT_SAUCE_OSC });

    for (let i = 0; i < 6; i++) {
        const rumbo = (i / 6) * Math.PI * 2 + 0.4;
        const { punta } = rama(ctx, eje.puntos[i % 2 ? 3 : 2], {
            rumbo, elevacion: 0.75, largo: 2.6, radio: 0.15,
            tramos: 3, combadura: -0.55, color: CORT_SAUCE
        });

        mata(ctx, punta, 1.25, {
            colores: [VERDE_SAUCE, VERDE_SAUCE_OSC], achata: 0.6, bolas: 1
        });

        // las cortinas: tiras que cuelgan de la punta de cada rama
        for (let k = 0; k < 4; k++) {
            const a = rumbo + (ctx.rnd() - 0.5) * 1.1;
            const d = 0.5 + ctx.rnd() * 1.0;
            const desde = V(punta.x + Math.sin(a) * d, punta.y - 0.2, punta.z + Math.cos(a) * d);
            const caida = 2.8 + ctx.rnd() * 1.6;
            laja(ctx, 0.6, 0.07, desde,
                V(desde.x + Math.sin(a) * 0.5, desde.y - caida, desde.z + Math.cos(a) * 0.5),
                k % 2 ? VERDE_SAUCE : VERDE_SAUCE_OSC);
        }
    }
    mata(ctx, V(eje.puntos[4].x, 9.0, eje.puntos[4].z), 1.5, {
        colores: [VERDE_SAUCE, VERDE_SAUCE_OSC], achata: 0.65, bolas: 2
    });
}

// ---------------------------------------------------------------------------
// Jacarandá: copa abierta y poco densa, y las flores lilas que son su marca.
// ---------------------------------------------------------------------------
function jacaranda(ctx) {
    const eje = fuste(ctx, {
        alto: 11, rBase: 0.34, rTope: 0.14, tramos: 5,
        inclina: 0.20, serpentea: 0.06,
        color: [CORT_JACARANDA, CORT_JACARANDA_OSC]
    });
    raices(ctx, { rBase: 0.34, largo: 0.20, cantidad: 5, color: CORT_JACARANDA_OSC });

    const copas = [];
    const radiosCopa = [];
    for (let i = 0; i < 5; i++) {
        const { punta, puntos } = rama(ctx, eje.puntos[2 + (i % 3)], {
            rumbo: (i / 5) * Math.PI * 2 + 0.9,
            elevacion: 0.62 + ctx.rnd() * 0.25,
            largo: 2.6, radio: 0.13, tramos: 3, combadura: 0.18,
            color: CORT_JACARANDA_OSC
        });
        copas.push(punta);
        radiosCopa.push(1.45);
        if (i % 2) {
            const { punta: p2 } = rama(ctx, puntos[2], {
                rumbo: (i / 5) * Math.PI * 2 + 2.2,
                elevacion: 0.5, largo: 1.3, radio: 0.07, tramos: 1,
                color: CORT_JACARANDA_OSC
            });
            copas.push(p2);
            radiosCopa.push(1.1);
        }
    }
    copas.push(V(eje.puntos[5].x, 10.7, eje.puntos[5].z));
    radiosCopa.push(1.5);

    for (let i = 0; i < copas.length; i++) {
        mata(ctx, copas[i], radiosCopa[i], {
            colores: [VERDE_JACARANDA, VERDE_CLARO], achata: 0.72, bolas: 1
        });
    }
    adornos(ctx, copas, radiosCopa, {
        cantidad: 14, radio: 0.3, colores: [LILA, LILA_CLARO]
    });
}

// ---------------------------------------------------------------------------
// Álamo: altísimo y angosto, de los que se plantan en fila. La copa es una
// columna de follaje pegada al tronco.
// ---------------------------------------------------------------------------
function alamo(ctx) {
    const eje = fuste(ctx, {
        alto: 16, rBase: 0.30, rTope: 0.07, tramos: 6, inclina: 0.1,
        color: [CORT_ALAMO, CORT_ALAMO_OSC]
    });
    raices(ctx, { rBase: 0.30, largo: 0.16, cantidad: 4, alto: 0.6, color: CORT_ALAMO_OSC });

    // ramas casi verticales, pegadas al fuste
    for (let i = 0; i < 9; i++) {
        const t = i / 8;
        rama(ctx, eje.puntos[Math.max(1, Math.round(1.4 + t * 4.2))], {
            rumbo: i * 2.4,
            elevacion: 1.18 - t * 0.12,
            largo: 1.9 - t * 0.6, radio: 0.09, tramos: 2,
            color: CORT_ALAMO_OSC
        });
    }

    const CAPAS = 8;
    for (let i = 0; i < CAPAS; i++) {
        const t = i / (CAPAS - 1);
        const y = 4.0 + t * 11.2;
        const ancho = 1.5 * Math.sin(Math.PI * (0.22 + t * 0.72));
        ctx.c.elipsoide([ancho, 1.45, ancho], [
            eje.puntos[5].x * t + (ctx.rnd() - 0.5) * 0.35, y,
            eje.puntos[5].z * t + (ctx.rnd() - 0.5) * 0.35
        ], i % 2 ? VERDE_ALAMO : VERDE_ALAMO_OSC, HOJA, 6);
    }
}

// ---------------------------------------------------------------------------
// Ceibo: tronco torcido, copa desprolija y las flores rojas.
// ---------------------------------------------------------------------------
function ceibo(ctx) {
    const eje = fuste(ctx, {
        alto: 8, rBase: 0.44, rTope: 0.20, tramos: 4,
        inclina: 0.34, serpentea: 0.13, curva: 1.5,
        color: [CORT_CEIBO, CORT_CEIBO_OSC]
    });
    raices(ctx, { rBase: 0.44, largo: 0.24, cantidad: 6, alto: 0.9, color: CORT_CEIBO_OSC });

    const copas = [];
    const radiosCopa = [];
    for (let i = 0; i < 4; i++) {
        const { punta, puntos } = rama(ctx, eje.puntos[2 + (i % 2)], {
            rumbo: (i / 4) * Math.PI * 2 + 0.6,
            elevacion: 0.2 + ctx.rnd() * 0.4,
            largo: 3.0, radio: 0.2, tramos: 3, combadura: 0.3,
            color: CORT_CEIBO
        });
        copas.push(punta);
        radiosCopa.push(1.35 + ctx.rnd() * 0.5);
        const { punta: p2 } = rama(ctx, puntos[2], {
            rumbo: (i / 4) * Math.PI * 2 - 0.9,
            elevacion: 0.75, largo: 1.5, radio: 0.09, tramos: 2,
            color: CORT_CEIBO_OSC
        });
        copas.push(p2);
        radiosCopa.push(1.1);
    }
    copas.push(V(eje.puntos[4].x, 8.1, eje.puntos[4].z));
    radiosCopa.push(1.4);

    for (let i = 0; i < copas.length; i++) {
        mata(ctx, copas[i], radiosCopa[i], {
            colores: [VERDE_CEIBO, VERDE_OSC], achata: 0.75, bolas: 1
        });
    }
    adornos(ctx, copas, radiosCopa, {
        cantidad: 12, radio: 0.28, colores: [ROJO_CEIBO]
    });
}

// ---------------------------------------------------------------------------
// Abedul: tronco blanco con las marcas negras, inclinado, y copa liviana de
// ramas finas algo colgantes.
// ---------------------------------------------------------------------------
function abedul(ctx) {
    const eje = fuste(ctx, {
        alto: 12, rBase: 0.26, rTope: 0.09, tramos: 5,
        inclina: 0.30, serpentea: 0.05, curva: 1.7,
        color: [CORT_ABEDUL]
    });
    raices(ctx, { rBase: 0.26, largo: 0.14, cantidad: 4, alto: 0.5, color: CORT_ABEDUL_OSC });

    // lenticelas: las rayas oscuras horizontales del abedul. Son tablillas
    // tangentes al fuste, hundidas de modo que sólo asome la cara externa.
    for (let i = 0; i < 12; i++) {
        const nodo = i % 4;                       // sólo en los cuatro tramos de abajo
        const { p, r } = entreNodos(eje, nodo);
        const a = ctx.rnd() * Math.PI * 2;
        const y = p.y + (ctx.rnd() - 0.5) * 1.6;
        // una caja con el lado largo en X, girada para quedar tangente al
        // tronco en el ángulo `a`
        ctx.c.caja([r * 0.85, 0.05, r * 0.3],
            [p.x + Math.cos(a) * r * 0.9, y, p.z + Math.sin(a) * r * 0.9],
            CORT_ABEDUL_OSC, CORTEZA, [0, -(a + Math.PI / 2), 0]);
        anotarBase(ctx, p, r * 1.15);
    }

    const copas = [];
    const radiosCopa = [];
    for (let i = 0; i < 7; i++) {
        const { punta } = rama(ctx, eje.puntos[2 + (i % 3)], {
            rumbo: (i / 7) * Math.PI * 2 + 0.25,
            elevacion: 0.72,
            largo: 2.0, radio: 0.085, tramos: 2, combadura: -0.45,
            color: CORT_ABEDUL_OSC
        });
        copas.push(punta);
        radiosCopa.push(1.15);
    }
    copas.push(V(eje.puntos[5].x, 11.6, eje.puntos[5].z));
    radiosCopa.push(1.3);

    for (let i = 0; i < copas.length; i++) {
        mata(ctx, copas[i], radiosCopa[i], {
            colores: [VERDE_ABEDUL, VERDE_ABEDUL_CLARO], achata: 0.8, bolas: 2
        });
    }
}

// ---------------------------------------------------------------------------
// Naranjo: chico, copa redonda y muy densa, y las naranjas.
// ---------------------------------------------------------------------------
function naranjo(ctx) {
    const eje = fuste(ctx, {
        alto: 5.5, rBase: 0.26, rTope: 0.16, tramos: 3,
        inclina: 0.1, serpentea: 0.05,
        color: [CORT_NARANJO]
    });
    raices(ctx, { rBase: 0.26, largo: 0.16, cantidad: 4, alto: 0.5, color: CORT_NARANJO });

    const copas = [];
    const radiosCopa = [];
    for (let i = 0; i < 4; i++) {
        const { punta } = rama(ctx, eje.puntos[1 + (i % 2)], {
            rumbo: (i / 4) * Math.PI * 2 + 0.5,
            elevacion: 0.6, largo: 1.2, radio: 0.1, tramos: 2,
            combadura: 0.2, color: CORT_NARANJO
        });
        copas.push(punta);
        radiosCopa.push(1.15);
    }
    copas.push(V(eje.puntos[3].x, 5.2, eje.puntos[3].z));
    radiosCopa.push(1.65);

    for (let i = 0; i < copas.length; i++) {
        mata(ctx, copas[i], radiosCopa[i], {
            colores: [VERDE_NARANJO, VERDE_NARANJO_CLARO], achata: 0.95, bolas: 3
        });
    }
    adornos(ctx, copas, radiosCopa, {
        cantidad: 10, radio: 0.19, colores: [NARANJA_FRUTA]
    });
}

// ---------------------------------------------------------------------------
// Árbol seco: sin una hoja, todo rama. Es el que le da carácter a una esquina
// y el más barato de dibujar después del pino.
// ---------------------------------------------------------------------------
function seco(ctx) {
    const eje = fuste(ctx, {
        alto: 10, rBase: 0.38, rTope: 0.12, tramos: 5,
        inclina: 0.24, serpentea: 0.11, curva: 1.6,
        color: [CORT_SECO, CORT_SECO_OSC]
    });
    raices(ctx, { rBase: 0.38, largo: 0.22, cantidad: 5, alto: 0.8, color: CORT_SECO_OSC });

    for (let i = 0; i < 4; i++) {
        const rumbo = (i / 4) * Math.PI * 2 + 0.7;
        const { puntos } = rama(ctx, eje.puntos[2 + (i % 3)], {
            rumbo, elevacion: 0.55 + ctx.rnd() * 0.35,
            largo: 2.6, radio: 0.16, tramos: 2, combadura: 0.25,
            color: CORT_SECO
        });
        // cada rama se bifurca dos veces: es lo único que tiene este árbol,
        // así que la ramificación tiene que verse.
        for (let k = 0; k < 2; k++) {
            const { puntos: sec } = rama(ctx, puntos[1 + k], {
                rumbo: rumbo + (k ? 1.1 : -1.0),
                elevacion: 0.7 + ctx.rnd() * 0.4,
                largo: 1.7, radio: 0.085, tramos: 2, combadura: 0.3,
                color: CORT_SECO_OSC
            });
            rama(ctx, sec[1], {
                rumbo: rumbo + (k ? 2.3 : -2.1),
                elevacion: 0.95, largo: 1.0, radio: 0.045, tramos: 1,
                color: CORT_SECO_OSC
            });
        }
    }
    // la punta partida
    rama(ctx, eje.puntos[5], { rumbo: 1.2, elevacion: 1.15, largo: 1.4, radio: 0.09, tramos: 2, color: CORT_SECO });
    rama(ctx, eje.puntos[4], { rumbo: 4.3, elevacion: 0.9, largo: 1.1, radio: 0.07, tramos: 2, color: CORT_SECO_OSC });
}

const CONSTRUCTORES = {
    platano, roble, fresno, pino, cipres, palmera,
    sauce, jacaranda, alamo, ceibo, abedul, naranjo, seco
};

// ---------------------------------------------------------------------------
// Radio de colisión y especificación completa
// ---------------------------------------------------------------------------

/** Altura de un cuerpo apoyado en el suelo, en bloques (por defecto). */
export const ALTO_CUERPO_POR_DEFECTO = 4;

/** Primer bloque de altura que ya es fuste y no raíz. */
const PRIMER_BLOQUE_FUSTE = 1;

/**
 * Mayor radio del perfil del tronco entre `desde` y `alto` bloques de altura.
 *
 * Se mide desde el PRIMER bloque, no desde el suelo: en el bloque de abajo están
 * las raíces, que son casi el doble de gruesas que el fuste. Un cilindro de
 * colisión con el radio de las raíces frenaría al jugador antes de tocar la
 * corteza.
 */
function radioEnFranja(perfil, desde, alto) {
    let r = 0;
    const hasta = Math.min(perfil.length - 1, Math.max(desde, Math.ceil(alto) - 1));
    for (let y = desde; y <= hasta; y++) if (perfil[y] > r) r = perfil[y];
    return r;
}

/** Especies disponibles, en el orden en que las declara el paquete. */
export const ESPECIES = Object.keys(CONSTRUCTORES);

/**
 * Especificación pura de una especie: sus piezas por acabado y las medidas que
 * el juego necesita para presupuestarla. Función pura y determinista: la misma
 * `semilla` produce siempre las mismas primitivas.
 *
 * @param {string} especie  una de `ESPECIES`
 * @param {object} op
 * @param {number} op.semilla      semilla del generador de la especie
 * @param {number} [op.altoCuerpo] altura del cuerpo para medir el radio de colisión
 * @returns {{
 *   especie: string,
 *   partes: {slot: number, primitivas: object[]}[],
 *   radioBase: number,       radio máximo del tronco (incluye raíces)
 *   perfil: Float64Array,    radio del tronco bloque a bloque de altura
 *   radioColision: number    radio real a la altura del cuerpo
 * }}
 */
export function especificarArbol(especie, { semilla, altoCuerpo = ALTO_CUERPO_POR_DEFECTO } = {}) {
    if (!CONSTRUCTORES[especie]) {
        throw new Error(`modelos-arboles: especie desconocida '${especie}' (ver ESPECIES)`);
    }
    const ctx = nuevoContexto(semilla);
    CONSTRUCTORES[especie](ctx);
    return {
        especie,
        partes: ctx.c.primitivasPorSlot(),
        radioBase: ctx.radioBase,
        perfil: ctx.perfil,
        radioColision: radioEnFranja(ctx.perfil, PRIMER_BLOQUE_FUSTE, altoCuerpo)
    };
}
