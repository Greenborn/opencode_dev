// Segunda planta de las casas y escaleras que la comunican con la planta baja.
//
// Cómo está planteado
// -------------------
// Las salas de una casa son cajas (x,y,z,width,height,depth) apoyadas sobre el
// terreno: el piso es la capa `y` y el techo la capa `y + height - 1`. Para
// levantar un piso más alcanza con clonar las salas de la planta baja con
// `y` desplazado en `height - 1`, de modo que el piso de arriba *es* el techo
// de abajo y no queda ningún hueco ni voladizo: las paredes de las dos plantas
// caen sobre la misma huella y el generador de volumen no necesita saber nada
// nuevo para dibujarlas.
//
// La escalera es un tramo recto que sube un bloque por escalón, así que mide
// tantas celdas de largo como bloques hay que subir, y es tan ancha como los
// pasillos de la casa. Va *dentro de una sala*, separada de las cuatro paredes,
// y no en un pasillo: un tramo del ancho del pasillo lo taparía de pared a
// pared, y entonces o el pie o la cabeza de la escalera queda contra el fondo
// del pasillo —el pie se vuelve inalcanzable desde la planta baja, o el
// descanso de arriba queda aislado del resto de la planta alta—. Puesta en el
// medio de una sala queda piso libre alrededor en las dos plantas: se llega al
// primer escalón, se sale del último y ninguna puerta ni ventana se tapa.
//
// El hueco del entrepiso (la caja de escalera) sale de vaciar la columna de
// cada escalón hasta la altura del piso de arriba. El último escalón queda
// justo a esa altura, así que tapa su propio hueco y hace de umbral: desde él
// se sale caminando al descanso, que es piso de la planta alta.
//
// Por si alguna vez el tramo quedara pegado a una pared, la zona se anota en
// `stairKeepOut` y las funciones que abren puertas la esquivan (ver
// computeDoorSpan en mapType3Utils.js).

import { sortearArmario, sortearCantidades } from '../../plugins/datos.js';
import { BLOCK_TYPES, WORLD_CONFIG, isTintableRender, tintBlockRender } from '../mapConfig.js';
import { stairKeepOutRange } from '../mapType3Utils.js';

// proporción de casas según cantidad de plantas (suma 1)
export const FLOOR_COUNT_DISTRIBUTION = [
    { floors: 1, probability: 0.3 },
    { floors: 2, probability: 0.4 },
    { floors: 3, probability: 0.2 },
    { floors: 4, probability: 0.1 }
];

// ancho de escalera por defecto, si la casa no tuviera ningún pasillo del que
// copiarlo (el generador los hace de 6 bloques).
const DEFAULT_STAIR_WIDTH = 6;

// celdas libres que se reservan a lo largo del tramo: una antes del primer
// escalón para poder encararlo y otra después del último, que es el descanso ya
// en la planta alta.
const STAIR_ACCESS = 1;
const STAIR_LANDING = 1;

// grosor de la losa de la escalera. Cada escalón apoya sobre esta cantidad de
// bloques y debajo del tramo queda aire, en lugar de un macizo desde el piso.
const GROSOR_ESCALERA = 2;

// ancho mínimo de cada uno de los dos tramos de la caja de escalera.
const STAIRWELL_MIN_BAND = 2;

// celdas de descanso que la caja deja en cada extremo, antes del primer escalón
// y después del último. Son dos (y no una como el tramo suelto de una sala)
// para que delante de la escalera quede sitio para moverse y para cruzar de un
// tramo al otro sin quedar encajonado.
const STAIRWELL_LANDING = 2;

// franja de paso que la caja deja a un costado, al lado de los dos tramos.
// Ningún tramo la vacía, así que es piso en todas las plantas: es por donde se
// entra desde la puerta y por donde se camina hasta el extremo que toca.
const STAIRWELL_WALKWAY = 2;

// tipos de sala donde no se pone la escalera: el baño porque no es lugar y el
// pasillo porque es demasiado angosto (ver la nota de arriba).
const SKIP_TYPES = new Set(['banio', 'hallway', 'spawn']);

// preferencia de sala para la escalera; las que no figuran van al final.
const TYPE_PREFERENCE = ['living', 'comedor', 'cocina', 'dormitorio'];

// para el botín de casa: el pasillo, el spawn y la caja de escalera no llevan
// punto fijo. El resto de las salas tira por separado (ver pickLootRooms).
const LOOT_SKIP_TYPES = new Set(['hallway', 'spawn', 'escalera']);

/**
 * ¿Cuántas plantas tiene esta casa? Se expone el random como parámetro para
 * poder forzar el resultado desde los tests.
 */
export function pickFloorCount(random = Math.random) {
    const r = random();
    let acc = 0;
    for (const { floors, probability } of FLOOR_COUNT_DISTRIBUTION) {
        acc += probability;
        if (r < acc) return floors;
    }
    return 1;
}

/**
 * Altura de entrepiso: el piso de arriba se apoya sobre el techo de abajo, así
 * que el desplazamiento es `height - 1` de las salas de la planta baja.
 */
