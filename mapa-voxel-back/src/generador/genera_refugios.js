// genera_refugios.js - Decide los refugios subterráneos del mapa
// (plan_supervivencia.md §13). Corre una sola vez al construir el mapa, con la
// heightMap todavía como arrays y las zonas `parcela` a mano; es puro (sin
// sockets, sin volumen): lo prueba scripts/test_refugios.mjs. Sólo DECIDE y
// describe (qué cajas excavar, dónde van la puerta, la trampilla, la luz y el
// armario); excavar el volumen lo hace `excavarRefugios` (mapType3.js) y el
// estado de puertas y trampillas vive en server/refugios.js.
//
// Geometría y marco local (u, v): ver cliente/refugios_config.js.

import {
    PROB_REFUGIO_PARCELA, MIN_REFUGIOS, INTENTOS_REFUGIO, REFUGIO, PROFUNDIDAD_REFUGIO,
    ejesRefugio, rotYHacia
} from '../plugins/datos.js';
import { ARMARIO } from '../plugins/datos.js';
import { ID_LUZ_INTERIOR } from '../plugins/datos.js';
import { BLOCK_TYPES } from './mapConfig.js';

// Tipos de sala de casa donde se puede abrir la salida si la parcela no tiene patio.
const SALAS_VALIDAS = new Set(['living', 'dormitorio', 'comedor', 'cocina']);

// Ancho de la huella (lateral): paredes en v = -2 y v = 4; el interior de la sala va de -1 a 3.
const V_MIN = -2, V_MAX = 4;
const U_MIN = -6;
// Desvíos (celdas) probados alrededor del centro de la sala de casa, del más cercano al más lejano
// (el centro suele tener el punto de botín: se corre la tapa lo mínimo).
const DESVIOS_CASA = [];
for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) DESVIOS_CASA.push([dx, dz]);
DESVIOS_CASA.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));

/** Datos derivados de la salida: dE (0 patio / 1 casa) manda el largo del tramo en la escalera. */
function perfil(S, dE) {
    const F = S - PROFUNDIDAD_REFUGIO;
    const lidStart = 4 + dE;
    const aUlt = lidStart + REFUGIO.trampillaLargo - 1;
    return { F, lidStart, aUlt, lidLayer: S - 1 + dE };
}

/** Celda mundo (entera) de la celda local (a, b). */
function celda(ref, a, b) {
    const e = ejesRefugio(ref.rot);
    return { x: ref.ox + a * e.uX + b * e.vX, z: ref.oz + a * e.uZ + b * e.vZ };
}

/** Rectángulo mundo [x0,x1) x [z0,z1) que cubren las celdas locales a∈[a0,a1], b∈[b0,b1]. */
function rectLocal(ref, a0, a1, b0, b1) {
    const p = celda(ref, a0, b0), q = celda(ref, a1, b1);
    return { x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x) + 1, z0: Math.min(p.z, q.z), z1: Math.max(p.z, q.z) + 1 };
}

/** Caja de excavación mundo (min inclusive, max exclusive) de celdas locales + capas. */
function cajaExcavar(ref, a0, a1, b0, b1, y0, y1) {
    const r = rectLocal(ref, a0, a1, b0, b1);
    return { x0: r.x0, y0, z0: r.z0, x1: r.x1, y1: y1 + 1, z1: r.z1 };
}

const solapa = (r, s) => r.x0 < s.x1 && s.x0 < r.x1 && r.z0 < s.z1 && s.z0 < r.z1;
const expandir = (r, m) => ({ x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m });
const dentro = (r, p) => r.x0 <= p.x0 && r.z0 <= p.z0 && r.x1 >= p.x1 && r.z1 >= p.z1;
const rotDeFrente = (uX, uZ) => (uZ === 1 ? 0 : uX === 1 ? 1 : uZ === -1 ? 2 : 3);

/**
 * Arma el refugio completo (sin validar contra el mapa).
 * `ref` = { ox, oz, rot, S, dE }.
 */
