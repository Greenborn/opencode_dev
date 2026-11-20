import { BLOCK_TYPES, WORLD_CONFIG, isTintableRender } from '../mapConfig.js';
import { placeRooms } from './ubicacionSalaCasa.js';
import { addWindows } from './generadorCasaVentanas.js';
import {
    connectRooms,
    connectSpecialRoomsToHallways,
    connectBathrooms,
    connectBedrooms,
    connectBackyardDoor
} from './generadorCasaConexiones.js';
import {
    pickFloorCount,
    maxFloorsFitting,
    floorRise,
    stairWidth,
    planStairs,
    planStairwell,
    applyStairPlan,
    clearStairPlan,
    hasDoor,
    buildUpperFloor,
    removeFloor,
    planRoofExtras,
    pickLootRooms,
    pickLootSpot,
    pickArmario
} from './generadorCasaPisos.js';

// re-export moved helpers for external consumers
export {
    connectRooms,
    connectSpecialRoomsToHallways,
    connectBathrooms,
    connectBedrooms,
    connectBackyardDoor
};

// definiciones base de cada tipo de habitación. El resto del código usa estos
// valores para conocer dimensiones y texturas.
// distribution of wall materials for houses.
// each element has a weight (fraction of total) and the corresponding block type.
// originally there were only two options (brick + white).  a second brick
// variant ('brick_2') was added so that the server can reference it as a
// separate block type and make the client pick from an array of textures.
// the weights still sum to 1.0.
export const WALL_MATERIAL_DISTRIBUTION = [
    { weight: 0.15, texture: BLOCK_TYPES.BRICK },
    { weight: 0.15, texture: BLOCK_TYPES.BRICK_2 },
    { weight: 0.15, texture: BLOCK_TYPES.BRICK_3 },
    { weight: 0.55, texture: BLOCK_TYPES.WHITE }
];

// distribución de texturas para el piso; por ahora alterna entre gris y
// madera clara.  Las probabilidades pueden ajustarse más adelante a otra
// mezcla si se desea madera menos frecuente.
export const FLOOR_MATERIAL_DISTRIBUTION = [
    { weight: 0.25, texture: BLOCK_TYPES.GRAY },
    { weight: 0.25, texture: BLOCK_TYPES.WOOD_1 },
    { weight: 0.25, texture: BLOCK_TYPES.BALDOSAS_1 },
    { weight: 0.25, texture: BLOCK_TYPES.BALDOSAS_2 }
];

// ten beige tint variants – each entry includes a probability weight and a
// 24‑bit color value.  The weights should sum roughly to 1 but need not be
// exact; the selection function normalizes them internally.
export const BEIGE_TINT_DISTRIBUTION = [
    { weight: 0.10, color: 0xFFFFFF }, 
    { weight: 0.10, color: 0xFF0000 }, 
    { weight: 0.10, color: 0x00FF00 }, 
    { weight: 0.10, color: 0xFF00FF }, 
    { weight: 0.10, color: 0xFFFF00 }, 
    { weight: 0.10, color: 0x00FFFF }, 
    { weight: 0.10, color: 0x0000FF }  
];

// pick a color from a weighted distribution array of {weight,color} objects
export function chooseBeigeColor(distribution) {
    const r = Math.random();
    let cum = 0;
    for (const opt of distribution) {
        cum += opt.weight;
        if (r < cum) return opt.color;
    }
    return distribution[distribution.length - 1].color;
}

// pick a texture from a weighted distribution array of {weight,texture} objects
export function chooseWallTexture(distribution) {
    const r = Math.random();
    let cum = 0;
    for (const opt of distribution) {
        cum += opt.weight;
        if (r < cum) return opt.texture;
    }
    // fallback to last entry in case of rounding issues
    return distribution[distribution.length - 1].texture;
}

// for now floor selection uses the same logic as walls; kept as separate
// function in case behaviour diverges later
export const chooseFloorTexture = chooseWallTexture;