export function floorRise(rooms) {
    let h = 0;
    for (const r of rooms) {
        if (typeof r.height === 'number') h = Math.max(h, r.height);
    }
    return Math.max(0, h - 1);
}

/**
 * Ancho de escalera: el mismo que los pasillos de esta casa.
 */
export function stairWidth(rooms) {
    let w = Infinity;
    for (const r of rooms) {
        if (r.type !== 'hallway') continue;
        w = Math.min(w, r.width, r.depth);
    }
    return Number.isFinite(w) ? w : DEFAULT_STAIR_WIDTH;
}

/**
 * Plan del tramo que sube desde la planta `level` dentro del habitáculo de
 * escalera (`escalera`). Toda la casa sube por la misma caja.
 *
 * Es una escalera de ida y vuelta, como la de un edificio: la caja se parte en
 * dos tramos a lo largo, uno contra cada costado, y las plantas los van
 * alternando. Las plantas pares suben por el tramo de un costado en un
 * sentido y las impares por el del otro costado en el sentido contrario, así
 * que el descanso de cada tramo cae justo al lado del pie del siguiente: se
 * llega arriba, se da media vuelta y se sigue subiendo.
 *
 * Alternar los costados es lo que hace que la caja funcione. Si todas las
 * plantas subieran por el mismo tramo, el de arriba quedaría justo sobre el de
 * abajo —se rellenan macizos desde el piso— y le taparía la cabeza: los
 * últimos escalones quedarían intransitables. Alternando, encima de un tramo
 * sólo hay el hueco del entrepiso y el tramo de dos plantas más arriba, que
 * está a dos entrepisos de distancia.
 *
 * Las filas de los dos extremos quedan siempre de piso (son los descansos, y
 * ningún tramo las vacía), que es lo que pisa quien cambia de tramo. A un
 * costado de los dos tramos queda además la franja de paso, que tampoco se
 * vacía nunca: por ahí entra la puerta —`keepOut` reserva sólo los tramos, no
 * la franja ni los descansos— y por ahí se camina hasta el extremo que toca
 * subir en esta planta.
 *
 * Devuelve null si la caja no da para un tramo con sus dos descansos y la
 * franja de paso.
 */
export function planStairwell(room, rise, level = 0) {
    if (rise <= 0) return null;
    // interior de la caja: la capa exterior de cada lado es pared
    const interior = {
        x0: room.x + 1, x1: room.x + room.width - 2,
        z0: room.z + 1, z1: room.z + room.depth - 2
    };
    const lenX = interior.x1 - interior.x0 + 1;
    const lenZ = interior.z1 - interior.z0 + 1;
    // los tramos suben a lo largo del lado más holgado, uno al lado del otro
    const axis = (lenX >= lenZ) ? 'x' : 'z';
    const long = (axis === 'x') ? lenX : lenZ;
    const cross = (axis === 'x') ? lenZ : lenX;
    const band = Math.floor((cross - STAIRWELL_WALKWAY) / 2);
    if (long < rise + 2 * STAIRWELL_LANDING || band < STAIRWELL_MIN_BAND) {
        return null;
    }

    const longLo = (axis === 'x') ? interior.x0 : interior.z0;
    const longHi = longLo + long - 1;
    const crossLo = (axis === 'x') ? interior.z0 : interior.x0;
    const crossHi = crossLo + cross - 1;
    // la franja de paso va contra un costado y los dos tramos a continuación
    const bandLo = crossLo + (cross - 2 * band);

    // plantas pares: tramo de adentro, subiendo hacia `longHi`.
    // plantas impares: tramo del costado opuesto al paso, subiendo hacia `longLo`.
    const par = (level % 2) === 0;
    const dir = par ? 1 : -1;
    const first = par ? longLo + STAIRWELL_LANDING : longHi - STAIRWELL_LANDING;
    const cross0 = par ? bandLo : crossHi - band + 1;
    const cross1 = cross0 + band - 1;

    // se reservan los dos tramos (no la franja de paso ni los descansos): una
    // puerta que diera a un tramo quedaría tapada por los escalones y, en las
    // plantas en que ese tramo es el hueco del entrepiso, daría al vacío.
    const koLongLo = longLo + STAIRWELL_LANDING;
    const koLongHi = longHi - STAIRWELL_LANDING;

    return {
        room,
        axis,
        dir,
        run: rise,
        startX: (axis === 'x') ? first : cross0,
        startZ: (axis === 'x') ? cross0 : first,
        cross0,
        cross1,
        baseY: room.y,
        keepOut: (axis === 'x')
            ? { x0: koLongLo, x1: koLongHi + 1, z0: bandLo, z1: crossHi + 1 }
            : { x0: bandLo, x1: crossHi + 1, z0: koLongLo, z1: koLongHi + 1 },
        area: lenX * lenZ
    };
}

