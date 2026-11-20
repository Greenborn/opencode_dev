// nuevo generador de ventanas: algoritmo modularizado según especificación del usuario
// Función diseñada para ejecutarse **una vez por parcela**, recibiendo la lista
// de salas que componen esa casa y el conjunto completo de estructuras para
// detectar adyacencias externas.

// (la versión anterior interpretaba el primer parámetro como el arreglo
// global de estructuras y filtraba internamente, lo cual llevó a la
// confusión mencionada por el usuario).  Conservamos la compatibilidad
// mínima detectando el número de argumentos.

/**
 * Comprueba si dos intervalos [a0,a1) y [b0,b1) se solapan (auxiliar).
 */
function rangesOverlap(a0, a1, b0, b1) {
    return a0 < b1 && b0 < a1;
}

import { BLOCK_TYPES } from '../mapConfig.js';

// parámetros por defecto de ventana (se podrían exponer si se desea)
// ahora la anchura base se ha doblado para cumplir la nueva especificación
// Nota: durante el cálculo de ventanas, si una pared no tiene espacio
// suficiente para el ancho estándar (`DEFAULT_WINDOW_LENGTH`), el algoritmo
// reduce la longitud efectiva a `pared.length - 2` (pero nunca menos de 1).
// Esto permite abrir una ventana incluso en paredes muy cortas; la lógica se
// encuentra en `assignWindows`.
const DEFAULT_WINDOW_LENGTH = 6;
// la altura se reduce en 1 para compensar el desplazamiento vertical
const DEFAULT_WINDOW_HEIGHT = 3;
// la elevación base se ajusta: ahora la ventana arranca dos bloques por
// encima del piso, como pide la última especificación.  para compensar se
// reduce la altura efectiva en 1 (reflejado más abajo).
const DEFAULT_WINDOW_ELEVATION = 3; // bloques sobre el piso

// separación mínima entre ventanas adyacentes (por defecto igual al ancho de
// ventana, igual que antes en el código original donde cada pared sólo podía
// alojar una ventana única).  se puede anular pasando
// `params.separation` a `assignWindows` o a `addWindows`.
const DEFAULT_WINDOW_SEPARATION = 2;

// constantes de cuadras/calles (duplicadas de mapType3Block.js para poder
// calcular si una coordenada está sobre una calle sin necesidad de importar
// el módulo entero).
const blockZoneSize = 176;
const streetWidth = 20;
const patternSize = blockZoneSize + streetWidth;

/**
 * determina si una posición de minimapa corresponde a la calzada de una calle
 * (se usa para permitir ventanas en el borde del solar si dan a la calle).
 */
function isStreetCoord(x, z) {
    const inStreetX = (x % patternSize) >= blockZoneSize;
    const inStreetZ = (z % patternSize) >= blockZoneSize;
    return inStreetX || inStreetZ;
}

/**
 * Dados los límites del solar y una lista de estructuras, comprueba si la
 * celda ((nx,nz) justo fuera de una pared) pertenece a otra habitación.
 */
function structureAt(structures, nx, nz) {
    return structures.some(t =>
        nx >= t.x && nx < t.x + t.width &&
        nz >= t.z && nz < t.z + t.depth
    );
}

/**
 * Las casas de dos plantas repiten la misma huella en altura, así que una sala
 * sólo puede tapar la pared de otra si están en el mismo piso.  Devuelve la
 * sublista de `structures` que vive en la planta `floor` (memoizada por
 * llamada a addWindows, que recorre muchas salas con la misma lista).
 */
function structuresOnFloor(structures, floor, cache) {
    const key = floor || 0;
    let list = cache.get(key);
    if (!list) {
        list = structures.filter(t => (t.floor || 0) === key);
        cache.set(key, list);
    }
    return list;
}

/**
 * comprueba si un bloque de pared concreto ya forma parte de una abertura (puerta)
 */