export const ROOM_CONFIGS = {
    banio: {
        type: 'banio', width: 10, depth: 15, height: 9,
        floorTexture: BLOCK_TYPES.GRAY,
        ceilingTexture: BLOCK_TYPES.WHITE,
        wallTexture: BLOCK_TYPES.BRICK,
        // this colour is only used on the minimap (and when N toggle is on)
        tintMinimap: 0xADD8E6,
        tintMinimapOpacity: 0.7
    },
    cocina: {
        type: 'cocina', width: 10, depth: 15, height: 9,
        floorTexture: BLOCK_TYPES.GRAY,
        ceilingTexture: BLOCK_TYPES.WHITE,
        wallTexture: BLOCK_TYPES.BRICK,
        tintMinimap: 0xFFFF00,
        tintMinimapOpacity: 0.7
    },
    comedor: {
        type: 'comedor', width: 15, depth: 15, height: 9,
        floorTexture: BLOCK_TYPES.GRAY,
        ceilingTexture: BLOCK_TYPES.WHITE,
        wallTexture: BLOCK_TYPES.BRICK,
        tintMinimap: 0xFFA500,
        tintMinimapOpacity: 0.7
    },
    dormitorio: {
        type: 'dormitorio', width: 15, depth: 15, height: 9,
        floorTexture: BLOCK_TYPES.GRAY,
        ceilingTexture: BLOCK_TYPES.WHITE,
        wallTexture: BLOCK_TYPES.BRICK,
        tintMinimap: 0x00FF00,
        tintMinimapOpacity: 0.7
    },
    living: {
        type: 'living', width: 15, depth: 15, height: 9,
        floorTexture: BLOCK_TYPES.GRAY,
        ceilingTexture: BLOCK_TYPES.WHITE,
        wallTexture: BLOCK_TYPES.BRICK,
        tintMinimap: 0xEE82EE,
        tintMinimapOpacity: 0.7
    },
    hallway: {
        type: 'hallway', width: 6, depth: 6, height: 9,
        floorTexture: BLOCK_TYPES.GRAY,
        ceilingTexture: BLOCK_TYPES.WHITE,
        wallTexture: BLOCK_TYPES.BRICK,
        tintMinimap: 0xCCCCCC,
        tintMinimapOpacity: 0.5
    },
    // caja de escalera: la llevan sólo las casas de dos o más plantas. Tiene
    // que entrar un tramo (`rise` escalones más los dos descansos) a lo largo
    // y los dos tramos de la ida y vuelta a lo ancho; ver planStairwell en
    // generadorCasaPisos.js.
    escalera: {
        type: 'escalera', width: 14, depth: 10, height: 9,
        floorTexture: BLOCK_TYPES.GRAY,
        ceilingTexture: BLOCK_TYPES.WHITE,
        wallTexture: BLOCK_TYPES.BRICK,
        tintMinimap: 0x9370DB,
        tintMinimapOpacity: 0.7
    }
};

// helper que empaqueta una sala en el arreglo de estructuras.
export function createRoom(x0, y0, z0, cfg, structures) {
    const {
        type,
        width,
        depth,
        height,
        floorTexture,
        ceilingTexture,
        wallTexture,
        frontNorth,
        frontSouth,
        frontEast,
        frontWest,
        hasFrontDoor,
        // render tint (rarely used; leaves material colour as default if
        // undefined)
        tintRender,
        tintOpacity,
        // minimap-only tint
        tintMinimap,
        tintMinimapOpacity,
        parcelId
    } = cfg;
    const roomStruct = {
        type: type || 'room',
        x: x0,
        y: y0,
        z: z0,
        width,
        depth,
        height,
        floorTexture,
        ceilingTexture,
        wallTexture,
        // planta a la que pertenece la sala: 0 es la que se apoya en el
        // terreno, 1 la que generadorCasaPisos levanta sobre su techo.
        floor: cfg.floor || 0
    };
    if (frontNorth) roomStruct.frontNorth = true;
    if (frontSouth) roomStruct.frontSouth = true;
    if (frontEast) roomStruct.frontEast = true;
    if (frontWest) roomStruct.frontWest = true;
    if (hasFrontDoor) roomStruct.hasFrontDoor = true;
    if (typeof tintRender !== 'undefined') roomStruct.tintRender = tintRender;
    if (typeof tintOpacity !== 'undefined') roomStruct.tintOpacity = tintOpacity;
    if (typeof tintMinimap !== 'undefined') roomStruct.tintMinimap = tintMinimap;
    if (typeof tintMinimapOpacity !== 'undefined') roomStruct.tintMinimapOpacity = tintMinimapOpacity;
    if (typeof parcelId !== 'undefined') roomStruct.parcelId = parcelId;
    structures.push(roomStruct);
}