// arma el tramo dentro de una sala. Busca la posición del tramo (eje, desplazamiento a lo largo y a lo
// ancho) que no pise `avoid` (huecos de escaleras anteriores) ni la puede
// `ok(keepOut)` rechace (por ejemplo, puertas). Prefiere el centro. Devuelve null si no hay ninguna.
function buildPlan(room, rise, width, ok = () => true) {
    // interior de la sala: la capa exterior de cada lado es pared
    const interior = {
        x0: room.x + 1, x1: room.x + room.width - 2,
        z0: room.z + 1, z1: room.z + room.depth - 2
    };
    const lenX = interior.x1 - interior.x0 + 1;
    const lenZ = interior.z1 - interior.z0 + 1;
    const needLong = rise + STAIR_ACCESS + STAIR_LANDING;
    const needCross = width;

    // el eje largo del tramo es el que deja más sitio; si no entra, se prueba el otro
    const axes = (lenX >= lenZ) ? ['x', 'z'] : ['z', 'x'];
    for (const axis of axes) {
        const long = (axis === 'x') ? lenX : lenZ;
        const cross = (axis === 'x') ? lenZ : lenX;
        if (long < needLong || cross < needCross) continue;

        const longLo = (axis === 'x') ? interior.x0 : interior.z0;
        const crossLo = (axis === 'x') ? interior.z0 : interior.x0;
        const centeredFirst = longLo + Math.floor((long - rise) / 2);
        const centeredCross0 = crossLo + Math.floor((cross - width) / 2);
        // primer escalón: entre el paso de acceso y el descanso
        const firstMin = longLo + STAIR_ACCESS;
        const firstMax = longLo + long - rise - STAIR_LANDING;
        // franja transversal: cualquier posición dentro del interior
        const cross0Max = crossLo + cross - width;

        const firsts = orderByDistance(firstMin, firstMax, centeredFirst);
        const cross0s = orderByDistance(crossLo, cross0Max, centeredCross0);
        for (const first of firsts) {
            for (const cross0 of cross0s) {
                const cross1 = cross0 + width - 1;
                const last = first + rise - 1;
                const keepOut = (axis === 'x')
                    ? { x0: first, x1: last + 1, z0: cross0, z1: cross1 + 1 }
                    : { x0: cross0, x1: cross1 + 1, z0: first, z1: last + 1 };
                if (!ok(keepOut)) continue;
                return {
                    room,
                    axis,
                    dir: 1,
                    run: rise,
                    startX: (axis === 'x') ? first : cross0,
                    startZ: (axis === 'x') ? cross0 : first,
                    cross0,
                    cross1,
                    baseY: room.y,
                    keepOut,
                    area: lenX * lenZ
                };
            }
        }
    }
    return null;
}

// valores de `min..max` ordenados por cercanía a `pref` (el centro primero)
function orderByDistance(min, max, pref) {
    const out = [];
    for (let v = min; v <= max; v++) out.push(v);
    return out.sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref) || a - b);
}

// cuánto se prefiere una sala para meter la escalera (menor es mejor)
function typeRank(room) {
    const idx = TYPE_PREFERENCE.indexOf(room.type);
    return (idx === -1) ? TYPE_PREFERENCE.length : idx;
}

// ¿se pisan dos huecos de escalera (con un bloque de margen)?
function keepOutsOverlap(a, b) {
    return a.x0 < b.x1 + 1 && b.x0 < a.x1 + 1 && a.z0 < b.z1 + 1 && b.z0 < a.z1 + 1;
}

// ¿alguna abertura ya puesta en la sala (puerta) cae sobre el tramo? Las
// puertas de las plantas altas se copian de la planta baja, así que hay que
// mirarlas antes de elegir la sala para la escalera de la planta siguiente.
function openingHitsStairs(room, keepOut) {
    const walls = [
        { open: 'openNorth', axis: 'x', coord: room.z },
        { open: 'openSouth', axis: 'x', coord: room.z + room.depth - 1 },
        { open: 'openWest', axis: 'z', coord: room.x },
        { open: 'openEast', axis: 'z', coord: room.x + room.width - 1 }
    ];
    for (const { open, axis, coord } of walls) {
        const range = room[open + 'Range'];
        const keep = stairKeepOutRange({ stairKeepOut: keepOut }, axis, coord);
        if (!room[open] || !range || !keep) continue;
        if (range.start < keep.end && keep.start < range.end) return true;
    }
    return false;
}

/**
 * Elige dónde poner la escalera que sube desde la planta `level`: la sala más
 * apropiada (living > comedor > cocina > dormitorio) y, a igualdad, la más
 * grande, que es la que deja más piso libre alrededor del tramo. No se usan
 * salas que ya tienen escalera (ni las que heredan su hueco de la planta de
 * abajo) ni salas cuyas puertas caerían sobre el tramo. Devuelve el plan o
 * null si no hay ninguna sala donde quepa.
 */
