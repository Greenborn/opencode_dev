// Utility helpers extracted from mapType3.js for reuse and cleaner code.
// These functions are intentionally kept "dumb" and receive all necessary
// parameters so they can be tested independently.

import { BLOCK_TYPES } from './mapConfig.js';

// pequeño helper usado en varias partes del módulo para saber si dos intervalos
// sobre un eje se solapan.
export function rangesOverlap(a0, a1, b0, b1) {
    return a0 < b1 && b0 < a1;
}


/**
 * ¿Dos estructuras están en la misma planta? Las casas de dos pisos repiten la
 * misma huella en altura, así que todas las comprobaciones de adyacencia (que
 * sólo miran X/Z) tienen que descartar antes las salas de otro nivel: dos
 * cuartos superpuestos en el plano no comparten ninguna pared.
 */
export function sameLevel(a, b) {
    return a.y === b.y;
}

/**
 * Devuelve el intervalo que una escalera prohíbe sobre el eje de una puerta, o
 * null si esa pared no toca la escalera. `axis` es el eje a lo largo del cual
 * corre la puerta ('x' para las paredes norte/sur, 'z' para este/oeste) y
 * `wallCoord` la coordenada de la pared sobre el otro eje.
 */
export function stairKeepOutRange(struct, axis, wallCoord) {
    const ko = struct && struct.stairKeepOut;
    if (!ko) return null;
    if (axis === 'x') {
        if (wallCoord < ko.z0 - 1 || wallCoord > ko.z1) return null;
        return { start: ko.x0, end: ko.x1 };
    }
    if (wallCoord < ko.x0 - 1 || wallCoord > ko.x1) return null;
    return { start: ko.z0, end: ko.z1 };
}

/**
 * Calcula el tramo de puerta dentro del solape [o0,o1) de dos salas: deja un
 * bloque de margen en cada extremo, descarta los intervalos de `keepOuts`
 * (el hueco que ocupa una escalera) y centra la puerta en el trozo libre más
 * ancho que queda. Devuelve {start,width} o null si no queda sitio.
 *
 * Sin keepOuts el resultado es el mismo que el cálculo que había repetido en
 * cada función de conexión: doorWidth = min(4, solape - 2), centrado.
 */
export function computeDoorSpan(o0, o1, keepOuts = [], maxWidth = 4) {
    let segments = [{ start: o0 + 1, end: o1 - 1 }];
    for (const ko of keepOuts) {
        if (!ko) continue;
        const rest = [];
        for (const seg of segments) {
            if (ko.end <= seg.start || ko.start >= seg.end) {
                rest.push(seg);
                continue;
            }
            if (ko.start > seg.start) rest.push({ start: seg.start, end: ko.start });
            if (ko.end < seg.end) rest.push({ start: ko.end, end: seg.end });
        }
        segments = rest;
    }
    let best = null;
    for (const seg of segments) {
        if (seg.end - seg.start <= 0) continue;
        if (!best || (seg.end - seg.start) > (best.end - best.start)) best = seg;
    }
    if (!best) return null;
    const len = best.end - best.start;
    const width = Math.min(maxWidth, len);
    return { start: best.start + Math.floor((len - width) / 2), width };
}

/**
 * Filter out structures that lie outside the terrain bounds.
 */
export function filterStructuresInBounds(structures, width, depth) {
    return structures.filter(s => {
        if (s == null) return false;
        const sx = s.x || 0;
        const sz = s.z || 0;
        const sw = s.width || 0;
        const sd = s.depth || 0;
        return sx >= 0 && sz >= 0 && sx + sw <= width && sz + sd <= depth;
    });
}

/**
 * Remove any window ranges that point to structures in other parcels.
 */
export function cleanWindows(structures) {
    structures.forEach(s => {
        ['North','South','West','East'].forEach(dir => {
            const rangeKey = 'window' + dir + 'Range';
            if (!s[rangeKey]) return;
            const hx = s.x, hz = s.z, hw = s.width, hd = s.depth;
            const neighbor = structures.find(t => {
                if (t === s) return false;
                if (t.parcelId === s.parcelId) return false;
                if (!sameLevel(s, t)) return false;
                if (dir === 'North') return t.z + t.depth === hz && rangesOverlap(s.x, s.x + hw, t.x, t.x + t.width);
                if (dir === 'South') return s.z + hd === t.z && rangesOverlap(s.x, s.x + hw, t.x, t.x + t.width);
                if (dir === 'West')  return t.x + t.width === hx && rangesOverlap(s.z, s.z + hd, t.z, t.z + t.depth);
                if (dir === 'East')  return s.x + hw === t.x && rangesOverlap(s.z, s.z + hd, t.z, t.z + t.depth);
            });
            if (neighbor) delete s[rangeKey];
        });
    });
}

