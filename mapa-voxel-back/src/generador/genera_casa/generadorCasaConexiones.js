// This module contains routines that determine how rooms within a parcel
// are connected to one another.  Originally they lived in
// generadorCasa.js but have been moved here for clarity.

import { computeDoorSpan, stairKeepOutRange, sameLevel } from '../mapType3Utils.js';

// -------------------------------------------------------------------------
// apertura de una puerta entre dos salas adyacentes
// -------------------------------------------------------------------------

/**
 * Abre una puerta entre dos salas que comparten pared y marca los flags
 * `open*`/`open*Range` en las dos.  Las cuatro reglas de conexión de este
 * módulo hacían el mismo cálculo duplicado; ahora pasan todas por aquí, que
 * además esquiva el tramo que ocupa una escalera (`stairKeepOut`) y descarta
 * las salas de otra planta, que se superponen en el plano pero no comparten
 * ninguna pared.
 *
 * @returns {boolean} true si quedó abierta una puerta
 */
export function tryLinkRooms(s, t) {
    if (!sameLevel(s, t)) return false;

    const sx0 = s.x, sx1 = s.x + s.width;
    const sz0 = s.z, sz1 = s.z + s.depth;
    const tx0 = t.x, tx1 = t.x + t.width;
    const tz0 = t.z, tz1 = t.z + t.depth;

    // pared vertical (adyacencia en X): la puerta corre a lo largo de Z
    if (sx1 === tx0 || tx1 === sx0) {
        const sWall = (sx1 === tx0) ? sx1 - 1 : sx0;
        const tWall = (sx1 === tx0) ? tx0 : tx1 - 1;
        const door = computeDoorSpan(Math.max(sz0, tz0), Math.min(sz1, tz1), [
            stairKeepOutRange(s, 'z', sWall),
            stairKeepOutRange(t, 'z', tWall)
        ]);
        if (door) {
            const range = { start: door.start, end: door.start + door.width };
            if (sx1 === tx0) {
                s.openEast = true;
                s.openEastRange = range;
                t.openWest = true;
                t.openWestRange = Object.assign({}, range);
            } else {
                s.openWest = true;
                s.openWestRange = range;
                t.openEast = true;
                t.openEastRange = Object.assign({}, range);
            }
            return true;
        }
        return false;
    }

    // pared horizontal (adyacencia en Z): la puerta corre a lo largo de X
    if (sz1 === tz0 || tz1 === sz0) {
        const sWall = (sz1 === tz0) ? sz1 - 1 : sz0;
        const tWall = (sz1 === tz0) ? tz0 : tz1 - 1;
        const door = computeDoorSpan(Math.max(sx0, tx0), Math.min(sx1, tx1), [
            stairKeepOutRange(s, 'x', sWall),
            stairKeepOutRange(t, 'x', tWall)
        ]);
        if (door) {
            const range = { start: door.start, end: door.start + door.width };
            if (sz1 === tz0) {
                s.openSouth = true;
                s.openSouthRange = range;
                t.openNorth = true;
                t.openNorthRange = Object.assign({}, range);
            } else {
                s.openNorth = true;
                s.openNorthRange = range;
                t.openSouth = true;
                t.openSouthRange = Object.assign({}, range);
            }
            return true;
        }
        return false;
    }

    return false;
}

// -------------------------------------------------------------------------
// conexión entre habitaciones y pasillos
// -------------------------------------------------------------------------

export function connectRooms(structures) {
    const len = structures.length;
    for (let i = 0; i < len; i++) {
        const s = structures[i];
        if (s.type !== 'hallway' || !s.parcelId) continue;
        for (let j = i + 1; j < len; j++) {
            const t = structures[j];
            if (t.type !== 'hallway' || s.parcelId !== t.parcelId) continue;
            tryLinkRooms(s, t);
        }
    }
}

// -------------------------------------------------------------------------
// conexiones adicionales entre habitaciones principales y pasillos
// -------------------------------------------------------------------------

export function connectSpecialRoomsToHallways(structures) {
    const special = new Set(['cocina', 'comedor', 'living']);
    const len = structures.length;
    for (let i = 0; i < len; i++) {
        const s = structures[i];
        if (!special.has(s.type) || !s.parcelId) continue;
        for (let j = 0; j < len; j++) {
            if (i === j) continue;
            const t = structures[j];
            if (t.type !== 'hallway' || s.parcelId !== t.parcelId) continue;
            tryLinkRooms(s, t);
        }
    }
}

// -------------------------------------------------------------------------
// conexiones de baños
// -------------------------------------------------------------------------

export function connectBathrooms(structures) {
    const len = structures.length;
    for (let i = 0; i < len; i++) {
        const s = structures[i];
        if (s.type !== 'banio' || !s.parcelId) continue;
        if (s.openNorth || s.openSouth || s.openEast || s.openWest) continue;

        // classify structures by priority
        const halls = [];
        const others = [];
        let mainRoom = null;
        for (let j = 0; j < len; j++) {
            const t = structures[j];
            if (t.parcelId !== s.parcelId || t === s) continue;
            if (!sameLevel(s, t)) continue;
            if (t.type === 'hallway') {
                halls.push(t);
            } else if (t.type !== 'banio') {
                // collect every non-bath non-hall room for later
                others.push(t);
                if (!mainRoom && (t.frontNorth || t.frontSouth || t.frontEast || t.frontWest)) {
                    mainRoom = t;
                }
            }
        }

        const tryList = (list) => {
            for (const t of list) {
                if (tryLinkRooms(s, t)) return true;
            }
            return false;
        };

        // attempt each priority in turn
        if (tryList(halls)) continue;
        if (mainRoom && tryLinkRooms(s, mainRoom)) continue;
        tryList(others);
    }
}