export function planStairs(parcelRooms, rise, width = stairWidth(parcelRooms), level = 0) {
    if (rise <= 0) return null;
    let best = null;
    let bestRank = Infinity;
    for (const room of parcelRooms) {
        if (SKIP_TYPES.has(room.type)) continue;
        if ((room.floor || 0) !== level) continue;
        // el hueco de una escalera de la planta de abajo (heredado) no puede
        // pisarse; el resto de la sala sí sirve para otra escalera
        const plan = buildPlan(room, rise, width, keepOut =>
            !(room.stairKeepOut && keepOutsOverlap(room.stairKeepOut, keepOut)) &&
            !openingHitsStairs(room, keepOut));
        if (!plan) continue;
        const rank = typeRank(room);
        const better = !best || rank < bestRank ||
            (rank === bestRank && plan.area > best.area);
        if (better) {
            best = plan;
            bestRank = rank;
        }
    }
    return best;
}

/**
 * Deja el plan anotado en la sala que lleva la escalera: `stairs` para que el
 * generador de volumen labre los escalones y `stairKeepOut` para que las
 * puertas lo esquiven.
 */
export function applyStairPlan(plan) {
    if (!plan) return;
    const room = plan.room;
    room.stairKeepOut = plan.keepOut;
    room.stairs = {
        axis: plan.axis,
        dir: plan.dir,
        startX: plan.startX,
        startZ: plan.startZ,
        cross0: plan.cross0,
        cross1: plan.cross1,
        baseY: plan.baseY,
        run: plan.run,
        texture: room.floorTexture
    };
}

// probabilidad de que una sala de la planta lleve botín fijo
export const LOOT_PROBABILITY_POR_SALA = 0.25;

/**
 * Elige las salas que llevan botín fijo en la planta `level`: cada sala
 * elegible (sin pasillo, spawn ni caja de escalera) tira por separado con
 * probabilidad LOOT_PROBABILITY_POR_SALA. Devuelve la lista (puede ser vacía).
 */
export function pickLootRooms(parcelRooms, level = 0, random = Math.random) {
    const elegidas = [];
    for (const room of parcelRooms) {
        if (LOOT_SKIP_TYPES.has(room.type)) continue;
        if ((room.floor || 0) !== level) continue;
        if (random() < LOOT_PROBABILITY_POR_SALA) elegidas.push(room);
    }
    return elegidas;
}

/**
 * Punto concreto donde apoya la caja dentro de `room`: una celda del interior,
 * lo más cerca posible del centro, que no caiga en el hueco de la escalera.
 * Devuelve coordenadas de mundo con la caja apoyada sobre la capa de piso.
 */
export function pickLootSpot(room) {
    if (!room) return null;
    const x0 = room.x + 1;
    const x1 = room.x + room.width - 2;
    const z0 = room.z + 1;
    const z1 = room.z + room.depth - 2;
    const cx = Math.floor((x0 + x1) / 2);
    const cz = Math.floor((z0 + z1) / 2);
    const keep = room.stairKeepOut;
    const enKeepOut = (x, z) => !!keep &&
        x >= keep.x0 && x < keep.x1 && z >= keep.z0 && z < keep.z1;

    let mejor = null;
    let mejorDist = Infinity;
    for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
            if (enKeepOut(x, z)) continue;
            const d = (x - cx) * (x - cx) + (z - cz) * (z - cz);
            if (d < mejorDist) {
                mejor = { x, z };
                mejorDist = d;
            }
        }
    }
    if (!mejor) return null;
    return { x: mejor.x + 0.5, y: room.y + 1, z: mejor.z + 0.5 };
}

/**
 * Armario de la sala (supervivencia, ver cliente/necesidades_config.js): según
 * la probabilidad del tipo de sala se decide si lleva uno y qué trae (comida,
 * agua, ambos o vacío) y CUÁNTO (`cantidad` {comida, agua}, ver
 * CANTIDAD_ARMARIO); todo se sortea UNA vez, acá. Va en una esquina del
 * interior, fuera del hueco de la escalera y de la celda de la caja de botín,
 * con la espalda contra una de las dos paredes de la esquina.
 *
 * `rot` es hacia dónde mira el frente (0 = +z, 1 = +x, 2 = -z, 3 = -x) y
 * `ext` hacia dónde se extiende a lo largo de la pared (alejándose del rincón,
 * para ocupar la celda de al lado: ver cliente/armarios_config.js); `rot2` y
 * `ext2` son lo mismo para la otra pared de la esquina. El servidor elige entre
 * las dos según cuál tenga pared maciza detrás y lugar al lado (ver armarios.js).
 * Devuelve `{x, y, z, contenido, cantidad, rot, ext, rot2, ext2}` o null.
 */