/**
 * Carve doors/air rectangles between adjacent structures and ensure
 * floor texture is painted across the entire opening.
 */
export function carveInteriorConnections(volume, structures, width, depth, volumeHeight, enableInteriorConnections) {
    const needInteriorCarving = enableInteriorConnections ||
        structures.some(s => s.openNorth || s.openSouth || s.openEast || s.openWest);
    if (!needInteriorCarving) return;

    const carveRect = (startX, endX, startZ, endZ, hy, s, t) => {
        const doorHeightStart = hy + 1;
        const doorHeightEnd = hy + 6;
        for (let y = doorHeightStart; y < doorHeightEnd; y++) {
            for (let xx = startX; xx < endX; xx++) {
                for (let zz = startZ; zz < endZ; zz++) {
                    if (xx < 0 || xx >= width || y < 0 || y >= volumeHeight || zz < 0 || zz >= depth) continue;
                    volume.set(xx, y, zz, BLOCK_TYPES.AIR);
                }
            }
        }
        for (let xx = startX; xx < endX; xx++) {
            for (let zz = startZ; zz < endZ; zz++) {
                if (xx < 0 || xx >= width || hy < 0 || hy >= volumeHeight || zz < 0 || zz >= depth) continue;
                const sFloor = (s.floorTexture !== undefined) ? s.floorTexture : BLOCK_TYPES.GRAY;
                const tFloor = (t.floorTexture !== undefined) ? t.floorTexture : BLOCK_TYPES.GRAY;
                const otherFloor = (s.y <= t.y) ? sFloor : tFloor;
                volume.set(xx, hy, zz, otherFloor);
            }
        }
    };

    const hasDoorBetween = (a, b) => {
        if (a.parcelId && b.parcelId && a.parcelId !== b.parcelId) return false;
        if (!sameLevel(a, b)) return false;
        if (a.openNorth && b.openSouth) return true;
        if (a.openSouth && b.openNorth) return true;
        if (a.openEast && b.openWest) return true;
        if (a.openWest && b.openEast) return true;
        return false;
    };

    for (let i = 0; i < structures.length; i++) {
        const s = structures[i];
        if (s.type === 'spawn') continue;
        for (let j = i + 1; j < structures.length; j++) {
            const t = structures[j];
            if (t.type === 'spawn') continue;

            const tryCarve = () => {
                const sx0 = s.x, sx1 = s.x + s.width;
                const sz0 = s.z, sz1 = s.z + s.depth;
                const tx0 = t.x, tx1 = t.x + t.width;
                const tz0 = t.z, tz1 = t.z + t.depth;
                const hy = Math.min(s.y, t.y);

                // vertical wall
                if (sx1 === tx0 || tx1 === sx0) {
                    const overlapZ0 = Math.max(sz0, tz0);
                    const overlapZ1 = Math.min(sz1, tz1);
                    const door = computeDoorSpan(overlapZ0, overlapZ1, [
                        stairKeepOutRange(s, 'z', (sx1 === tx0) ? sx1 - 1 : sx0),
                        stairKeepOutRange(t, 'z', (sx1 === tx0) ? tx0 : tx1 - 1)
                    ]);
                    if (door) {
                        const doorWidth = door.width;
                        const doorZStart = door.start;
                        const wallX1 = (sx1 === tx0) ? sx1 - 1 : tx1 - 1;
                        const wallX2 = (sx1 === tx0) ? tx0 : sx0;
                        const startX = Math.min(wallX1, wallX2);
                        const endX = Math.max(wallX1, wallX2) + 1;
                        carveRect(startX, endX, doorZStart, doorZStart + doorWidth, hy, s, t);
                        if (sx1 === tx0) {
                            s.openEast = true;
                            s.openEastRange = { start: doorZStart, end: doorZStart + doorWidth };
                            t.openWest = true;
                            t.openWestRange = { start: doorZStart, end: doorZStart + doorWidth };
                        } else {
                            t.openEast = true;
                            t.openEastRange = { start: doorZStart, end: doorZStart + doorWidth };
                            s.openWest = true;
                            s.openWestRange = { start: doorZStart, end: doorZStart + doorWidth };
                        }
                    }
                }
                // horizontal wall
                if (sz1 === tz0 || tz1 === sz0) {
                    const overlapX0 = Math.max(sx0, tx0);
                    const overlapX1 = Math.min(sx1, tx1);
                    const door = computeDoorSpan(overlapX0, overlapX1, [
                        stairKeepOutRange(s, 'x', (sz1 === tz0) ? sz1 - 1 : sz0),
                        stairKeepOutRange(t, 'x', (sz1 === tz0) ? tz0 : tz1 - 1)
                    ]);
                    if (door) {
                        const doorWidth = door.width;
                        const doorXStart = door.start;
                        const wallZ1 = (sz1 === tz0) ? sz1 - 1 : tz1 - 1;
                        const wallZ2 = (sz1 === tz0) ? tz0 : sz0;
                        const startZ = Math.min(wallZ1, wallZ2);
                        const endZ = Math.max(wallZ1, wallZ2) + 1;
                        carveRect(doorXStart, doorXStart + doorWidth, startZ, endZ, hy, s, t);
                        if (sz1 === tz0) {
                            s.openSouth = true;
                            s.openSouthRange = { start: doorXStart, end: doorXStart + doorWidth };
                            t.openNorth = true;
                            t.openNorthRange = { start: doorXStart, end: doorXStart + doorWidth };
                        } else {
                            t.openSouth = true;
                            t.openSouthRange = { start: doorXStart, end: doorXStart + doorWidth };
                            s.openNorth = true;
                            s.openNorthRange = { start: doorXStart, end: doorXStart + doorWidth };
                        }
                    }
                }
            };

            if (s.type === 'hallway' || t.type === 'hallway') {
                if (hasDoorBetween(s, t)) tryCarve();
                continue;
            }
            if (!sameLevel(s, t)) continue;
            const combo = [s.type, t.type].sort().join('|');
            if (combo === 'cocina|comedor' || combo === 'comedor|living' || combo === 'cocina|living') {
                tryCarve();
            }
        }
    }
}