function isBlockedByOpening(room, x, z) {
    // helper: bloquea un rango en una pared N/S (eje X) o E/O (eje Z).
    // cuando hay Range se usa directamente; si falta (p.ej. puerta de patio
    // que markRearDoor deja sin range) se calcula igual que mapType3.js:
    // doorWidth = Math.min(4, lado - 2), centrado en la pared.
    const blockedX = (range, wallZ) => {
        if (z !== wallZ) return false;
        if (range) return x >= range.start && x < range.end;
        const dw = Math.min(4, room.width - 2);
        const ds = room.x + Math.floor((room.width - dw) / 2);
        return x >= ds && x < ds + dw;
    };
    const blockedZ = (range, wallX) => {
        if (x !== wallX) return false;
        if (range) return z >= range.start && z < range.end;
        const dw = Math.min(4, room.depth - 2);
        const ds = room.z + Math.floor((room.depth - dw) / 2);
        return z >= ds && z < ds + dw;
    };

    // puertas interiores entre habitaciones y puerta del patio (open* sin Range)
    if (room.openNorth && blockedX(room.openNorthRange, room.z)) return true;
    if (room.openSouth && blockedX(room.openSouthRange, room.z + room.depth - 1)) return true;
    if (room.openWest  && blockedZ(room.openWestRange,  room.x)) return true;
    if (room.openEast  && blockedZ(room.openEastRange,  room.x + room.width - 1)) return true;

    // puerta de entrada (hasFrontDoor) — igual fórmula que mapType3.js
    if (room.hasFrontDoor) {
        const doorWidthX = Math.min(4, room.width - 2);
        const doorWidthZ = Math.min(4, room.depth - 2);
        const doorXStart = room.x + Math.floor((room.width - doorWidthX) / 2);
        const doorZStart = room.z + Math.floor((room.depth - doorWidthZ) / 2);
        if (room.frontNorth && z === room.z &&
            x >= doorXStart && x < doorXStart + doorWidthX) return true;
        if (room.frontSouth && z === room.z + room.depth - 1 &&
            x >= doorXStart && x < doorXStart + doorWidthX) return true;
        if (room.frontWest && x === room.x &&
            z >= doorZStart && z < doorZStart + doorWidthZ) return true;
        if (room.frontEast && x === room.x + room.width - 1 &&
            z >= doorZStart && z < doorZStart + doorWidthZ) return true;
    }
    return false;
}

/**
 * paso 2: para una sala genera el listado de posiciones de pared válidas para
 * ventanas.  devuelve coordenadas globales junto a orientación.
 */
// obtener rectángulos de parcela a partir de los identificadores
// conocidos; cada `parcelId` es la coordenada de la esquina superior
// izquierda del solar.
function computeParcelRects(structures) {
    const rects = Object.create(null);
    structures.forEach(s => {
        if (s.parcelId == null) return;
        if (!rects[s.parcelId]) {
            const parts = s.parcelId.split('_').map(Number);
            rects[s.parcelId] = { x: parts[0], z: parts[1] };
        }
    });
    return Object.entries(rects).map(([id, { x, z }]) => ({ id, x, z }));
}