export function pickArmario(room, random = Math.random) {
    if (!room) return null;
    const contenido = sortearArmario(room.type, random);
    if (!contenido) return null;
    const x0 = room.x + 1, x1 = room.x + room.width - 2;
    const z0 = room.z + 1, z1 = room.z + room.depth - 2;
    if (x1 < x0 || z1 < z0) return null;
    const keep = room.stairKeepOut;
    const loot = room.lootSpot;
    // [x, z, rot si la pared es la de oeste/este, rot si es la de norte/sur]
    const esquinas = [[x0, z0, 1, 0], [x1, z0, 3, 0], [x0, z1, 1, 2], [x1, z1, 3, 2]];
    // orden al azar para no apilar siempre contra la misma pared
    for (let i = esquinas.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [esquinas[i], esquinas[j]] = [esquinas[j], esquinas[i]];
    }
    for (const [x, z, rotX, rotZ] of esquinas) {
        if (keep && x >= keep.x0 && x < keep.x1 && z >= keep.z0 && z < keep.z1) continue;
        if (loot && Math.floor(loot.x) === x && Math.floor(loot.z) === z) continue;
        const cantidad = sortearCantidades(contenido, random);
        // contra la pared oeste/este se extiende en z; contra la norte/sur, en x (siempre alejándose del rincón)
        const extX = [x === x0 ? 1 : -1, 0], extZ = [0, z === z0 ? 1 : -1];
        const primero = random() < 0.5;
        return {
            x: x + 0.5, y: room.y + 1, z: z + 0.5, contenido, cantidad,
            rot: primero ? rotX : rotZ, ext: primero ? extZ : extX,
            rot2: primero ? rotZ : rotX, ext2: primero ? extX : extZ
        };
    }
    return null;
}

// alto del jugador (cliente/player.js): para pararse en el techo hacen falta
// este número de bloques libres encima de la cubierta.
const ALTO_JUGADOR = 4;

// --- Construcciones de azotea (ver planRoofExtras / buildRoofExtras) ---
// Casilla de la escalera: el cuartito con techo y puerta por el que se sale a
// la azotea. Alto libre por dentro, alto de la puerta y cuánto descanso
// techado se intenta dejar más allá del último escalón.
const CASILLA_ALTO = 6;
const CASILLA_ALTO_PUERTA = ALTO_JUGADOR + 1;
const CASILLA_ANCHO_PUERTA = 3;
const CASILLA_DESCANSO = 2;
// Tanque de agua: la mitad de las casas lleva uno, y de esos la mitad va
// sobre cuatro patas y la otra mitad apoyado directo en la cubierta.
const PROB_TANQUE = 0.5;
const PROB_TANQUE_CON_PATAS = 0.5;
const TANQUE_LARGO = 5, TANQUE_ANCHO = 4, TANQUE_ALTO = 3, TANQUE_PATAS = 3;
const TANQUE_TINTE = 0x39434f;
// Bloques que tiene que haber libres dentro del mundo por encima de la
// cubierta: lo más alto que se le construye encima (casilla con su losa, o
// tanque con patas) más uno de margen.
const ALTO_SOBRE_AZOTEA = Math.max(ALTO_JUGADOR, CASILLA_ALTO + 1, TANQUE_PATAS + TANQUE_ALTO) + 1;

/**
 * Cuántas plantas caben en el volumen sin que el techo de la última quede
 * pegado al borde del mundo: la cubierta está en `baseY + plantas * rise` y
 * tiene que dejar ALTO_JUGADOR bloques libres encima.
 */
export function maxFloorsFitting(baseY, rise, volumeHeight) {
    if (rise <= 0) return 1;
    return Math.max(1, Math.floor((volumeHeight - 1 - ALTO_SOBRE_AZOTEA - baseY) / rise));
}

/**
 * Saca de `structures` las salas de la planta `floor` de la parcela.
 */
export function removeFloor(structures, parcelId, floor) {
    for (let i = structures.length - 1; i >= 0; i--) {
        const s = structures[i];
        if (s.parcelId === parcelId && (s.floor || 0) === floor) structures.splice(i, 1);
    }
}

/**
 * Quita la escalera anotada en la sala (la de `stairs` y su `stairKeepOut`).
 * Acepta null para simplificar el llamado.
 */
export function clearStairPlan(plan) {
    if (!plan) return;
    delete plan.room.stairs;
    delete plan.room.stairKeepOut;
}

/** ¿La sala tiene alguna puerta? */
export function hasDoor(room) {
    return !!(room.openNorth || room.openSouth || room.openEast || room.openWest);
}

// copia una sala a la planta de arriba (`stairKeepOut` se hereda: el hueco de
// la escalera de abajo también llega al descanso de la planta siguiente)
function cloneUp(room, rise) {
    const c = Object.assign({}, room);
    c.y = room.y + rise;
    c.floor = (room.floor || 0) + 1;
    delete c.roomId;
    delete c.stairs;            // la escalera se labra una sola vez, desde abajo
    delete c.hasFrontDoor;      // la puerta de calle existe sólo en la planta baja
    // la puerta al patio daría al vacío si se repite arriba
    if (room.rearDoorSide) {
        delete c['open' + room.rearDoorSide];
        delete c['open' + room.rearDoorSide + 'Range'];
        delete c.rearDoorSide;
        delete c.doorHeight;
    }
    ['North', 'South', 'West', 'East'].forEach(dir => {
        const openKey = 'open' + dir + 'Range';
        if (c[openKey]) c[openKey] = Object.assign({}, c[openKey]);
        // las ventanas se recalculan por planta
        delete c['window' + dir + 'Range'];
    });
    return c;
}

