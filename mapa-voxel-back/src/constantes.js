// constantes.js - Constantes puras del generador de mapas voxel.
//
// No importa nada (ni fs ni pngjs): es la subruta "./constantes" del paquete y
// la pueden usar el navegador y el servidor por igual. Lo que depende de
// Node (escritura de PNG, minimapas) vive en mapConfig.js.
// Una línea extra de manzanas de cada lado del mapa (ver más abajo); se
// declara antes de usarse en `tamanoMundoPara`.
const LADO_MANZANA = 196;
const MANZANAS_EXTRA_POR_EJE = 2 * LADO_MANZANA;

/** Lado del mapa (en bloques) para un factor de superficie dado. */
function tamanoMundoPara(factor) {
    return Math.round(1000 * Math.sqrt(factor)) + MANZANAS_EXTRA_POR_EJE;
}
const BLOCK_TYPES = {
    AIR: 0,
    GREEN: 1,
    BROWN: 2,
    GRAY: 3,
    WHITE: 4,
    BRICK: 5,
    BRICK_2: 9,          // alternate brick texture/variant
    BRICK_3: 10,         // third brick variant
    ASPHALT: 6,
    VEREDA: 7,
    WINDOW: 8,
    WOOD_1: 11, // correspondencia con textura madera
    BALDOSAS_1: 12, // baldosas cerámicas
    BALDOSAS_2: 13, // segunda variante de baldosas
    LAMPARA: 14     // luz puntual física en el techo de cada habitación con luz
};

// Properties associated with each block type.  We need to know whether a
// type may be tinted when drawing the minimap and/or in the 3D render.
// Generators will consult these flags before calling tinting helpers.
const BLOCK_PROPERTIES = {
    // `transparent` indicates the block does not cast a shadow on the front
    // face; light may pass through.  generators and the renderer will consult
    // this flag when building lighting/occlusion maps.
    [BLOCK_TYPES.AIR]:      { tintableMinimap: false, tintableRender: false, transparent: true },
    [BLOCK_TYPES.GREEN]:    { tintableMinimap: true,  tintableRender: true,  transparent: false },
    [BLOCK_TYPES.BROWN]:    { tintableMinimap: true,  tintableRender: true,  transparent: false },
    [BLOCK_TYPES.GRAY]:     { tintableMinimap: true,  tintableRender: false, transparent: false },
    [BLOCK_TYPES.WHITE]:    { tintableMinimap: true,  tintableRender: true,  transparent: false },
    [BLOCK_TYPES.BRICK]:    { tintableMinimap: true,  tintableRender: true,  transparent: false },
    [BLOCK_TYPES.BRICK_2]:  { tintableMinimap: true,  tintableRender: true,  transparent: false },
    [BLOCK_TYPES.BRICK_3]:  { tintableMinimap: true,  tintableRender: false, transparent: false },
    [BLOCK_TYPES.ASPHALT]:  { tintableMinimap: true,  tintableRender: true,  transparent: false },
    [BLOCK_TYPES.VEREDA]:   { tintableMinimap: true,  tintableRender: false, transparent: false },
    [BLOCK_TYPES.WINDOW]:   { tintableMinimap: true,  tintableRender: false, transparent: true  },
    [BLOCK_TYPES.WOOD_1]:   { tintableMinimap: true,  tintableRender: true,  transparent: false },
    [BLOCK_TYPES.BALDOSAS_1]: { tintableMinimap: false,  tintableRender: false, transparent: false },
    [BLOCK_TYPES.BALDOSAS_2]: { tintableMinimap: false,  tintableRender: false, transparent: false },
    [BLOCK_TYPES.LAMPARA]:  { tintableMinimap: false,  tintableRender: false, transparent: false }
};
/**
 * Determina si un tipo de bloque admite tintado en el minimapa.
 * @param {number} type - constante numérica de BLOCK_TYPES
 * @returns {boolean} true si el tipo puede recibir tintes en el minimapa
 */
function isTintableMinimap(type) {
    const info = BLOCK_PROPERTIES[type];
    return info ? info.tintableMinimap : false;
}

/**
 * Determina si un tipo de bloque admite tintado en el render 3D.
 * @param {number} type - constante numérica de BLOCK_TYPES
 * @returns {boolean} true si el tipo puede recibir tintes en el render
 */
function isTintableRender(type) {
    const info = BLOCK_PROPERTIES[type];
    return info ? info.tintableRender : false;
}

