import { WORLD_CONFIG, BLOCK_TYPES, generateMapPNGs } from './mapConfig.js';
import { VolumeBuffer, computeColumnHeights } from './volumeBuffer.js';
import { excavarRefugios } from './excavar_refugios.js';
import { blockZoneSize, veredaWidth, patternSize, processBlock, TIPOS_SIN_LUZ_INTERIOR } from './mapType3Block.js';
import { computeCenter } from './mapType3Center.js';
import { addWindows,
         DEFAULT_WINDOW_HEIGHT_VALUE as DEFAULT_WINDOW_HEIGHT,
         DEFAULT_WINDOW_ELEVATION_VALUE as DEFAULT_WINDOW_ELEVATION } from './genera_casa/generadorCasaVentanas.js';
import { filterStructuresInBounds, cleanWindows, carveInteriorConnections, finalizeVolume, rangesOverlap, sameLevel } from './mapType3Utils.js';
import { carveStairs, buildRoofParapets, buildRoofExtras } from './genera_casa/generadorCasaPisos.js';
import { pintarCarteles } from './cartel_tienda.js';


// toggle para habilitar/deshabilitar la creación automática de puertas
// entre salas adyacentes. Al desactivarlo las habitaciones permanecen
// separadas; la posibilidad queda para el futuro.
const ENABLE_INTERIOR_CONNECTIONS = false;