// -------------------------------------------------------------------------
// conexiones de dormitorios y de la caja de escalera
// -------------------------------------------------------------------------

// salas con un único acceso, por prioridad pasillo > sala principal > otra.
// La caja de escalera entra acá porque le alcanza una puerta por planta y
// porque la cadena de respaldo garantiza que la tenga: si se quedara sin
// ninguna, las plantas altas quedarían incomunicadas.
const SINGLE_ACCESS_TYPES = new Set(['dormitorio', 'escalera']);

export function connectBedrooms(structures) {
    const len = structures.length;
    for (let i = 0; i < len; i++) {
        const s = structures[i];
        if (!SINGLE_ACCESS_TYPES.has(s.type) || !s.parcelId) continue;
        if (s.openNorth || s.openSouth || s.openEast || s.openWest) continue;

        const halls = [];
        const others = [];
        let mainRoom = null;
        for (let j = 0; j < len; j++) {
            const t = structures[j];
            if (t.parcelId !== s.parcelId || t === s) continue;
            if (!sameLevel(s, t)) continue;
            if (t.type === 'hallway') {
                halls.push(t);
            } else {
                others.push(t);
                if (!mainRoom && (t.frontNorth || t.frontSouth || t.frontEast || t.frontWest)) {
                    mainRoom = t;
                }
            }
        }

        const abierto = () => s.openNorth || s.openSouth || s.openEast || s.openWest;
        for (const h of halls) {
            if (tryLinkRooms(s, h) && abierto()) break;
        }
        if (abierto()) continue;
        if (mainRoom && tryLinkRooms(s, mainRoom)) continue;

        // Último recurso: hay distribuciones en las que el dormitorio no toca
        // ni un pasillo ni la sala principal (queda detrás del baño, por
        // ejemplo). Antes se quedaba sin ninguna puerta. Se prueba contra las
        // salas adyacentes que ya tengan acceso, para no abrir una puerta a un
        // cuarto que también está incomunicado; el baño va al final para no
        // convertir el paso obligado en "dormitorio -> baño" si hay otra opción.
        const conectadas = others.filter(t =>
            t.openNorth || t.openSouth || t.openEast || t.openWest
        );
        const preferidas = conectadas.filter(t => t.type !== 'banio')
            .concat(conectadas.filter(t => t.type === 'banio'));
        for (const t of preferidas) {
            if (tryLinkRooms(s, t)) break;
        }
        if (abierto()) continue;
        for (const t of others) {
            if (tryLinkRooms(s, t)) break;
        }
    }
}

// -------------------------------------------------------------------------
// puerta hacia el patio trasero (funciones auxiliares)
// -------------------------------------------------------------------------

export function connectBackyardDoor(structures, orientation, parcelId) {
    const priorities = ['comedor', 'living', 'cocina'];

    const score = (room) => {
        switch (orientation) {
            case 'N': return room.z + room.depth;      // más al sur
            case 'S': return -room.z;                  // más al norte
            case 'E': return -room.x;                  // más al oeste
            case 'O': return room.x + room.width;      // más al este
        }
        return 0;
    };

    for (const type of priorities) {
        const candidates = structures.filter(
            s => s.parcelId === parcelId && s.type === type
        );
        if (candidates.length === 0) continue;
        let best = candidates[0];
        let bestScore = score(best);
        for (let k = 1; k < candidates.length; k++) {
            const sc = score(candidates[k]);
            if (sc > bestScore) {
                bestScore = sc;
                best = candidates[k];
            }
        }
        markRearDoor(best, orientation);
        break;
    }
}

function markRearDoor(room, orientation) {
    // always attempt a 4‑block wide opening; the volume generator will
    // clip it if the room is smaller, but our configured room sizes are
    // large enough that this is never an issue.
    const doorWidth = 4;
    let start;
    switch (orientation) {
        case 'N':
            start = room.x + Math.floor((room.width - doorWidth) / 2);
            room.openSouth = true;
            room.rearDoorSide = 'South';
            // do not provide openSouthRange; leaving the range undefined
            // forces mapType3 to use the default doorWidth, which is always
            // 4.  if we gave a range of length 4 the `computeDoor` helper
            // would shrink it to 2 (see issue).  the generator already
            // centres the door using its own calculations when no range is
            // present.
            break;
        case 'S':
            start = room.x + Math.floor((room.width - doorWidth) / 2);
            room.openNorth = true;
            room.rearDoorSide = 'North';
            break;
        case 'E':
            start = room.z + Math.floor((room.depth - doorWidth) / 2);
            room.openWest = true;
            room.rearDoorSide = 'West';
            break;
        case 'O':
            start = room.z + Math.floor((room.depth - doorWidth) / 2);
            room.openEast = true;
            room.rearDoorSide = 'East';
            break;
    }
    // door height is always 6; record for clarity (mapType3 already uses
    // hy+6 internally).
    room.doorHeight = 6;
}