/**
 * Determina si un tipo de bloque es transparente para el render frontal.
 * Un bloque transparente no proyecta sombras y deja pasar la luz.
 * @param {number} type - constante numérica de BLOCK_TYPES
 * @returns {boolean} true si el bloque es transparente
 */
function isTransparent(type) {
    const info = BLOCK_PROPERTIES[type];
    return info ? !!info.transparent : false;
}
const CONFIG_GENERATION = {
    baseNoiseFreq: 0.01,
    detailNoiseFreq: 0.05,
    detailNoiseAmp: 0.1,
    randomAmp: 0.05,
    heightMultiplier: 16, // Altura entre 0 y 32 (aumentada para más resolución)
    caveChance: 0.2 // 80% de bloques sólidos
};
// Una línea extra de manzanas de cada lado del mapa: cada manzana (cuadra + calle)
// mide 196 bloques (`patternSize` en mapType3Block.js; no se importa acá para no
// crear un ciclo entre módulos). Son dos líneas en total, una por borde.
// (LADO_MANZANA y MANZANAS_EXTRA_POR_EJE se declaran arriba del archivo.)

// Objeto mutable: `configurarMundo` actualiza width/height in place, así todos
// los módulos que lo importaron ven el tamaño ya escalado.
const WORLD_CONFIG = {
    width: tamanoMundoPara(1),
    height: tamanoMundoPara(1),
    volumeHeight: 76,   // alto del mundo: el suelo queda en la mitad y las casas de 4 plantas necesitan ~38 bloques sobre él
    blockSize: 1,
    chunkSize: 128,
    renderDistance: 256,
    // Distancia mínima (en bloques) entre árboles en veredas. Si dos posiciones quedan
    // más cerca que este valor, sólo se colocará uno de los árboles.
    treeMinDistance: 8,
    updateThreshold: 0.5
};

// Configuraciones de colores del terreno por altura
const TERRAIN_CONFIG = {
    subdivisions: 4, // Aumentado para mejor resolución del terreno
    colors: [
        { maxHeight: 3, color: 0x1E90FF, name: 'agua' },
        { maxHeight: 6, color: 0xF4A460, name: 'arena' },
        { maxHeight: 10, color: 0x228B22, name: 'pasto' },
        { maxHeight: 14, color: 0x8B7355, name: 'montaña' },
        { maxHeight: Infinity, color: 0xE0E0E0, name: 'nieve' }
    ]
};
// helper para aplicar tintado a un bloque dentro de un volumen
// el juego ahora diferencia entre dos tintes distintos:
//   • tintMinimap: usado únicamente por el minimapa (y opcionalmente por
//     el render cuando el usuario aprieta la tecla “n”).
//   • tintRender: aplicado siempre en el render 3D del cliente.
// el campo legacy `tint` se mantiene sólo por compatibilidad y se tratará
// como `tintMinimap` si aparece.
function tintBlockMinimap(volume, x, y, z, color, opacity) {
    if (volume && typeof volume.setTintMinimap === 'function') {
        volume.setTintMinimap(x, y, z, color, opacity);
        return;
    }
    if (!volume[x] || !volume[x][y] || volume[x][y][z] == null) return;
    let cell = volume[x][y][z];
    if (typeof cell !== 'object') {
        cell = { type: cell };
        volume[x][y][z] = cell;
    }
    cell.tintMinimap = { color, opacity };
}

function tintBlockRender(volume, x, y, z, color, opacity) {
    if (volume && typeof volume.setTintRender === 'function') {
        volume.setTintRender(x, y, z, color, opacity);
        return;
    }
    if (!volume[x] || !volume[x][y] || volume[x][y][z] == null) return;
    let cell = volume[x][y][z];
    if (typeof cell !== 'object') {
        cell = { type: cell };
        volume[x][y][z] = cell;
    }
    cell.tintRender = { color, opacity };
}

// para no romper código existente exportamos tintBlock como alias a
// tintBlockMinimap, que reproduce el comportamiento previo.
function tintBlock(volume, x, y, z, color, opacity) {
    return tintBlockMinimap(volume, x, y, z, color, opacity);
}

export {
    tamanoMundoPara,
    BLOCK_TYPES,
    BLOCK_PROPERTIES,
    isTintableMinimap,
    isTintableRender,
    isTransparent,
    CONFIG_GENERATION,
    WORLD_CONFIG,
    TERRAIN_CONFIG,
    tintBlock,
    tintBlockMinimap,
    tintBlockRender
};