// Generador de mapa tipo 3: ENTAMADO de cuadras y calles.
// (modularizado) la lógica de cada cuadra se extrajo a mapType3Block.js; el archivo
// principal trazará calles y cuadras y delegará veredas, parterres y parcelas a
// dicho módulo.
// - Cuadras: zonas cuadradas de 176x176 bloques, al nivel del suelo (superficie)
// - Calles: franjas de 10 bloques de ancho que cruzan las cuadras; la superficie de la calle queda 1 bloque por debajo de la cuadras
// - En el interior de cada cuadra se subdivide en terrenos y para cada terreno se coloca
//   una casa. Las casas ya no son una única sala central sino un conjunto de dormitorios
//   (cocina, comedor, living, dormitorios, baños).
//   * La anchura de la casa se asegura al menos 30 bloques para permitir dos estancias
//     de 15 de ancho al frente.
//   * Los dormitorios se ubican en dos columnas (dos dormitorios lado a lado) separadas
//     por un **pasillo central de 4 bloques de ancho**. El código calcula primero el ancho
//     disponible para habitaciones, reparte ese ancho en dos columnas y coloca el pasillo
//     en el centro.
//   * Los dormitorios se colocan uno tras otro en profundidad; si por restricciones de
//     tamaño no pueden alinearse perfectamente, el pasillo asegura la conexión interna.
//   * Se respetan los límites del terreno: si una habitación no cabe se omite.
//   Se generan ventanas y puertas de acuerdo a la orientación y reglas probabilísticas.
function generateMapType3(width, depth, volumeHeight) {
    const heightMap = [];
    const maxHeightMap = [];
    const structures = [];

    // constantes de cuadras y veredas importadas desde mapType3Block.js
    const baseY = Math.floor(volumeHeight / 2); // nivel base (topmost solid block para cuadras)

    // Inicializar heightMap, maxHeightMap y surfaceTypeMap con el patrón cuadras/calles/veredas
    const surfaceTypeMap = [];
    for (let x = 0; x < width; x++) {
        heightMap[x] = [];
        maxHeightMap[x] = [];
        surfaceTypeMap[x] = [];
        for (let z = 0; z < depth; z++) {
            const inStreetX = (x % patternSize) >= blockZoneSize;
            const inStreetZ = (z % patternSize) >= blockZoneSize;
            const isStreet = inStreetX || inStreetZ;

            // heightMap almacena la "altura de superficie" como la primera capa de aire (convención usada por el cliente)
            // - cuadras y veredas: topmost solid = baseY + 1
            // - calles: topmost solid = baseY
            const heightValue = isStreet ? baseY : (baseY + 1);
            heightMap[x][z] = heightValue;
            maxHeightMap[x][z] = heightValue;

            // Determinar el tipo de bloque de superficie para esta celda
            if (isStreet) {
                surfaceTypeMap[x][z] = BLOCK_TYPES.ASPHALT;
            } else {
                // Dentro de una cuadra: comprobar si corresponde a la franja de vereda
                const posInBlockX = x % patternSize;
                const posInBlockZ = z % patternSize;
                const isSidewalk = (posInBlockX < veredaWidth || posInBlockX >= (blockZoneSize - veredaWidth)) ||
                                   (posInBlockZ < veredaWidth || posInBlockZ >= (blockZoneSize - veredaWidth));
                surfaceTypeMap[x][z] = isSidewalk ? BLOCK_TYPES.VEREDA : BLOCK_TYPES.GREEN;
            }
        }
    }

    // dimensiones de la sala inicial y de las casas (altura de casa igual a sala)
    const roomWidth = 12;
    const roomHeight = 12;
    const roomDepth = 12;

    const entities = [];
    // zonas de control del modo equipos (parcelas, veredas, calles y parques);
    // ver plan_zonas_control.md. Son geometría estática: se calculan una sola
    // vez acá y viajan con el resto del mapa.
    const zonas = [];

    // cada cuadra delegada a módulo separado (implementado en mapType3Block.js)
    for (let blockStartX = 0; blockStartX < width; blockStartX += patternSize) {
        for (let blockStartZ = 0; blockStartZ < depth; blockStartZ += patternSize) {
            processBlock(blockStartX, blockStartZ, width, depth, baseY, heightMap, maxHeightMap, surfaceTypeMap, structures, entities, zonas);
        }
    }

    // *** regenerar ventanas ahora que todas las parcelas existen ***
    // primero calcular tamaño de parcela constante usando las mismas constantes
    // que el módulo de cuadras.  esto coincide con los cálculos en
    // mapType3Center.processInterior.
    const interiorDim = blockZoneSize - 2 * veredaWidth;
    const plotWidth = interiorDim / 4;
    const plotDepth = interiorDim / 2;

    // limpiamos cualquier rango anterior y volvemos a llamar a addWindows para
    // cada parcela usando los límites codificados en el parcelId.
    structures.forEach(s => {
        delete s.windowNorthRange;
        delete s.windowSouthRange;
        delete s.windowWestRange;
        delete s.windowEastRange;
    });
    // la clave agrupa por parcela *y* planta: las casas de dos pisos repiten la
    // misma huella, así que si se mezclaran las dos plantas en una sola lista
    // cada sala taparía la pared de su gemela y no saldría ninguna ventana.
    const parcels = Object.create(null);
    structures.forEach(s => {
        if (s.parcelId != null) {
            const key = `${s.parcelId}|${s.floor || 0}`;
            const list = parcels[key] || (parcels[key] = []);
            // bathrooms should never get windows, so don't include them in the
            // list passed to addWindows later.  hallways *are* eligible: once
            // they were excluded here the recalculation step effectively
            // wiped out any openings created during house generation.  the
            // user has requested that pasillos also receive windows, so we
            // allow them now.
            if (s.type !== 'spawn' && s.type !== 'banio')
                list.push(s);
        }
    });
    Object.keys(parcels).forEach(key => {
        const [px, pz] = key.split('|')[0].split('_').map(Number);
        addWindows(parcels[key], structures, px, pz, plotWidth, plotDepth);
    });

    // antes de devolver los datos limpiamos cualquier marca de ventana que
    // apunte a una estructura de otra parcela (se generaron inicialmente en
    // `generadorCasa`). Esto permite que scripts que sólo llamen a
    // `generateMapType3` no vean ventanas inválidas.
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

    // calcular y obtener la posición de inicio; la sala ya no se genera
    // ni se agrega a `structures`.
    const { startPosition, room } = computeCenter(width, depth, baseY, roomWidth, roomHeight, roomDepth, structures);

    // pasillos deshabilitados; no se agrega ninguno por defecto
    // if (!structures.some(s => s.type === 'hallway')) {
    //     const cx = Math.max(0, Math.min(width - 4, Math.floor(width/2) - 2));
    //     // hallway floor should sit at the same level as terrain
    //     const hy = baseY;
    //     const fallback = {
    //         type: 'hallway', x: cx, y: hy, z: 0,
    //         width: 4, depth: depth,
    //         floorTexture: BLOCK_TYPES.WHITE,
    //         ceilingTexture: BLOCK_TYPES.WHITE,
    //         wallTexture: BLOCK_TYPES.BRICK,
    //         tintColor: 0xFFFFFF,
    //         tintOpacity: 0.5
    //     };
    //     structures.push(fallback);
    // }


    return { heightMap, maxHeightMap, structures, startPosition, room, surfaceTypeMap, entities, zonas };
}