export function disenarRefugio(ref) {
    const e = ejesRefugio(ref.rot);
    const { F, lidStart, aUlt, lidLayer } = perfil(ref.S, ref.dE);
    const S = ref.S;
    const R = REFUGIO;
    const pt = (u, v) => ({ x: ref.ox + 0.5 + u * e.uX + v * e.vX, z: ref.oz + 0.5 + u * e.uZ + v * e.vZ });

    // --- excavación -------------------------------------------------------
    const excavar = [];
    excavar.push(cajaExcavar(ref, -5, -1, -1, 3, F, F + R.altoSala - 1));          // sala
    excavar.push(cajaExcavar(ref, 0, 0, 0, 1, F, F + R.puertaAlto - 1));           // hueco de la puerta (queda el dintel)
    for (let a = 1; a <= aUlt; a++) {                                              // descanso + escalera + hueco de la trampilla
        const pies = a <= 2 ? F : F + (a - 2);
        // cada celda deja 5 de aire sobre los pies (no 4): al subir un escalón el cuerpo
        // (0.8 de ancho) queda a medias entre dos celdas y necesita la cabeza libre en la de atrás
        const tope = a <= 2 ? F + R.altoSala - 1 : a < lidStart ? pies + R.altoSala - 1 : lidLayer;
        excavar.push(cajaExcavar(ref, a, a, 0, 1, pies, tope));
    }

    // --- acabado: la sala se revoca (paredes de ladrillo, piso y techo) antes de excavar ---
    const acabado = [
        { bloque: 'BRICK', ...cajaExcavar(ref, -6, 0, -2, 4, F, F + R.altoSala - 1) },            // macizo de paredes (se excava el interior)
        { bloque: 'GRAY', ...cajaExcavar(ref, -5, -1, -1, 3, F - 1, F - 1) },                     // piso de la sala
        { bloque: 'GRAY', ...cajaExcavar(ref, 0, 2, 0, 1, F - 1, F - 1) },                        // piso de la puerta y el descanso
        { bloque: 'WHITE', ...cajaExcavar(ref, -5, -1, -1, 3, F + R.altoSala, F + R.altoSala) }  // techo
    ];

    // --- puerta -----------------------------------------------------------
    const bisagraP = pt(0, -0.5);
    const centroP = pt(0, 0.5);
    const puerta = {
        tipo: 'puerta', y: F,
        x: bisagraP.x, z: bisagraP.z,                       // bisagra
        rotY: rotYHacia(e.vX, e.vZ),                        // cerrada: la hoja se extiende a lo largo de v
        rotYAbierta: rotYHacia(-e.uX, -e.uZ),               // abierta (hacia la sala): paralela a -u
        abre: R.abre, largo: R.puertaAncho, alto: R.puertaAlto,
        caja: { x: centroP.x, z: centroP.z, hl: R.puertaAncho / 2, hw: 0.5, rotY: rotYHacia(e.vX, e.vZ), y0: F, y1: F + R.puertaAlto }
    };

    // --- trampilla --------------------------------------------------------
    const bisagraT = pt(lidStart - 0.5, 0.5);
    const centroT = pt(lidStart - 0.5 + R.trampillaLargo / 2, 0.5);
    const trampilla = {
        tipo: 'trampilla', y: lidLayer + 1,
        x: bisagraT.x, z: bisagraT.z,                       // bisagra: el extremo bajo del hueco
        rotY: rotYHacia(e.uX, e.uZ), abre: 'arriba',
        largo: R.trampillaLargo, ancho: R.trampillaAncho, alto: 1,
        caja: { x: centroT.x, z: centroT.z, hl: R.trampillaLargo / 2, hw: R.trampillaAncho / 2, rotY: rotYHacia(e.uX, e.uZ), y0: lidLayer, y1: lidLayer + 1 }
    };

    // --- interior ---------------------------------------------------------
    const centro = pt(-3, 1);
    // armario contra la pared del fondo (a = -5), ocupando b = 1..2
    const arm = pt(-5, 1.5);
    const armario = {
        x: arm.x, y: F, z: arm.z, rot: rotDeFrente(e.uX, e.uZ), ancho: ARMARIO.ancho, pared: true, contenido: 'vacio'
    };
    const luz = { x: centro.x, y: F + R.altoSala - 1.5, z: centro.z, model: ID_LUZ_INTERIOR };

    // celdas donde se puede aparecer: interior de la sala, lejos del armario (a = -5, -4) y del barrido de la puerta (a = -2, -1)
    const celdasSpawn = [];
    for (let a = -5; a <= -1; a++) {
        for (let b = -1; b <= 3; b++) {
            if (a <= -4 && b >= 0 && b <= 3) continue;      // armario y su frente
            if (a >= -2 && b >= -1 && b <= 1) continue;      // barrido de la hoja (cuarto de círculo de 2x2) y su borde
            const c = pt(a, b);
            celdasSpawn.push({ x: c.x, z: c.z });
        }
    }
    const spawn = { x: centro.x, y: F, z: centro.z };

    const s = rectLocal(ref, -5, -1, -1, 3);
    return {
        ...ref, F, lidStart, aUlt, lidLayer,
        salida: ref.salida || 'patio',
        x: centro.x, y: F, z: centro.z,
        sala: { x0: s.x0, y0: F, z0: s.z0, x1: s.x1, y1: F + R.altoSala, z1: s.z1 },
        puerta, trampilla,
        escalera: { desde: pt(1, 0.5), hasta: pt(aUlt, 0.5), pasos: aUlt - 2, ancho: R.puertaAncho, descanso: R.descanso },
        spawn, celdasSpawn, armario, luz,
        excavar, acabado,
        huella: rectLocal(ref, U_MIN, aUlt, V_MIN, V_MAX),
        zonaSalida: rectLocal(ref, lidStart, aUlt, 0, 1)
    };
}