// -------------------------------------------------------------------------
// funciones exportadas solicitadas por el refactor
// -------------------------------------------------------------------------

/**
 * Devuelve un arreglo (lista) de nombres de sala que compondrán la casa.
 * La primera entrada está reservada para la sala que llevará la puerta.
 *
 * `withStairwell` agrega la caja de escalera, que llevan las casas de dos o
 * más plantas. Va al final de la lista para que nunca sea la sala de entrada:
 * el reordenamiento de abajo siempre pone adelante living, comedor o cocina.
 */
export function chooseRoomTypes(withStairwell = false) {
    const types = ['banio', 'cocina', 'dormitorio'];
    if (Math.random() < 0.25) types.push('banio');
    if (Math.random() < 0.5) types.push('living');
    if (Math.random() < 0.5) types.push('dormitorio');
    if (Math.random() < 0.25) types.push('dormitorio');
    if (Math.random() < 0.55) types.push('comedor');

    if (types.includes('cocina') && types.includes('comedor')) {
        types.splice(types.indexOf('cocina'), 1);
        types.splice(types.indexOf('comedor'), 1);
        types.unshift('comedor', 'cocina');
    }
    if (types.includes('living') && types.includes('dormitorio')) {
        const filtered = types.filter(t => t !== 'living' && t !== 'dormitorio');
        types.length = 0;
        types.push('living', 'dormitorio', ...filtered);
    }
    let entrance = null;
    if (types.includes('living')) entrance = 'living';
    else if (types.includes('comedor')) entrance = 'comedor';
    else if (types.includes('cocina')) entrance = 'cocina';
    if (entrance) {
        const idx = types.indexOf(entrance);
        if (idx > 0) {
            types.splice(idx, 1);
            types.unshift(entrance);
        }
    }
    // la caja de escalera va al final: ya está resuelta la sala de entrada
    if (withStairwell) types.push('escalera');
    return types;
}

/**
 * Calcula el frente principal de una parcela dado su índice (`px`,`pz`) y
 * el número de parcelas en cada dirección (`plotsX`,`plotsZ`).
 * Devuelve 'N','S','E' u 'O' o `null` si no toca ningún borde.
 */