// Generar volume para tipo 3 respetando heightMap (cuadras vs calles)
function generateVolumeType3(width, depth, volumeHeight, heightMap, startPosition, room, surfaceTypeMap, structures=[], zonasEspeciales=null, refugios=[]) {
    // filter structures to ensure they lie within terrain bounds
    if (structures && structures.length) {
        structures = filterStructuresInBounds(structures, width, depth);
    }
    // VolumeBuffer reserva, por columna (x,z), sólo la altura que esa columna
    // necesita en la práctica (suelo + el edificio más alto que la cubra) en
    // vez de `volumeHeight` fijo para las ~1.000.000 de columnas del mapa.
    // BLOCK_TYPES.AIR = 0 coincide con el valor inicial del Uint8Array, por lo que
    // no hace falta inicializar explícitamente las celdas de aire.
    const colHeights = computeColumnHeights(width, depth, volumeHeight, heightMap, room, structures);
    const volume = new VolumeBuffer(width, volumeHeight, depth, colHeights);

    // Determinar la altura de calle (superficie más baja) para asignar textura negra/asfalto
    let minSurfaceHeight = Infinity;
    for (let ix = 0; ix < width; ix++) {
        for (let iz = 0; iz < depth; iz++) {
            if (heightMap[ix] && typeof heightMap[ix][iz] === 'number') {
                minSurfaceHeight = Math.min(minSurfaceHeight, heightMap[ix][iz]);
            }
        }
    }

    // Solo iterar celdas no-AIR (las celdas AIR ya están a 0 por defecto)
    for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
            const surface = heightMap[x][z]; // primera capa de aire => nivel de superficie
            for (let y = 0; y < surface; y++) {
                if (y === surface - 1) {
                    // Capa superficial
                    if (surfaceTypeMap && surfaceTypeMap[x] && typeof surfaceTypeMap[x][z] !== 'undefined') {
                        volume.set(x, y, z, surfaceTypeMap[x][z]);
                    } else {
                        volume.set(x, y, z, (surface === minSurfaceHeight) ? BLOCK_TYPES.ASPHALT : BLOCK_TYPES.GRAY);
                    }
                } else {
                    volume.set(x, y, z, BLOCK_TYPES.BROWN); // subsuelo
                }
            }
        }
    }

    // realizar limpieza de ventanas en estructuras antes de devolver datos
    cleanWindows(structures);

    // Si no se devolvió ninguna sala (nueva lógica) omitir este paso.
    if (room) {
        // Aplicar sala inicial (sobrescribe el terreno)
        const { x: roomX, y: roomY, z: roomZ, width: roomWidth, height: roomHeight, depth: roomDepth } = room;

        for (let x = roomX; x < roomX + roomWidth; x++) {
            for (let z = roomZ; z < roomZ + roomDepth; z++) {
                for (let y = roomY; y < roomY + roomHeight; y++) {
                    // bounds guard
                    if (x < 0 || x >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) continue;
                    if (x === roomX || x === roomX + roomWidth - 1 || z === roomZ || z === roomZ + roomDepth - 1) {
                        // Paredes
                        volume.set(x, y, z, BLOCK_TYPES.BRICK);
                    } else if (y === roomY + roomHeight - 1) {
                        // Techo
                        volume.set(x, y, z, BLOCK_TYPES.WHITE);
                    } else if (y === roomY) {
                        // Piso de la sala
                        volume.set(x, y, z, BLOCK_TYPES.GRAY);
                    } else {
                        // Interior aire
                        volume.set(x, y, z, BLOCK_TYPES.AIR);
                    }
                }
            }
        }

        // Crear abertura en la pared este de la sala (igual comportamiento que antes)
        const openingYStart = roomY + 1;
        const openingYEnd = roomY + 6; // 6 bloques de alto
        const openingZCenter = Math.floor((roomZ + roomZ + roomDepth) / 2); // Centro en Z
        const openingZStart = openingZCenter - 1; // 4 bloques de ancho: -1, 0, 1, 2
        const openingZEnd = openingZCenter + 2;
        for (let y = openingYStart; y <= openingYEnd; y++) {
            for (let z = openingZStart; z <= openingZEnd; z++) {
                volume.set(roomX + roomWidth - 1, y, z, BLOCK_TYPES.AIR);
            }
        }
    }


    // Dibujar las estructuras de tipo casa, pasillo, sala simple o cualquiera
    // de los nuevos tipos (banio, cocina, etc.). Los `spawn` se ignoran.
    for (const s of structures) {
        if (s.type === 'spawn') continue;
        // sólo dibujamos si la estructura tiene dimensiones válidas
        const { x: hx, y: hy, z: hz, width: hw, height: hh, depth: hd } = s;
        if (hw == null || hh == null || hd == null) continue;
        // obtener texturas específicas si las tiene la estructura (salas diversas)
        const wallTex = (s.wallTexture !== undefined) ? s.wallTexture : BLOCK_TYPES.BRICK;
        const floorTex = (s.floorTexture !== undefined) ? s.floorTexture : BLOCK_TYPES.GRAY;
        const ceilingTex = (s.ceilingTexture !== undefined) ? s.ceilingTexture : BLOCK_TYPES.WHITE;
        // helper para asignar valor con posible tintado.  el parámetro
        // `isWall` indica que el bloque corresponde a una pared exterior; sólo
        // entonces se deberán aplicar cualquiera de los tintados que tenga la
        // estructura.  los pisos y techos permanecen sin colorear.
        const assign = (x, y, z, type, isWall = false) => {
            if (x < 0 || x >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) return;
            // sólo aplicamos tinte si el bloque es pared y la estructura define
            // algún tinte (render o minimapa).  legacy tintColor se considera
            // también minimap, pero siempre ligado a paredes.
            if (isWall && (s.tintRender != null || s.tintMinimap != null || s.tintColor != null)) {
                const cell = { type };
                if (s.tintRender != null) {
                    cell.tintRender = { color: s.tintRender, opacity: (s.tintOpacity != null ? s.tintOpacity : 0.5) };
                }
                if (s.tintMinimap != null) {
                    cell.tintMinimap = { color: s.tintMinimap, opacity: (s.tintMinimapOpacity != null ? s.tintMinimapOpacity : (s.tintOpacity != null ? s.tintOpacity : 0.5)) };
                } else if (s.tintColor != null) {
                    cell.tintMinimap = { color: s.tintColor, opacity: (s.tintOpacity != null ? s.tintOpacity : 0.5) };
                }
                volume.set(x, y, z, cell);
            } else {
                volume.set(x, y, z, type);
            }
        };
        // paredes, techo y piso básicos
        for (let x = hx; x < hx + hw; x++) {
            for (let z = hz; z < hz + hd; z++) {
                for (let y = hy; y < hy + hh; y++) {
                    if (x < 0 || x >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) continue;
                    if (x === hx || x === hx + hw - 1 || z === hz || z === hz + hd - 1) {
                        assign(x,y,z,wallTex, true);
                    } else if (y === hy + hh - 1) {
                        assign(x,y,z,ceilingTex, false);
                    } else if (y === hy) {
                        assign(x,y,z,floorTex, false);
                    } else {
                        volume.set(x, y, z, BLOCK_TYPES.AIR);
                    }
                }
            }
        }

        // si es una sala simple no dibujamos puertas o ventanas (pero sí los
        // pasillos; las aberturas hacia los pasillos se manejarán más abajo).
        if (s.type === 'room') continue;

        // dimensiones para puertas y ventanas.
        const doorHeightStart = hy + 1;
        const doorHeightEnd = hy + 6; // 6 bloques de alto igual que sala inicial
        const doorWidth = Math.min(4, hw - 2);
        const doorXStart = hx + Math.floor((hw - doorWidth) / 2);
        const doorZStart = hz + Math.floor((hd - doorWidth) / 2);

        // ventanas definidas por parámetros reutilizables.  la elevación y la
        // altura ya vienen controladas por DEFAULT_WINDOW_ELEVATION/HEIGHT, que
        // permiten mantener la compensación pedida por el usuario (inicio a dos
        // bloques del suelo y altura reducida en uno).
        const windowHeight = DEFAULT_WINDOW_HEIGHT;
        const windowYStart = hy + DEFAULT_WINDOW_ELEVATION;
        const windowYEnd = windowYStart + windowHeight - 1;  // se mantiene la misma lógica de rango

        const defaultWindowWidthX = Math.min(5, hw - 2);
        const defaultWindowWidthZ = Math.min(5, hd - 2);
        const windowXStart = hx + Math.floor((hw - defaultWindowWidthX) / 2);
        const windowZStart = hz + Math.floor((hd - defaultWindowWidthZ) / 2);

        // helper para vaciar un rectángulo en un lado fijo (X varía)
        const carveWallZ = (sideZ, startY, endY) => {
            for (let y = startY; y <= endY && y < hy + hh; y++) {
                for (let x = windowXStart; x < windowXStart + windowWidth; x++) {
                    if (x < 0 || x >= width || y < 0 || y >= volumeHeight || sideZ < 0 || sideZ >= depth) continue;
                    volume.set(x, y, sideZ, BLOCK_TYPES.AIR);
                }
            }
        };
        const carveWallX = (sideX, startY, endY) => {
            for (let y = startY; y <= endY && y < hy + hh; y++) {
                for (let z = windowZStart; z < windowZStart + windowWidth; z++) {
                    if (sideX < 0 || sideX >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) continue;
                    volume.set(sideX, y, z, BLOCK_TYPES.AIR);
                }
            }
        };

        // puerta de entrada sólo si corresponde
        if (s.hasFrontDoor) {
            if (s.frontNorth) {
                const zFront = hz;
                for (let y = doorHeightStart; y < doorHeightEnd && y < hy + hh; y++) {
                    for (let x = doorXStart; x < doorXStart + doorWidth; x++) {
                        if (x < 0 || x >= width || y < 0 || y >= volumeHeight || zFront < 0 || zFront >= depth) continue;
                        volume.set(x, y, zFront, BLOCK_TYPES.AIR);
                    }
                }
                for (let x = doorXStart; x < doorXStart + doorWidth; x++) {
                    if (x >= 0 && x < width && zFront >= 0 && zFront < depth) {
                        volume.set(x, hy, zFront, floorTex);
                    }
                }
            } else if (s.frontSouth) {
                const zFront = hz + hd - 1;
                for (let y = doorHeightStart; y < doorHeightEnd && y < hy + hh; y++) {
                    for (let x = doorXStart; x < doorXStart + doorWidth; x++) {
                        if (x < 0 || x >= width || y < 0 || y >= volumeHeight || zFront < 0 || zFront >= depth) continue;
                        volume.set(x, y, zFront, BLOCK_TYPES.AIR);
                    }
                }
                for (let x = doorXStart; x < doorXStart + doorWidth; x++) {
                    if (x >= 0 && x < width && zFront >= 0 && zFront < depth) {
                        volume.set(x, hy, zFront, floorTex);
                    }
                }
            } else if (s.frontWest) {
                const xFront = hx;
                for (let y = doorHeightStart; y < doorHeightEnd && y < hy + hh; y++) {
                    for (let z = doorZStart; z < doorZStart + doorWidth; z++) {
                        if (xFront < 0 || xFront >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) continue;
                        volume.set(xFront, y, z, BLOCK_TYPES.AIR);
                    }
                }
                for (let z = doorZStart; z < doorZStart + doorWidth; z++) {
                    if (xFront >= 0 && xFront < width && z >= 0 && z < depth) {
                        volume.set(xFront, hy, z, floorTex);
                    }
                }
            } else if (s.frontEast) {
                const xFront = hx + hw - 1;
                for (let y = doorHeightStart; y < doorHeightEnd && y < hy + hh; y++) {
                    for (let z = doorZStart; z < doorZStart + doorWidth; z++) {
                        if (xFront < 0 || xFront >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) continue;
                        volume.set(xFront, y, z, BLOCK_TYPES.AIR);
                    }
                }
                for (let z = doorZStart; z < doorZStart + doorWidth; z++) {
                    if (xFront >= 0 && xFront < width && z >= 0 && z < depth) {
                        volume.set(xFront, hy, z, floorTex);
                    }
                }
            }
        }
        // abrir muro interior si se ha generado una conexión de baño
        // helper para calcular inicio y anchura en base al overlapRange si existe
        const computeDoor = (range, defaultStart, defaultWidth) => {
            if (range && range.end > range.start + 2) {
                const overlapLen = range.end - range.start;
                const dw = Math.min(defaultWidth, overlapLen - 2);
                const start = range.start + Math.floor((overlapLen - dw) / 2);
                return { start, width: dw };
            }
            return { start: defaultStart, width: defaultWidth };
        };

        if (s.openNorth) {
            const zWall = hz;
            const { start: xStart, width: wlen } = computeDoor(s.openNorthRange, doorXStart, doorWidth);
            for (let y = doorHeightStart; y < doorHeightEnd && y < hy + hh; y++) {
                for (let x = xStart; x < xStart + wlen; x++) {
                    if (x < 0 || x >= width || y < 0 || y >= volumeHeight || zWall < 0 || zWall >= depth) continue;
                    volume.set(x, y, zWall, BLOCK_TYPES.AIR);
                }
            }
            for (let x = xStart; x < xStart + wlen; x++) {
                if (x >= 0 && x < width && zWall >= 0 && zWall < depth) {
                    volume.set(x, hy, zWall, floorTex);
                }
                const otherZ = zWall - 1;
                if (x >= 0 && x < width && otherZ >= 0 && otherZ < depth) {
                    volume.set(x, hy, otherZ, floorTex);
                }
            }
        }
        if (s.openSouth) {
            const zWall = hz + hd - 1;
            const { start: xStart, width: wlen } = computeDoor(s.openSouthRange, doorXStart, doorWidth);
            for (let y = doorHeightStart; y < doorHeightEnd && y < hy + hh; y++) {
                for (let x = xStart; x < xStart + wlen; x++) {
                    if (x < 0 || x >= width || y < 0 || y >= volumeHeight || zWall < 0 || zWall >= depth) continue;
                    volume.set(x, y, zWall, BLOCK_TYPES.AIR);
                }
            }
            for (let x = xStart; x < xStart + wlen; x++) {
                if (x >= 0 && x < width && zWall >= 0 && zWall < depth) {
                    volume.set(x, hy, zWall, floorTex);
                }
                const otherZ = zWall + 1;
                if (x >= 0 && x < width && otherZ >= 0 && otherZ < depth) {
                    volume.set(x, hy, otherZ, floorTex);
                }
            }
        }
        if (s.openWest) {
            const xWall = hx;
            const { start: zStart, width: wlen } = computeDoor(s.openWestRange, doorZStart, doorWidth);
            for (let y = doorHeightStart; y < doorHeightEnd && y < hy + hh; y++) {
                for (let z = zStart; z < zStart + wlen; z++) {
                    if (xWall < 0 || xWall >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) continue;
                    volume.set(xWall, y, z, BLOCK_TYPES.AIR);
                }
            }
            for (let z = zStart; z < zStart + wlen; z++) {
                if (xWall >= 0 && xWall < width && z >= 0 && z < depth) {
                    volume.set(xWall, hy, z, floorTex);
                }
                const otherX = xWall - 1;
                if (otherX >= 0 && otherX < width && z >= 0 && z < depth) {
                    volume.set(otherX, hy, z, floorTex);
                }
            }
        }
        if (s.openEast) {
            const xWall = hx + hw - 1;
            const { start: zStart, width: wlen } = computeDoor(s.openEastRange, doorZStart, doorWidth);
            for (let y = doorHeightStart; y < doorHeightEnd && y < hy + hh; y++) {
                for (let z = zStart; z < zStart + wlen; z++) {
                    if (xWall < 0 || xWall >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) continue;
                    volume.set(xWall, y, z, BLOCK_TYPES.AIR);
                }
            }
            for (let z = zStart; z < zStart + wlen; z++) {
                if (xWall >= 0 && xWall < width && z >= 0 && z < depth) {
                    volume.set(xWall, hy, z, floorTex);
                }
                const otherX = xWall + 1;
                if (otherX >= 0 && otherX < width && z >= 0 && z < depth) {
                    volume.set(otherX, hy, z, floorTex);
                }
            }
        }

        // helper para comprobar si, para una estructura `s`, una cara dada
        // tiene adyacencia a una sala de otra parcela (bloqueante).
        const sideHasOtherParcel = (side) => {
            return structures.some(t => {
                if (t === s) return false;
                if (t.parcelId === s.parcelId) return false;
                if (!sameLevel(s, t)) return false;
                if (side === 'north') {
                    return t.z + t.depth === hz && rangesOverlap(s.x, s.x + hw, t.x, t.x + t.width);
                }
                if (side === 'south') {
                    return s.z + hd === t.z && rangesOverlap(s.x, s.x + hw, t.x, t.x + t.width);
                }
                if (side === 'west') {
                    return t.x + t.width === hx && rangesOverlap(s.z, s.z + hd, t.z, t.z + t.depth);
                }
                if (side === 'east') {
                    return s.x + hw === t.x && rangesOverlap(s.z, s.z + hd, t.z, t.z + t.depth);
                }
            });
        };

        const carveWindowZ = (sideZ, startX, wlen) => {
            for (let y = windowYStart; y <= windowYEnd && y < hy + hh; y++) {
                for (let x = startX; x < startX + wlen; x++) {
                    if (x < 0 || x >= width || y < 0 || y >= volumeHeight || sideZ < 0 || sideZ >= depth) continue;
                    if (volume.getType(x, y, sideZ) === BLOCK_TYPES.AIR) continue;
                    volume.set(x, y, sideZ, BLOCK_TYPES.WINDOW);
                }
            }
        };
        const carveWindowX = (sideX, startZ, wlen) => {
            for (let y = windowYStart; y <= windowYEnd && y < hy + hh; y++) {
                for (let z = startZ; z < startZ + wlen; z++) {
                    if (sideX < 0 || sideX >= width || y < 0 || y >= volumeHeight || z < 0 || z >= depth) continue;
                    if (volume.getType(sideX, y, z) === BLOCK_TYPES.AIR) continue;
                    volume.set(sideX, y, z, BLOCK_TYPES.WINDOW);
                }
            }
        };

        // Helper para procesar uno o varios rangos de ventana en una cara.
        // Los rangos ya contienen la posición y anchura exactas calculadas por
        // assignWindows, así que los usamos directamente en lugar de pasar por
        // computeDoor (que está pensado para puertas interiores y recorta el
        // rango dos bloques, lo que provocaba que ventanas de ancho exactamente
        // igual a DEFAULT_WINDOW_LENGTH fueran ignoradas).
        const carveSide = (sideName, ranges, coord, carveFn) => {
            if (!ranges) return;
            if (!Array.isArray(ranges)) ranges = [ranges];
            ranges.forEach(range => {
                const start = range.start;
                const wlen = range.end - range.start;
                if (!(sideHasOtherParcel(sideName) && !s['front' + sideName[0].toUpperCase() + sideName.slice(1)])) {
                    carveFn(coord, start, wlen);
                }
            });
        };

        // norte (skip bathrooms entirely)
        if (s.type !== 'banio' && (s.hasFrontWindow || s.windowNorthRange)) {
            carveSide('north', s.windowNorthRange, hz, (c, st, wl) => carveWindowZ(c, st, wl));
        }
        // sur
        if (s.type !== 'banio' && (s.hasBackWindow || s.windowSouthRange)) {
            carveSide('south', s.windowSouthRange, hz + hd - 1, (c, st, wl) => carveWindowZ(c, st, wl));
        }
        // oeste
        if (s.type !== 'banio' && s.windowWestRange) {
            carveSide('west', s.windowWestRange, hx, (c, st, wl) => carveWindowX(c, st, wl));
        }
        // este
        if (s.type !== 'banio' && s.windowEastRange) {
            carveSide('east', s.windowEastRange, hx + hw - 1, (c, st, wl) => carveWindowX(c, st, wl));
        }
    }

    // interconexiones obligatorias (puertas) entre ciertas salas.
    // La lógica se ha factorizado en carveInteriorConnections para mantener
    // generateVolumeType3 más legible.
    carveInteriorConnections(volume, structures, width, depth, volumeHeight, ENABLE_INTERIOR_CONNECTIONS);
    // las escaleras van al final: sus escalones y la caja de escalera manda
    // sobre cualquier piso, techo o puerta que se haya dibujado antes.
    carveStairs(volume, structures, width, depth, volumeHeight);
    // el antepecho va después de las escaleras: es un anillo sobre la cubierta
    // y no toca el hueco por donde la escalera sale al techo.
    buildRoofParapets(volume, structures, width, depth, volumeHeight);
    // casillas de escalera y tanques de agua, sobre la cubierta ya terminada
    buildRoofExtras(volume, structures, width, depth, volumeHeight);
    finalizeVolume(volume, surfaceTypeMap, structures, width, depth, volumeHeight);
    // cartel de cada tienda sobre la puerta, en el plano de la calle (ver cartel_tienda.js)
    pintarCarteles(volume, structures, width, depth, volumeHeight);

    // Generar PNGs para este tipo de mapa (incluimos estructuras para pintar frentes)
    // El nombre viaja colgado de `volume` (en vez de cambiar la firma de esta
    // función) para que construirMapa() pueda reenviarlo al hilo principal
    // cuando la generación corrió en el worker_thread de la ronda siguiente.
    // Lámpara física empotrada en el techo de cada habitación con luz (ver
    // agregarLucesInteriores en mapType3Block.js): la celda de techo del
    // centro de la sala pasa a ser un bloque LAMPARA (emisivo y destructible),
    // donde está la PointLight lógica. Se pone después de tallar todo
    // (ventanas, pasillos, escaleras) y sólo si ahí hay techo sólido: si la
    // celda es aire (abertura, hueco de escalera) no se coloca nada.
    for (const s of structures) {
        if (s.type === 'spawn' || TIPOS_SIN_LUZ_INTERIOR.has(s.type)) continue;
        if (s.width == null || s.height == null || s.depth == null) continue;
        const lx = Math.floor(s.x + s.width / 2);
        const ly = Math.floor(s.y + s.height - 1);
        const lz = Math.floor(s.z + s.depth / 2);
        if (lx < 0 || lx >= width || ly < 0 || ly >= volumeHeight || lz < 0 || lz >= depth) continue;
        const actual = volume.getType(lx, ly, lz);
        if (actual !== BLOCK_TYPES.AIR && actual !== BLOCK_TYPES.WINDOW) volume.set(lx, ly, lz, BLOCK_TYPES.LAMPARA);
    }

    volume.minimapFile = generateMapPNGs(volume, width, volumeHeight, depth, 'type3', structures, zonasEspeciales);

    // refugios subterráneos (plan_supervivencia.md §13): se excavan DESPUÉS del
    // minimapa para que el hueco de la trampilla no quede marcado en él.
    if (refugios && refugios.length) excavarRefugios(volume, refugios, width, depth, volumeHeight);

    return volume;
}

export {
    generateMapType3,
    generateVolumeType3
};