/**
 * @param zonas lista de zonas del mapa (se usan las de tipo 'parcela')
 * @param ctx { structures, entities, heightMap, surfaceTypeMap, width, depth, nidos, startPosition, rand, diag }
 * @returns [{ id, parcela, ...refugio }]
 */
export function generarRefugios(zonas, ctx) {
    const {
        structures = [], entities = [], heightMap, surfaceTypeMap, width, depth, nidos = [],
        startPosition = null, rand = Math.random, prob = PROB_REFUGIO_PARCELA
    } = ctx;
    const diag = ctx.diag || {};
    const no = (m) => { diag[m] = (diag[m] || 0) + 1; return false; };

    const edificios = structures.filter(s => s && s.width != null && s.depth != null && s.x >= 0 && s.z >= 0 && s.type !== 'spawn');
    const objetos = entities.filter(e => e && (e.type === 'vehiculo' || (e.type === 'entidad_objeto' && e.model !== ID_LUZ_INTERIOR)));
    const alt = (x, z) => { const c = heightMap[x]; const v = c && c[z]; return typeof v === 'number' ? v : null; };
    const R = REFUGIO;

    const parcelas = (zonas || []).filter(z => z.tipo === 'parcela' && z.x0 >= 0 && z.z0 >= 0 && z.x1 <= width && z.z1 <= depth);

    /** ¿El suelo de todo el rectángulo está a la altura S y (opcional) sin calle/vereda/ladrillo? */
    function sueloPlano(r, S, sinCalle) {
        for (let x = r.x0; x < r.x1; x++) {
            for (let z = r.z0; z < r.z1; z++) {
                if (alt(x, z) !== S) return false;
                if (sinCalle) {
                    const t = surfaceTypeMap[x] && surfaceTypeMap[x][z];
                    if (t === BLOCK_TYPES.ASPHALT || t === BLOCK_TYPES.VEREDA || t === BLOCK_TYPES.BRICK) return false;
                }
            }
        }
        return true;
    }

    /** Objetos (árboles, postes, autos) cuyo centro cae dentro de r. */
    const hayObjeto = (r, objs) => objs.some(o => o.x >= r.x0 && o.x <= r.x1 && o.z >= r.z0 && o.z <= r.z1);
    const hayNido = (r) => nidos.some(n => n.x >= r.x0 - n.radio - 1 && n.x <= r.x1 + n.radio + 1 && n.z >= r.z0 - n.radio - 1 && n.z <= r.z1 + n.radio + 1);

    /** Validación común: huella dentro de la parcela, plana, sin nidos ni objetos; fuera del borde del mapa. */
    function huellaValida(d, parcela, locales, S) {
        const h = d.huella;
        const p = { x0: parcela.x0 + R.margenParcela, z0: parcela.z0 + R.margenParcela, x1: parcela.x1 - R.margenParcela, z1: parcela.z1 - R.margenParcela };
        if (!dentro(p, h)) return no('fuera_parcela');
        if (h.x0 < R.margenMapa || h.z0 < R.margenMapa || h.x1 > width - R.margenMapa || h.z1 > depth - R.margenMapa) return no('borde');
        if (!sueloPlano(h, S, false)) return no('desnivel');
        if (hayNido(h)) return no('nido');
        if (hayObjeto(expandir(h, 0.5), locales.objetos)) return no('objeto_huella');
        return true;
    }

    /** Patio: la salida (trampilla + anillo) al aire libre y la huella lejos de cualquier casa. */
    function patioValido(d, parcela, locales) {
        if (!huellaValida(d, parcela, locales, d.S)) return false;
        const hue = expandir(d.huella, 1);
        for (const s of locales.edificios) if (solapa(hue, { x0: s.x, z0: s.z, x1: s.x + s.width, z1: s.z + s.depth })) return no('edificio_huella');
        const anillo = expandir(d.zonaSalida, R.anilloPatio);
        if (!sueloPlano(anillo, d.S, true)) return no('anillo_suelo');
        for (const s of locales.edificios) {
            if (solapa(anillo, expandir({ x0: s.x, z0: s.z, x1: s.x + s.width, z1: s.z + s.depth }, R.margenEdificio))) return no('anillo_edificio');
        }
        if (hayObjeto(expandir(anillo, R.margenObjeto), locales.objetos)) return no('anillo_objeto');
        return true;
    }

    /** Sala de casa: la tapa en el centro libre de una sala de planta baja. */
    function casaValida(d, parcela, locales, sala) {
        if (!huellaValida(d, parcela, locales, d.S)) return false;
        const interior = { x0: sala.x + 1, z0: sala.z + 1, x1: sala.x + sala.width - 1, z1: sala.z + sala.depth - 1 };
        const anillo = expandir(d.zonaSalida, R.anilloCasa);
        if (!dentro(interior, anillo)) return no('casa_anillo_fuera');
        const libre = expandir(anillo, 1);
        for (const a of sala.armarios || []) if (a.x >= libre.x0 - 1 && a.x <= libre.x1 + 1 && a.z >= libre.z0 - 1 && a.z <= libre.z1 + 1) return no('casa_armario');
        const l = sala.lootSpot;
        if (l && l.x >= libre.x0 - 1 && l.x <= libre.x1 + 1 && l.z >= libre.z0 - 1 && l.z <= libre.z1 + 1) return no('casa_botin');
        const k = sala.stairKeepOut;
        if (k && solapa(libre, { x0: k.x0, z0: k.z0, x1: k.x1, z1: k.z1 })) return no('casa_escalera');
        // la huella subterránea no puede cruzar los cimientos de OTRA casa
        const hue = expandir(d.huella, 0);
        for (const s of locales.edificios) {
            if (s === sala) continue;
            if (solapa(hue, { x0: s.x, z0: s.z, x1: s.x + s.width, z1: s.z + s.depth }) && (s.floor || 0) === 0 && !(s.parcelId === sala.parcelId)) return no('casa_cimiento_ajeno');
        }
        return true;
    }

    /** Intenta ubicar un refugio en la parcela. Devuelve el diseño o null. */
    function ubicar(parcela) {
        const locales = {
            edificios: edificios.filter(s => solapa(expandir(parcela, 6), { x0: s.x, z0: s.z, x1: s.x + s.width, z1: s.z + s.depth })),
            objetos: objetos.filter(o => o.x >= parcela.x0 - 6 && o.x <= parcela.x1 + 6 && o.z >= parcela.z0 - 6 && o.z <= parcela.z1 + 6)
        };
        // 1º) patio: sorteo de la salida y del giro
        for (let k = 0; k < (ctx.soloCasa ? 0 : INTENTOS_REFUGIO); k++) {
            const ox = Math.floor(parcela.x0 + rand() * (parcela.x1 - parcela.x0));
            const oz = Math.floor(parcela.z0 + rand() * (parcela.z1 - parcela.z0));
            const S = alt(ox, oz);
            if (S == null) continue;
            const d = disenarRefugio({ ox, oz, rot: Math.floor(rand() * 4), S, dE: 0 });
            if (patioValido(d, parcela, locales)) return d;
        }
        // 2º) sala de planta baja de la casa de la parcela
        const salas = locales.edificios.filter(s => SALAS_VALIDAS.has(s.type) && (s.floor || 0) === 0 &&
            s.x >= parcela.x0 && s.z >= parcela.z0 && s.x + s.width <= parcela.x1 && s.z + s.depth <= parcela.z1)
            .sort((a, b) => b.width * b.depth - a.width * a.depth);
        for (const sala of salas) {
            const S = alt(sala.x + 1, sala.z + 1);
            const dE = S == null ? -1 : sala.y + 1 - S;     // el piso de la casa es la capa superficial (dE = 0) o un bloque más arriba
            if (dE < 0 || dE > 1) continue;
            // la tapa (4 de largo x 2 de ancho) centrada en la sala, con el largo sobre el eje más largo
            const cx = sala.x + sala.width / 2, cz = sala.z + sala.depth / 2;
            const rots = sala.width >= sala.depth ? [0, 2, 1, 3] : [1, 3, 0, 2];
            for (const [dx, dz] of DESVIOS_CASA) {
                for (const rot of rots) {
                    const e = ejesRefugio(rot);
                    // origen tal que el centro de la tapa caiga en el centro de la sala (más el desvío)
                    const { lidStart } = perfil(S, dE);
                    const uC = lidStart - 0.5 + REFUGIO.trampillaLargo / 2, vC = 0.5;
                    const ox = Math.round(cx - 0.5 - uC * e.uX - vC * e.vX) + dx;
                    const oz = Math.round(cz - 0.5 - uC * e.uZ - vC * e.vZ) + dz;
                    const d = disenarRefugio({ ox, oz, rot, S, dE, salida: 'casa' });
                    if (casaValida(d, parcela, locales, sala)) { d.sala_casa = sala.roomId != null ? sala.roomId : null; return d; }
                }
            }
        }
        return null;
    }

    const refugios = [];
    const pendientes = [];
    for (const parcela of parcelas) {
        if (rand() >= prob) { pendientes.push(parcela); continue; }
        const d = ubicar(parcela);
        if (d) refugios.push({ ...d, parcela: parcela.id });
        else no('parcela_descartada');
    }

    // mínimo garantizado: la parcela válida más cercana al inicio del mapa
    if (refugios.length < MIN_REFUGIOS) {
        const sp = startPosition || { x: width / 2, z: depth / 2 };
        pendientes.sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - sp.x, (a.z0 + a.z1) / 2 - sp.z) - Math.hypot((b.x0 + b.x1) / 2 - sp.x, (b.z0 + b.z1) / 2 - sp.z));
        for (const parcela of pendientes) {
            const d = ubicar(parcela);
            if (d) { refugios.push({ ...d, parcela: parcela.id, forzado: true }); break; }
            no('parcela_descartada');
            if (refugios.length >= MIN_REFUGIOS) break;
        }
    }
    refugios.forEach((r, i) => { r.id = i; });
    return refugios;
}
