import { BLOCK_TYPES } from './mapConfig.js';
import { blockZoneSize, veredaWidth, streetWidth, patternSize } from './mapType3Block.js';
import { generateParcel } from './mapType3Parcel.js';
import { determineFront } from './genera_casa/generadorCasa.js';

// Cálculo y posicionamiento de la sala de inicio en el centro de una cuadra.
// Dado el tamaño del mapa y las constantes geométricas, encuentra la
// coordenada "centro" que pertenezca a un interior de cuadra (no en calles o
// veredas), coloca una estructura de tipo `spawn` y devuelve tanto la
// información de la sala como la posición de inicio del jugador.
// El arreglo `structures` se modifica agregando el spawn.

function computeCenter(width, depth, baseY, roomWidth, roomHeight, roomDepth, structures) {
    let centerX = Math.floor(width / 2);
    let centerZ = Math.floor(depth / 2);

    function nearestBlockCoord(coord, limit) {
        for (let offset = 0; offset <= limit; offset++) {
            for (const sign of [0, 1, -1]) {
                const c = sign === 0 ? coord : coord + sign * offset;
                if (c >= 0 && c < limit) {
                    const pos = c % patternSize;
                    if (pos >= veredaWidth && pos < (blockZoneSize - veredaWidth)) return c;
                }
            }
        }
        return Math.min(Math.max(coord, 0), limit - 1);
    }

    centerX = nearestBlockCoord(centerX, width);
    centerZ = nearestBlockCoord(centerZ, depth);

    const blockStartX = Math.floor(centerX / patternSize) * patternSize;
    const blockStartZ = Math.floor(centerZ / patternSize) * patternSize;

    const interiorSize = blockZoneSize - 2 * veredaWidth;
    let roomX = blockStartX + veredaWidth + Math.floor((interiorSize - roomWidth) / 2);
    let roomZ = blockStartZ + veredaWidth + Math.floor((interiorSize - roomDepth) / 2);
    // spawn/room vertical position should match the terrain height as well.
    // baseY represents the first air layer; the top solid block is at
    // baseY-1, but callers expect the room coordinate to align with the
    // structure generation code which uses the same convention.  dropping the
    // previous +1 keeps the player from spawning one block above ground.
    const roomY = baseY;
    // clamp dentro del mapa si los cálculos anteriores exceden
    roomX = Math.max(0, Math.min(roomX, width - roomWidth));
    roomZ = Math.max(0, Math.min(roomZ, depth - roomDepth));

    // Note: we no longer add a `spawn` structure or carve a dedicated room
    // around the starting point. The player will simply spawn at the computed
    // coordinates, which remain at the center of a valid block interior.
    const startPosition = {
        x: roomX + Math.floor(roomWidth / 2),
        y: roomY + 3,
        z: roomZ + Math.floor(roomDepth / 2)
    };
    // return null for `room` so callers know not to create any special geometry
    return { startPosition, room: null };
}

// Realiza la subdivisión interna de una cuadra (parcelas + casas). Este código
// originalmente vivía dentro de mapType3Block.processBlock pero conceptualmente
// forma parte del "centro"; por eso fue movido aquí. Modifica los mapas y
// agrega estructuras de casa en `structures`.
function processInterior(blockStartX, blockStartZ, width, depth, baseY, heightMap, surfaceTypeMap, structures, roomWidth, roomHeight, zonas) {
    const interiorStartX = blockStartX + veredaWidth;
    // roomWidth is currently unused but passed for future flexibility.
    const interiorStartZ = blockStartZ + veredaWidth;
    const interiorDim = blockZoneSize - 2 * veredaWidth; // 176 - 32 = 144
    const plotWidth = interiorDim / 4;   // 144 / 4 = 36
    const plotDepth = interiorDim / 2;   // 144 / 2 = 72
    const plotsX = Math.floor(interiorDim / plotWidth);
    const plotsZ = Math.floor(interiorDim / plotDepth);

    for (let px = 0; px < plotsX; px++) {
        for (let pz = 0; pz < plotsZ; pz++) {
            const plotX0 = interiorStartX + px * plotWidth;
            const plotZ0 = interiorStartZ + pz * plotDepth;

            // líneas horizontales (bordes superior e inferior)
            for (let i = 0; i < plotWidth; i++) {
                const x = plotX0 + i;
                const zTop = plotZ0;
                const zBottom = plotZ0 + plotDepth - 1;
                if (x >= 0 && x < width) {
                    if (zTop >= 0 && zTop < depth) {
                        if (surfaceTypeMap[x][zTop] !== BLOCK_TYPES.ASPHALT) surfaceTypeMap[x][zTop] = BLOCK_TYPES.BRICK;
                    }
                    if (zBottom >= 0 && zBottom < depth) {
                        if (surfaceTypeMap[x][zBottom] !== BLOCK_TYPES.ASPHALT) surfaceTypeMap[x][zBottom] = BLOCK_TYPES.BRICK;
                    }
                }
            }

            // líneas verticales (bordes izquierdo y derecho)
            for (let j = 0; j < plotDepth; j++) {
                const z = plotZ0 + j;
                const xLeft = plotX0;
                const xRight = plotX0 + plotWidth - 1;
                if (z >= 0 && z < depth) {
                    if (xLeft >= 0 && xLeft < width) {
                        if (surfaceTypeMap[xLeft][z] !== BLOCK_TYPES.ASPHALT) surfaceTypeMap[xLeft][z] = BLOCK_TYPES.BRICK;
                    }
                    if (xRight >= 0 && xRight < width) {
                        if (surfaceTypeMap[xRight][z] !== BLOCK_TYPES.ASPHALT) surfaceTypeMap[xRight][z] = BLOCK_TYPES.BRICK;
                    }
                }
            }

            // --- determinar orientación del frente ---
            // ahora delegamos la lógica a la función reutilizable. el valor
            // devuelto es una letra N/S/E/O o null si la parcela está rodeada.
            const orientation = determineFront(px, pz, plotsX, plotsZ);

            // delegar generación de parcela al módulo especializado
            generateParcel(plotX0, plotZ0, plotWidth, plotDepth, width, depth, baseY,
                           surfaceTypeMap, structures,
                           orientation, roomHeight);

            // zona de control (modo equipos): la parcela completa, tal como
            // quedó delimitada arriba. Se guarda acá y no se descarta porque
            // es la única vez que estos límites están a mano (ver
            // plan_zonas_control.md).
            if (zonas) {
                zonas.push({
                    id: `${blockStartX}_${blockStartZ}:parcela:${px}_${pz}`,
                    tipo: 'parcela',
                    x0: plotX0, z0: plotZ0,
                    x1: plotX0 + plotWidth, z1: plotZ0 + plotDepth
                });
            }
            continue; // resto del código original queda aquí para referencia pero no se ejecuta
        }
    }
}

export { computeCenter, processInterior };