function computeAvailableWallPositions(room, structures, plotX0, plotZ0, plotWidth, plotDepth, sameFloor) {
    const positions = [];
    // los rectángulos de parcela se calculan con TODAS las estructuras: una
    // parcela vecina delimita terreno ajeno aunque allí no haya planta alta.
    const parcelRects = computeParcelRects(structures);
    // las adyacencias que tapan una pared, en cambio, sólo cuentan dentro de
    // la misma planta.
    const neighbours = sameFloor || structures;
    const roomParcel = room.parcelId;
    const { x, z, width, depth } = room;
    const check = (wx, wz, orientation) => {
        // no considerar si ya hay apertura justo en este bloque
        if (isBlockedByOpening(room, wx, wz)) return;
        // no permitir ventanas si existe habitación adyacente en el lado exterior
        let outsideX = wx;
        let outsideZ = wz;
        if (orientation === 'north') outsideZ = wz - 1;
        if (orientation === 'south') outsideZ = wz + 1;
        if (orientation === 'west') outsideX = wx - 1;
        if (orientation === 'east') outsideX = wx + 1;
        if (structureAt(neighbours, outsideX, outsideZ)) return;
        // si el bloque exterior cae dentro de cualquier otra parcela,
        // consideramos que la pared mira a terreno vecino y rechazamos la
        // posición.  no importa si la pared está en el límite; la ventana
        // podría generarse en una habitación que se extiende sobre parcelas y
        // en ese caso cada bloque debe comprobarse.
        for (const { id: pid, x: px, z: pz } of parcelRects) {
            if (pid === roomParcel) continue;
            if (outsideX >= px && outsideX < px + plotWidth &&
                outsideZ >= pz && outsideZ < pz + plotDepth) {
                return; // vecino
            }
        }
        positions.push({ x: wx, z: wz, orientation });
    };

    // helper que comprueba si una coordenada está dentro del solar
    const inParcel = (px, pz) =>
        px >= plotX0 && px < plotX0 + plotWidth &&
        pz >= plotZ0 && pz < plotZ0 + plotDepth;

    // norte (solo los segmentos de la pared que permanecen dentro del lote)
    for (let sx = x; sx < x + width; sx++) {
        if (inParcel(sx, z)) check(sx, z, 'north');
    }
    // sur
    for (let sx = x; sx < x + width; sx++) {
        const wz = z + depth - 1;
        if (inParcel(sx, wz)) check(sx, wz, 'south');
    }
    // oeste
    for (let sz = z; sz < z + depth; sz++) {
        if (inParcel(x, sz)) check(x, sz, 'west');
    }
    // este
    for (let sz = z; sz < z + depth; sz++) {
        const wx = x + width - 1;
        if (inParcel(wx, sz)) check(wx, sz, 'east');
    }
    return positions;
}

/**
 * paso 3: agrupa posiciones contiguas en el mismo eje para formar paredes.
 * Devuelve un arreglo de paredes; cada pared es un arreglo de posiciones
 * ordenadas según la dirección principal (x o z).
 */
function groupPositionsIntoWalls(positions) {
    const walls = [];
    // separar por orientación y eje de crecimiento
    const buckets = {
        north: [], south: [], west: [], east: []
    };
    positions.forEach(p => buckets[p.orientation].push(p));
    Object.keys(buckets).forEach(dir => {
        const list = buckets[dir];
        if (list.length === 0) return;
        // ordenar por el eje correcto
        const key = (dir === 'north' || dir === 'south') ? 'x' : 'z';
        list.sort((a, b) => a[key] - b[key]);
        // agrupar contiguos
        let current = [list[0]];
        for (let i = 1; i < list.length; i++) {
            const prev = list[i - 1];
            const cur = list[i];
            if (cur[key] === prev[key] + 1) {
                current.push(cur);
            } else {
                walls.push(current);
                current = [cur];
            }
        }
        walls.push(current);
    });
    return walls;
}

/**
 * paso 4: a partir del arreglo de paredes decide dónde colocar una ventana
 * para cada sala; si la pared es suficientemente larga, se marca el rango en
 * la estructura de la sala (window*Range) centrado en la pared.
 */