export function determineFront(px, pz, plotsX, plotsZ) {
    const candidates = [];
    if (pz === 0) candidates.push('N');
    if (pz === plotsZ - 1) candidates.push('S');
    if (px === 0) candidates.push('O');
    if (px === plotsX - 1) candidates.push('E');
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Tramo de escalera de una planta. Si la casa tiene caja de escalera el tramo
 * va siempre en ella —uno por planta, apilados, como en un edificio—. Si no la
 * tiene (no entró en la parcela) se busca sitio dentro de alguna sala, que es
 * cómo se resolvía antes de haber caja.
 */
function planFloorStairs(rooms, rise, stairW, level) {
    const caja = rooms.find(r => r.type === 'escalera');
    return (caja ? planStairwell(caja, rise, level) : null)
        || planStairs(rooms, rise, stairW, level);
}

/**
 * Toma una parcela y un frente ya resuelto y construye las salas dentro del
 * terreno. Recibe el arreglo `structures` donde añadirá los objetos resultantes.
 */
export function generateParcelRooms(plotX0, plotZ0, plotWidth, plotDepth,
                                    mapWidth, mapDepth, baseY, structures,
                                    orientation, parcelId) {
    // log each house/parcel as it is added for server-side debugging
    console.log(`Generando casa en parcela ${parcelId} (${plotX0},${plotZ0}) orientacion=${orientation}`);

    // choose predominant wall texture using the distribution array
    const houseWallTexture = chooseWallTexture(WALL_MATERIAL_DISTRIBUTION);
    // choose floor texture (GRAY or WOOD_1 for now)
    const houseFloorTexture = chooseFloorTexture(FLOOR_MATERIAL_DISTRIBUTION);

    // log textures for debugging
    console.log(`  pared principal: ${houseWallTexture}`);
    console.log(`  piso seleccionado : ${houseFloorTexture}`);

    // Si el tipo de pared seleccionado admite tintado en el render,
    // escogemos un tono beige para toda la casa que aparecerá en el modo
    // render por defecto.  El minimapa seguirá tomando su color de
    // ROOM_CONFIGS (como los azules de los baños).
    let wallRenderTintColor;
    let wallRenderTintOpacity;
    if (isTintableRender(houseWallTexture)) {
        wallRenderTintColor = chooseBeigeColor(BEIGE_TINT_DISTRIBUTION);
        wallRenderTintOpacity = 0.5;
    }

    // create a shallow copy of ROOM_CONFIGS with the selected wall texture
    const roomConfigsForHouse = {};
    for (const key in ROOM_CONFIGS) {
        // copy and override wall and floor textures; si hay render tint lo
        // adjuntamos a cada configuración de sala.
        roomConfigsForHouse[key] = Object.assign({}, ROOM_CONFIGS[key], {
            wallTexture: houseWallTexture,
            floorTexture: houseFloorTexture,
            ...(wallRenderTintColor !== undefined ? { tintRender: wallRenderTintColor, tintOpacity: wallRenderTintOpacity } : {})
        });
    }

    // ¿cuántas plantas?  Se decide antes de colocar las salas porque una casa
    // de dos o más plantas lleva una sala más: la caja de escalera.  El alto
    // del volumen es limitado, así que tampoco puede tener más plantas que las
    // que dejen su techo —y los bloques que el jugador necesita encima para
    // pararse en él— dentro del mundo.
    const rise = floorRise(Object.values(ROOM_CONFIGS));
    const floorCount = Math.min(pickFloorCount(),
        maxFloorsFitting(baseY, rise, WORLD_CONFIG.volumeHeight));

    const types = chooseRoomTypes(floorCount > 1);
    placeRooms(types, plotX0, plotZ0, plotWidth, plotDepth,
               baseY, structures, orientation, parcelId,
               roomConfigsForHouse, createRoom);

    // La escalera se resuelve ANTES de abrir las puertas: ocupa un tramo de la
    // caja y lo deja reservado en `stairKeepOut`, de modo que las reglas de
    // conexión abran cada puerta esquivándolo en lugar de quedar tapada por
    // los escalones.
    const groundRooms = structures.filter(s => s.parcelId === parcelId);
    const stairW = stairWidth(groundRooms);
    let stairPlan = null;
    if (floorCount > 1) {
        stairPlan = planFloorStairs(groundRooms, rise, stairW, 0);
        applyStairPlan(stairPlan);
        if (!stairPlan) {
            console.log('  sin lugar para la escalera: la casa se queda de una planta');
        }
    }

    // Durante la fase de colocación no se creaban conexiones internas entre
    // salas. A partir de aquí ejecutamos un paso adicional que marca aperturas
    // (4×6) en las paredes de las habitaciones que deben comunicarse.
    // Por el momento sólo nos interesan los pasillos de una misma casa: si dos
    // `hallway` contiguos llevan el mismo parcelId generamos los flags que
    // `generateVolumeType3` utilizará más tarde para grabar la abertura.
    connectRooms(structures);
    // asegurarse también de que cocina, comedor y living estén abiertos hacia
    // un pasillo siempre que queden adyacentes a él. esto aplica una política
    // más estricta para los tres tipos principales que el cliente quiere
    // garantizar.
    connectSpecialRoomsToHallways(structures);
    // los baños deben conectarse con un solo acceso siguiendo la prioridad
    // pasillo > sala principal > otra sala. se aplica después de las otras
    // reglas para no interferir con puertas ya creadas.
    connectBathrooms(structures);
    // dormitorios también pueden tener una única abertura; prioridad
    // 1. pasillo  2. sala principal.
    connectBedrooms(structures);

    // generate a back‑yard opening in the farthest principal room
    // (comedor > living > cocina) for the current parcel.  This must run
    // after all internal connections because it uses room positions but
    // does not affect geometry.
    connectBackyardDoor(structures, orientation, parcelId);

    // tras todas las conexiones internas procedemos a generar ventanas.
    // el algoritmo ahora espera recibir únicamente las salas que pertenecen
    // a esta casa; filtramos por `parcelId` antes de llamar.
    // no windows for bathrooms, so omit them from the list
    const parcelRooms = structures.filter(s =>
        s.parcelId === parcelId && s.type !== 'hallway' && s.type !== 'spawn' && s.type !== 'banio'
    );
    addWindows(parcelRooms, structures, plotX0, plotZ0, plotWidth, plotDepth);

    // Ninguna regla de conexión garantiza una puerta: si la escalera quedó sin
    // acceso no hay cómo subir, así que se la quita y la casa se queda de una
    // planta en lugar de levantar plantas incomunicadas.
    if (stairPlan && !hasDoor(stairPlan.room) && !stairPlan.room.hasFrontDoor) {
        console.log(`  la escalera quedó sin puerta (${stairPlan.room.type}): la casa se queda de una planta`);
        clearStairPlan(stairPlan);
        stairPlan = null;
    }

    // cada planta alta repite la de abajo un piso más arriba (mismas paredes,
    // mismas puertas interiores) y recibe sus propias ventanas. Cada planta k
    // lleva un tramo de escalera que sube a la k+1, y la planta de arriba del
    // todo lleva el que sube al techo. Con caja de escalera todos los tramos
    // van apilados en ella; sin caja se busca sitio sala por sala, después de
    // clonar la planta, para poder esquivar sus puertas copiadas.
    const levels = [groundRooms];
    const stairFrom = [stairPlan];
    let level = 0;
    while (stairFrom[level] && level + 1 < floorCount) {
        const upperRooms = buildUpperFloor(levels[level], structures, rise);
        const upperWithWindows = upperRooms.filter(s =>
            s.type !== 'hallway' && s.type !== 'spawn' && s.type !== 'banio'
        );
        addWindows(upperWithWindows, structures, plotX0, plotZ0, plotWidth, plotDepth);
        levels.push(upperRooms);
        level++;
        stairFrom[level] = planFloorStairs(upperRooms, rise, stairW, level);
        applyStairPlan(stairFrom[level]);
        if (!stairFrom[level]) {
            console.log(`  sin lugar para la escalera de la planta ${level + 1}`);
        }
    }
    // Si la última planta no tiene sitio para su tramo, se quita y la casa
    // queda una planta más abajo. El tramo de la planta de abajo ya está
    // puesto y las puertas ya lo esquivan, así que se deja como está: pasa a
    // ser el que sube al techo, que está a la misma altura que estaba el piso
    // de la planta quitada. Una casa de una planta no lleva escalera.
    if (!stairFrom[level] && level > 0) {
        console.log(`  la planta ${level + 1} se quita: no hay sitio para su escalera`);
        removeFloor(structures, parcelId, level);
        levels.pop();
        level--;
    }

    // Azotea: casilla sobre la escalera que sale al techo (si la hay) y, en
    // la mitad de las casas, un tanque de agua. Después de clonar las plantas
    // para que las anotaciones no se copien a ninguna otra.
    planRoofExtras(levels[level], stairFrom[level] || null);

    // Botín fijo de la casa: cada sala tiene 25% de probabilidad de llevar una
    // caja. Se anota recién ahora, después de clonar las plantas y resolver sus
    // escaleras, para que los clones no se lleven el punto de la planta baja.
    for (let l = 0; l < levels.length; l++) {
        for (const sala of pickLootRooms(levels[l], l)) {
            const spot = pickLootSpot(sala);
            if (spot) sala.lootSpot = spot;
        }
        // Armarios con comida/agua (supervivencia): decisión y contenido se
        // sortean acá, una sola vez; el servidor los envía a los clientes.
        for (const sala of levels[l]) {
            const armario = pickArmario(sala);
            if (armario) sala.armarios = [armario];
        }
    }

    if (level > 0) {
        const plan = stairFrom[level];
        console.log(`  casa de ${level + 1} plantas; escalera al techo en ${plan.room.type} (${plan.startX},${plan.startZ}) eje ${plan.axis} sentido ${plan.dir}`);
    }
    // ejemplos de usos futuros: addHallways, addBathroomConnections, etc.
}

// connection helpers moved to generadorCasaConexiones.js