/**
 * Clona las salas de la parcela una planta más arriba y las agrega a
 * `structures`. Devuelve las salas nuevas.
 */
export function buildUpperFloor(parcelRooms, structures, rise) {
    const clones = [];
    for (const room of parcelRooms) {
        if (room.type === 'spawn') continue;
        const clone = cloneUp(room, rise);
        clones.push(clone);
        structures.push(clone);
    }
    return clones;
}

/**
 * Levanta el antepecho de los techos: un bloque por encima de la cubierta, a
 * lo largo del perímetro de la casa. Ahora que por la caja de escalera se sale
 * al techo, el pretil es lo que evita caerse por el borde de un tiro.
 *
 * Sólo va en el perímetro, no sobre las paredes de adentro: una celda de pared
 * de la planta más alta lleva pretil cuando la celda vecina de ese lado no es
 * parte de la misma casa. Así el techo queda despejado por dentro y amurallado
 * por fuera.
 */
export function buildRoofParapets(volume, structures, width, depth, volumeHeight) {
    // salas de la planta más alta de cada casa, que son las que tienen cubierta
    const topFloor = new Map();
    for (const s of structures) {
        if (!s.parcelId || s.type === 'spawn') continue;
        const f = s.floor || 0;
        if (!topFloor.has(s.parcelId) || f > topFloor.get(s.parcelId)) {
            topFloor.set(s.parcelId, f);
        }
    }
    const roof = structures.filter(s =>
        s.parcelId && s.type !== 'spawn' && (s.floor || 0) === topFloor.get(s.parcelId)
    );

    // ¿(x,z) cae dentro de alguna sala con cubierta de esta misma casa?
    const sameHouse = (parcelId, x, z) => roof.some(s =>
        s.parcelId === parcelId &&
        x >= s.x && x < s.x + s.width && z >= s.z && z < s.z + s.depth
    );

    for (const s of roof) {
        const y = s.y + s.height;          // un bloque sobre la cubierta
        if (y < 0 || y >= volumeHeight) continue;
        const texture = (s.wallTexture !== undefined) ? s.wallTexture : BLOCK_TYPES.BRICK;
        const x1 = s.x + s.width - 1;
        const z1 = s.z + s.depth - 1;
        for (let x = s.x; x <= x1; x++) {
            for (let z = s.z; z <= z1; z++) {
                // sólo el anillo de pared de la sala
                if (x !== s.x && x !== x1 && z !== s.z && z !== z1) continue;
                if (x < 0 || x >= width || z < 0 || z >= depth) continue;
                // ...y sólo donde dé al exterior de la casa
                const exterior =
                    (x === s.x && !sameHouse(s.parcelId, x - 1, z)) ||
                    (x === x1 && !sameHouse(s.parcelId, x + 1, z)) ||
                    (z === s.z && !sameHouse(s.parcelId, x, z - 1)) ||
                    (z === z1 && !sameHouse(s.parcelId, x, z + 1));
                if (!exterior) continue;
                volume.set(x, y, z, texture);
            }
        }
    }
}

/**
 * Decide qué se construye sobre la azotea de una casa y lo deja anotado en
 * sus salas (sólo datos; lo levanta `buildRoofExtras` y la luz la planta
 * `agregarLucesInteriores` en mapType3Block.js):
 *
 *   - `casillaAzotea`, en la sala del tramo que sale al techo: un cuartito
 *     con techo que cubre el hueco de la escalera, con una puerta hacia la
 *     azotea y una luz adentro que queda prendida de noche.
 *   - `tanqueAzotea`, en la mitad de las casas (tengan escalera o no): un
 *     tanque de agua rectangular, la mitad de las veces sobre cuatro patas.
 *
 * @param {object[]} topRooms  salas de la planta más alta de la casa
 * @param {object|null} stairPlan  el tramo que sube a la azotea, si hay
 */