function assignWindows(room, walls, params = {}) {
    const winLen = params.length || DEFAULT_WINDOW_LENGTH;
    const winSep = params.separation != null ? params.separation : DEFAULT_WINDOW_SEPARATION;

    // helper para añadir rango a la estructura de la sala; si `append` es true
    // se garantiza que el valor sea un arreglo y se apilan varios rangos.  la
    // orientación se calcula a partir de la primera y última posición.
    const addRange = (orient, first, last, append) => {
        const key = 'window' + orient[0].toUpperCase() + orient.slice(1) + 'Range';
        const range = {
            start: (orient === 'north' || orient === 'south') ? first.x : first.z,
            end:   (orient === 'north' || orient === 'south') ? last.x + 1 : last.z + 1
        };
        if (append) {
            if (!room[key]) room[key] = [];
            if (!Array.isArray(room[key])) room[key] = [room[key]];
            room[key].push(range);
        } else {
            room[key] = range;
        }
    };

    walls.forEach(wall => {
        const L = wall.length;
        // Reservar siempre 1 bloque de margen al inicio y al final de la pared.
        // Esto garantiza que:
        //   a) nunca haya una ventana en el bloque más extremo de la pared, y
        //   b) siempre haya al menos 1 bloque sólido entre una ventana y el
        //      borde del segmento (que puede colindar con una puerta eliminada
        //      por isBlockedByOpening), por lo que las puertas tienen prioridad.
        const inner = wall.slice(1, L - 1);
        const M = inner.length; // = L - 2
        if (M <= 0) return; // pared demasiado corta para dejar márgenes

        // si winLen no cabe en la zona interna, usamos toda ella
        const effectiveWinLen = Math.min(winLen, M);

        // cuántas ventanas caben si dejamos `winSep` bloques entre ellas
        const count = Math.floor(M / (effectiveWinLen + winSep));
        if (count < 2) {
            // una única ventana centrada en la zona interna
            const half = Math.floor(effectiveWinLen / 2);
            const startIndex = Math.max(0, Math.floor(M / 2) - half);
            const windowSpan = inner.slice(startIndex, startIndex + effectiveWinLen);
            if (windowSpan.length < effectiveWinLen) return;
            addRange(windowSpan[0].orientation, windowSpan[0], windowSpan[windowSpan.length - 1], false);
            return;
        }

        // múltiples ventanas centradas en la zona interna
        const totalSpan = count * effectiveWinLen + (count - 1) * winSep;
        const startWallIndex = Math.floor((M - totalSpan) / 2);

        for (let i = 0; i < count; i++) {
            const winStart = startWallIndex + i * (effectiveWinLen + winSep);
            const windowSpan = inner.slice(winStart, winStart + effectiveWinLen);
            if (windowSpan.length < effectiveWinLen) break;
            // siempre apilamos porque aquí puede haber múltiples rangos
            addRange(windowSpan[0].orientation, windowSpan[0], windowSpan[windowSpan.length - 1], true);
        }
    });
}

/**
 * función principal exportada; llamada una vez se han establecido las
 * interconexiones entre salas de una misma casa. Recibe la lista completa de
 * estructuras de la parcela y los límites del solar (plotX0,etc.).
 */
export function addWindows(rooms, structures, plotX0, plotZ0, plotWidth, plotDepth /* orientation ignored */) {
    // compatibilidad con la firma antigua: si el segundo argumento no es un
    // array asumimos que el primer parámetro era la lista global de
    // `structures` y no se pasó `rooms` por separado.
    if (!Array.isArray(structures)) {
        // reordenar argumentos
        plotDepth = plotWidth;
        plotWidth = plotZ0;
        plotZ0 = plotX0;
        plotX0 = structures;
        structures = rooms;
        // filtre sólo baños y generadores de spawn; antiguamente los pasillos
        // también se excluían porque no había soporte, pero ya no es el caso.
        rooms = structures.filter(s => s.type !== 'spawn' && s.type !== 'banio');
    }

    // ahora `rooms` debe contener sólo las salas de la casa/parcelas; ignorar baños
    const floorCache = new Map();
    rooms.forEach(room => {
        if (room.type === 'banio') return; // doble comprobación defensiva
        const sameFloor = structuresOnFloor(structures, room.floor, floorCache);
        const avail = computeAvailableWallPositions(room, structures, plotX0, plotZ0, plotWidth, plotDepth, sameFloor);
        const walls = groupPositionsIntoWalls(avail);
        assignWindows(room, walls);
        // anotar el tipo de bloque que corresponderá a estas ventanas
        room.windowBlockType = BLOCK_TYPES.WINDOW;
    });
}

// exportamos el valor también por si otros módulos quieren consultarlo
// exportamos los valores por defecto para que otros módulos (por ejemplo
// mapType3.js) puedan basarse en la misma configuración y reflejar cambios
// de elevación/altura sin duplicar constantes.
export const WINDOW_BLOCK_TYPE = BLOCK_TYPES.WINDOW;
export const DEFAULT_WINDOW_LENGTH_VALUE = DEFAULT_WINDOW_LENGTH;
export const DEFAULT_WINDOW_HEIGHT_VALUE = DEFAULT_WINDOW_HEIGHT;
export const DEFAULT_WINDOW_ELEVATION_VALUE = DEFAULT_WINDOW_ELEVATION;

// helper exports for testing/debugging
export { assignWindows };