/**
 * After structures are drawn, perform final surface and floor adjustments
 * (hallway floors and house footprints).
 */
export function finalizeVolume(volume, surfaceTypeMap, structures, width, depth, volumeHeight) {
    for (const s of structures) {
        if (s.type === 'hallway') {
            for (let x = s.x; x < s.x + s.width; x++) {
                for (let z = s.z; z < s.z + s.depth; z++) {
                    if (x >= 0 && x < width && z >= 0 && z < depth) {
                        if (surfaceTypeMap[x] && surfaceTypeMap[x][z] !== BLOCK_TYPES.ASPHALT) {
                            surfaceTypeMap[x][z] = BLOCK_TYPES.WHITE;
                        }
                    }
                }
            }
        }
    }
    const houseFootprints = {};
    structures.forEach(s => {
        if (s.houseOriginX === undefined) return;
        const key = `${s.houseOriginX},${s.houseOriginZ}`;
        if (!houseFootprints[key]) {
            houseFootprints[key] = {minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, y: s.houseY || 0};
        }
        const fb = houseFootprints[key];
        fb.minX = Math.min(fb.minX, s.x);
        fb.maxX = Math.max(fb.maxX, s.x + s.width);
        fb.minZ = Math.min(fb.minZ, s.z);
        fb.maxZ = Math.max(fb.maxZ, s.z + s.depth);
        if (s.houseY !== undefined) fb.y = s.houseY;
    });
    Object.values(houseFootprints).forEach(fb => {
        fb.x = fb.minX;
        fb.z = fb.minZ;
        fb.width = Math.max(0, fb.maxX - fb.minX);
        fb.depth = Math.max(0, fb.maxZ - fb.minZ);
    });
    for (const h of Object.values(houseFootprints)) {
        const floorY = h.y;
        for (let x = h.x; x < h.x + h.width; x++) {
            for (let z = h.z; z < h.z + h.depth; z++) {
                if (x < 0 || x >= width || z < 0 || z >= depth) continue;
                if (floorY < 0 || floorY >= volumeHeight) continue;
                let floorCell = volume.get(x, floorY, z);
                const isAir = (floorCell === BLOCK_TYPES.AIR) || (floorCell && typeof floorCell === 'object' && floorCell.type === BLOCK_TYPES.AIR);
                if (isAir) {
                    volume.set(x, floorY, z, BLOCK_TYPES.GRAY);
                }
                if (surfaceTypeMap[x] && surfaceTypeMap[x][z] === BLOCK_TYPES.GREEN) {
                    surfaceTypeMap[x][z] = BLOCK_TYPES.GRAY;
                }
            }
        }
    }
}


// generateMapType3 removed; implementation lives in mapType3.js now