export function planRoofExtras(topRooms, stairPlan) {
    const rooms = topRooms.filter(s => s.type !== 'spawn');
    if (rooms.length === 0) return;
    // Cerca del borde del mundo el generador recorta las casas y otras
    // construcciones pisan la parcela: ahí no se levanta nada.
    const BORDE = 12;
    const enAzotea = (x, z) =>
        x >= BORDE && z >= BORDE && x < WORLD_CONFIG.width - BORDE && z < WORLD_CONFIG.height - BORDE &&
        rooms.some(s => x >= s.x && x < s.x + s.width && z >= s.z && z < s.z + s.depth);
    // el anillo exterior lleva el antepecho (ver buildRoofParapets)
    const enBorde = (x, z) => !(enAzotea(x - 1, z) && enAzotea(x + 1, z) && enAzotea(x, z - 1) && enAzotea(x, z + 1));
    const despejado = (x, z) => enAzotea(x, z) && !enBorde(x, z);

    let ocupado = null;   // caja (inclusive) que el tanque tiene que esquivar
    if (stairPlan) {
        const casilla = planCasilla(stairPlan, enAzotea, despejado);
        const st = stairPlan;
        const first = (st.axis === 'x') ? st.startX : st.startZ;
        const last = first + st.dir * (st.run - 1);
        // aunque no haya entrado la casilla, el hueco de la escalera se esquiva
        ocupado = casilla || ((st.axis === 'x')
            ? { x0: Math.min(first, last), x1: Math.max(first, last), z0: st.cross0, z1: st.cross1 }
            : { x0: st.cross0, x1: st.cross1, z0: Math.min(first, last), z1: Math.max(first, last) });
        if (casilla) stairPlan.room.casillaAzotea = casilla;
        else console.log('  sin lugar para la casilla de la escalera en la azotea');
    }

    if (Math.random() >= PROB_TANQUE) return;
    const conPatas = Math.random() < PROB_TANQUE_CON_PATAS;
    const girado = Math.random() < 0.5;
    const w = girado ? TANQUE_ANCHO : TANQUE_LARGO;
    const d = girado ? TANQUE_LARGO : TANQUE_ANCHO;
    const MARGEN = 2;   // paso libre alrededor del tanque y hasta la casilla
    const orden = rooms.slice().sort(() => Math.random() - 0.5);
    for (const room of orden) {
        for (let intento = 0; intento < 12; intento++) {
            const x0 = room.x + Math.floor(Math.random() * Math.max(1, room.width - w + 1));
            const z0 = room.z + Math.floor(Math.random() * Math.max(1, room.depth - d + 1));
            let libre = true;
            for (let x = x0 - 1; x <= x0 + w && libre; x++) {
                for (let z = z0 - 1; z <= z0 + d && libre; z++) {
                    if (!despejado(x, z)) libre = false;
                }
            }
            if (libre && ocupado &&
                x0 - MARGEN <= ocupado.x1 && ocupado.x0 <= x0 + w - 1 + MARGEN &&
                z0 - MARGEN <= ocupado.z1 && ocupado.z0 <= z0 + d - 1 + MARGEN) libre = false;
            if (!libre) continue;
            room.tanqueAzotea = { x0, z0, w, d, roofY: room.y + room.height - 1, conPatas };
            return;
        }
    }
}

// La casilla: caja de paredes alrededor del hueco del tramo, alargada hacia
// la salida para dejar un descanso techado, con la puerta en la pared del
// fondo (de frente a quien sube) o, si esa da al vacío o al antepecho, en un
// costado del descanso. Devuelve null si no hay cómo ponerle una puerta que
// dé a la azotea.
function planCasilla(st, enAzotea, despejado) {
    const first = (st.axis === 'x') ? st.startX : st.startZ;
    // (i a lo largo del tramo, c a lo ancho) -> celda del mundo
    const celda = (i, c) => (st.axis === 'x')
        ? { x: first + st.dir * i, z: c }
        : { x: c, z: first + st.dir * i };
    const roofY = st.baseY + st.run;   // la capa de la cubierta
    const c0 = st.cross0 - 1, c1 = st.cross1 + 1;

    for (let descanso = CASILLA_DESCANSO; descanso >= 0; descanso--) {
        const iFondo = st.run + descanso;       // pared del fondo
        let entra = true;
        for (let i = -1; i <= iFondo && entra; i++) {
            for (let c = c0; c <= c1 && entra; c++) {
                const p = celda(i, c);
                if (!enAzotea(p.x, p.z)) entra = false;
            }
        }
        if (!entra) continue;

        // candidatas a puerta: [celdas de pared], cada una con su celda de afuera
        const candidatas = [];
        const ancho = Math.min(CASILLA_ANCHO_PUERTA, st.cross1 - st.cross0 + 1);
        const cPuerta = st.cross0 + Math.floor((st.cross1 - st.cross0 + 1 - ancho) / 2);
        const fondo = [];
        for (let k = 0; k < ancho; k++) fondo.push({ pared: celda(iFondo, cPuerta + k), afuera: celda(iFondo + 1, cPuerta + k) });
        candidatas.push(fondo);
        // costados: sólo a la altura del piso techado (último escalón + descanso)
        const iPiso0 = Math.max(st.run - 1, iFondo - CASILLA_ANCHO_PUERTA);
        if (iFondo - iPiso0 >= 2) {
            for (const [c, cAfuera] of [[c0, c0 - 1], [c1, c1 + 1]]) {
                const lado = [];
                for (let i = iPiso0; i < iFondo; i++) lado.push({ pared: celda(i, c), afuera: celda(i, cAfuera) });
                candidatas.push(lado);
            }
        }
        const puerta = candidatas.find(cs => cs.every(({ afuera }) => despejado(afuera.x, afuera.z)));
        if (!puerta) continue;

        const a = celda(-1, c0), b = celda(iFondo, c1);
        const centro = celda((st.run - 1 + iFondo - 1) / 2, (st.cross0 + st.cross1) / 2);
        return {
            x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x),
            z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z),
            roofY,
            puerta: puerta.map(({ pared }) => pared),
            luz: { x: centro.x + 0.5, y: roofY + CASILLA_ALTO - 0.5, z: centro.z + 0.5 }
        };
    }
    return null;
}

/**
 * Levanta en el volumen lo que `planRoofExtras` dejó anotado: casillas de
 * escalera y tanques de agua. Va después de las escaleras y los antepechos.
 */
export function buildRoofExtras(volume, structures, width, depth, volumeHeight) {
    const poner = (x, y, z, tipo, tinte, opacidad) => {
        if (x < 0 || x >= width || z < 0 || z >= depth || y < 0 || y >= volumeHeight) return;
        volume.set(x, y, z, tipo);
        if (tipo !== BLOCK_TYPES.AIR && tinte != null && isTintableRender(tipo)) {
            tintBlockRender(volume, x, y, z, tinte, opacidad);
        }
    };
    for (const s of structures) {
        const cas = s.casillaAzotea;
        if (cas) {
            const pared = (s.wallTexture !== undefined) ? s.wallTexture : BLOCK_TYPES.BRICK;
            const tinte = (s.tintRender != null) ? s.tintRender : null;
            const opacidad = (s.tintOpacity != null) ? s.tintOpacity : 0.5;
            const esPuerta = (x, z) => cas.puerta.some(p => p.x === x && p.z === z);
            for (let x = cas.x0; x <= cas.x1; x++) {
                for (let z = cas.z0; z <= cas.z1; z++) {
                    const anillo = x === cas.x0 || x === cas.x1 || z === cas.z0 || z === cas.z1;
                    if (anillo) {
                        const puerta = esPuerta(x, z);
                        for (let h = 1; h <= CASILLA_ALTO; h++) {
                            if (puerta && h <= CASILLA_ALTO_PUERTA) poner(x, cas.roofY + h, z, BLOCK_TYPES.AIR);
                            else poner(x, cas.roofY + h, z, pared, tinte, opacidad);
                        }
                    }
                    // la losa que la techa
                    poner(x, cas.roofY + CASILLA_ALTO + 1, z, BLOCK_TYPES.GRAY);
                }
            }
        }
        const t = s.tanqueAzotea;
        if (t) {
            const base = t.roofY + 1 + (t.conPatas ? TANQUE_PATAS : 0);
            if (t.conPatas) {
                for (const [x, z] of [[t.x0, t.z0], [t.x0 + t.w - 1, t.z0], [t.x0, t.z0 + t.d - 1], [t.x0 + t.w - 1, t.z0 + t.d - 1]]) {
                    for (let y = t.roofY + 1; y < base; y++) poner(x, y, z, BLOCK_TYPES.GRAY);
                }
            }
            for (let x = t.x0; x < t.x0 + t.w; x++) {
                for (let z = t.z0; z < t.z0 + t.d; z++) {
                    for (let y = base; y < base + TANQUE_ALTO; y++) poner(x, y, z, BLOCK_TYPES.GRAY, TANQUE_TINTE, 0.75);
                }
            }
        }
    }
}

/**
 * Labra las escaleras en el volumen. Por cada escalón se vacía la columna
 * completa hasta el entrepiso —ese hueco es la caja de escalera, lo que permite
 * asomar la cabeza a la planta alta— y después se rellena el escalón. El último
 * escalón queda justo a la altura del piso de arriba, así que tapa su propio
 * hueco y se puede caminar desde él hacia el descanso.
 */
export function carveStairs(volume, structures, width, depth, volumeHeight) {
    for (const s of structures) {
        const st = s.stairs;
        if (!st) continue;
        const texture = (st.texture !== undefined) ? st.texture : BLOCK_TYPES.GRAY;
        for (let i = 0; i < st.run; i++) {
            const x = st.startX + (st.axis === 'x' ? i * st.dir : 0);
            const z = st.startZ + (st.axis === 'z' ? i * st.dir : 0);
            for (let c = st.cross0; c <= st.cross1; c++) {
                const cx = (st.axis === 'x') ? x : c;
                const cz = (st.axis === 'x') ? c : z;
                if (cx < 0 || cx >= width || cz < 0 || cz >= depth) continue;
                for (let y = st.baseY + 1; y <= st.baseY + st.run; y++) {
                    if (y < 0 || y >= volumeHeight) continue;
                    volume.set(cx, y, cz, BLOCK_TYPES.AIR);
                }
                // la escalera es una losa de GROSOR_ESCALERA bloques, no un
                // macizo desde el piso: debajo del tramo queda aire.
                const pisada = st.baseY + 1 + i;
                const desde = Math.max(st.baseY + 1, pisada - GROSOR_ESCALERA + 1);
                for (let y = desde; y <= pisada; y++) {
                    if (y < 0 || y >= volumeHeight) continue;
                    volume.set(cx, y, cz, texture);
                }
            }
        }
    }
}
