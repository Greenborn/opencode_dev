// Configuraciones comunes para generación de mapas.
//
// Estado de configuración del paquete (ver `configurarMundo`):
//   - factorSuperficie: fracción de la superficie del mapa base (1 = mapa
//     completo). El lado se escala con su raíz cuadrada, así que la superficie
//     queda proporcional al factor.
//   - directorioMinimapas: carpeta donde se escriben los PNG de los planos.
//     Si no se configura, no se escribe ningún archivo.
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

let factorSuperficie = 1;
let directorioMinimapas = null;

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

// ruta al último minimapa generado (incluye sufijo único)
let lastMinimapFile = null;

function getLastMinimapFile() {
    return lastMinimapFile;
}

// El mapa de cada ronda nueva se genera en un worker_thread aparte (ver
// `preparador_mapa.js`), que tiene su propia copia de este módulo con su
// propio `lastMinimapFile`: ese valor nunca llega solo al hilo principal, que
// es el que de verdad atiende `/minimap`. `instalarMapa` (mapGenerator.js)
// llama a esto con el nombre que vino en el mapa recibido del worker para que
// el hilo principal sirva el PNG correcto en vez de uno que el worker ya borró.
function setLastMinimapFile(file) {
    if (file) lastMinimapFile = file;
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

// Función para colocar una estructura simple (edificio)
function placeStructure(maxHeightMap, structures, x, z, width, height, depth) {
    structures.push({ x, z, width, height, depth });
    for (let dx = 0; dx < width; dx++) {
        for (let dz = 0; dz < depth; dz++) {
            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nx < maxHeightMap.length && nz >= 0 && nz < maxHeightMap[0].length) {
                const baseHeight = maxHeightMap[nx][nz];
                maxHeightMap[nx][nz] = Math.max(baseHeight, height);
            }
        }
    }
}

/**
 * Configura el mundo que generan los módulos de este archivo.
 *
 * - `factorSuperficie`: fracción de la superficie base (1 = mapa completo).
 *   Actualiza `WORLD_CONFIG.width/height` in place. Pensado para correr en un
 *   worker por sala: cada worker tiene su propia copia de este módulo.
 * - `directorioMinimapas`: carpeta para los PNG de los planos (ver
 *   `generateMapPNGs`). `null` desactiva la escritura de archivos.
 */
function configurarMundo({ factorSuperficie: factor = 1, directorioMinimapas: dir = null } = {}) {
    if (!(factor > 0)) throw new RangeError('factorSuperficie debe ser mayor que 0');
    factorSuperficie = factor;
    directorioMinimapas = dir ? path.resolve(dir) : null;
    WORLD_CONFIG.width = tamanoMundoPara(factor);
    WORLD_CONFIG.height = tamanoMundoPara(factor);
}

/** Factor de superficie vigente (ver `configurarMundo`). */
function getFactorSuperficie() {
    return factorSuperficie;
}

// Función para generar PNGs de los planos del mapa
function generateMapPNGs(volume, width, height, depth, mapType, structures = [], zonasEspeciales = null) {
    
    // Sin carpeta configurada no hay PNG que escribir (ver `configurarMundo`).
    if (!directorioMinimapas) return null;
    const mapsDir = directorioMinimapas;

    // No se borra nada acá: este código puede correr en el worker de la ronda
    // siguiente mientras el minimapa vigente todavía se sirve. Los viejos se
    // limpian al instalar el mapa nuevo (ver `limpiarMinimapasViejos`).
    fs.mkdirSync(mapsDir, { recursive: true });
    
    // Generar un único minimapa combinando todas las capas
    // La contribución de cada bloque se acumula y al final se obtiene el color
    // promedio de todas las capas ocupadas. Esto asegura un resultado "acumulativo".
    const minimap = new PNG({ width: width, height: depth });
    // arrays auxiliares para suma de canales y conteo de capas
    const pixelCount = width * depth;
    const sumR = new Uint32Array(pixelCount);
    const sumG = new Uint32Array(pixelCount);
    const sumB = new Uint32Array(pixelCount);
    const count = new Uint16Array(pixelCount);

    // comenzar en altura media menos dos, como indicó el usuario
    const startY = Math.max(0, Math.floor(height/2) - 2);
    for (let y = startY; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                const idx4 = (z * width + x) * 4;
                const idx = z * width + x;
                // el volumen ahora puede ser un VolumeBuffer o contener objetos con propiedades { type, tint }
                let block = (volume && typeof volume.get === 'function') ? volume.get(x, y, z) : volume[x][y][z];
                if (block == null) continue;

                // obtener el tipo de bloque incluso si el valor es un objeto
                const blockType = (typeof block === 'object') ? block.type : block;
                if (blockType === BLOCK_TYPES.AIR) continue; // no pintar aire

                // generar color según material base
                let r2 = 255, g2 = 255, b2 = 255;
                switch (blockType) {
                    case BLOCK_TYPES.GREEN:
                        r2 = 0; g2 = 200; b2 = 0; break;
                    case BLOCK_TYPES.BROWN:
                        r2 = 139; g2 = 69; b2 = 19; break;
                    case BLOCK_TYPES.GRAY:
                        r2 = 128; g2 = 128; b2 = 128; break;
                    case BLOCK_TYPES.WHITE:
                        r2 = 240; g2 = 240; b2 = 240; break;
                    case BLOCK_TYPES.BRICK:
                        r2 = 178; g2 = 34; b2 = 34; break;
                    case BLOCK_TYPES.BRICK_2:
                        // use same minimap colour as brick for simplicity
                        r2 = 178; g2 = 34; b2 = 34; break;
                    case BLOCK_TYPES.BRICK_3:
                        // third brick variant shares colour too
                        r2 = 178; g2 = 34; b2 = 34; break;
                    case BLOCK_TYPES.ASPHALT:
                        r2 = 30; g2 = 30; b2 = 30; break;
                    case BLOCK_TYPES.VEREDA:
                        r2 = 200; g2 = 200; b2 = 0; break;
                    case BLOCK_TYPES.WINDOW:
                        // ventanas con matiz verdoso en el minimapa
                        r2 = 180; g2 = 220; b2 = 180; break;
                    }

                // aplicar tintado minimapa si existe (mezcla lineal)
                // primero comprobamos el campo nuevo, luego el legacy `tint`.
                const tintSource = (typeof block === 'object') ?
                    (block.tintMinimap || block.tint) : null;
                if (tintSource) {
                    const t = tintSource;
                    if (typeof t.color === 'number' && typeof t.opacity === 'number') {
                        // descomponer el color hexadecimal en rgb
                        const tintColor = t.color;
                        const tr = (tintColor >> 16) & 0xFF;
                        const tg = (tintColor >> 8) & 0xFF;
                        const tb = tintColor & 0xFF;
                        const alpha = Math.max(0, Math.min(1, t.opacity));
                        // mezclar
                        r2 = Math.floor(r2 * (1 - alpha) + tr * alpha);
                        g2 = Math.floor(g2 * (1 - alpha) + tg * alpha);
                        b2 = Math.floor(b2 * (1 - alpha) + tb * alpha);
                    }
                }

                sumR[idx] += r2;
                sumG[idx] += g2;
                sumB[idx] += b2;
                count[idx]++;
            }
        }
    }

    // construir pixels finales promediando y ajustando por cobertura
    // columnas con pocas capas se oscurecerán para evidenciar huecos
    const maxLayers = height - startY;
    for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
            const idx = z * width + x;
            const idx4 = idx * 4;
            if (count[idx] === 0) {
                // antes se dejaba transparente, lo que en muchos visores se pinta de
                // negro y hacía que el mapa entero pareciera "lleno de ollín".
                // En su lugar rellenamos con un gris claro para indicar ausencia de
                // bloques por encima del plano de corte.
                minimap.data[idx4] = 200;
                minimap.data[idx4 + 1] = 200;
                minimap.data[idx4 + 2] = 200;
                minimap.data[idx4 + 3] = 255;
            } else {
                let r = Math.floor(sumR[idx] / count[idx]);
                let g = Math.floor(sumG[idx] / count[idx]);
                let b = Math.floor(sumB[idx] / count[idx]);
                // Ya no oscurecemos según la proporción de capas, el mapa se ve demasiado
                // oscuro cuando casi todos los valores son pequeños. Si se requiere indicar
                // profundidad podemos aplicar otras técnicas más adelante.
                minimap.data[idx4] = r;
                minimap.data[idx4 + 1] = g;
                minimap.data[idx4 + 2] = b;
                minimap.data[idx4 + 3] = 255;
            }
        }
    }

    // superponer los frentes de parcelas en rojo chillón
    overlayParcelFronts(minimap, width, depth, structures);

    // modo zombies: marcar las dos bases (0 = humana, 1 = zombie, ver
    // `elegirBasesEnEdificios` en construirMapa.js) con un disco + cruz bien
    // grandes, en colores distintos, para ubicarlas de un vistazo en el mapa.
    if (zonasEspeciales && zonasEspeciales[0]) {
        overlayBase(minimap, width, depth, zonasEspeciales[0], zonasEspeciales[0].color || 0x2f9dff);
    }
    if (zonasEspeciales && zonasEspeciales[1]) {
        overlayBase(minimap, width, depth, zonasEspeciales[1], zonasEspeciales[1].color || 0xff00ff);
    }

    // nombrar el minimapa con un sufijo de marca de tiempo para evitar caches
    const fileName = `${mapsDir}/map_${mapType}_minimap_${Date.now()}.png`;
    // síncrono: así el archivo está completo antes de que el mapa se instale y
    // `/minimap` nunca sirve un PNG a medio escribir
    fs.writeFileSync(fileName, PNG.sync.write(minimap));
    console.log(`PNG generado: ${fileName}`);
    // mantener referencia global al último archivo generado
    lastMinimapFile = fileName;
    return fileName;
}

// Borra los PNG de minimapas que ya no están en uso. Se llama al instalar un
// mapa, cuando el nuevo ya quedó como el vigente: antes de eso el anterior
// sigue sirviéndose.
//
// OJO: cada sala corre en su propio worker_thread pero TODAS comparten este
// directorio. Si se borrara todo lo que no sea el PNG propio, la sala que
// instala su mapa más tarde le borraría el minimapa vigente a la otra (su
// `lastMinimapFile` seguiría apuntando a un archivo inexistente y el pedido
// fallaba con ENOENT). Por eso sólo se borran los PNG con más de una hora de
// antigüedad: ninguna sala conserva un minimapa activo tanto tiempo (las
// rondas duran 15 minutos y cada una genera el suyo).
const MINIMAP_RETENCION_MS = 60 * 60 * 1000;

function limpiarMinimapasViejos(conservar) {
    if (!directorioMinimapas) return;
    const mapsDir = directorioMinimapas;
    const mantener = conservar ? path.resolve(conservar) : null;
    const ahora = Date.now();
    let files = [];
    try {
        files = fs.readdirSync(mapsDir);
    } catch (err) {
        return; // el directorio todavía no existe: nada que limpiar
    }
    for (const file of files) {
        const ruta = path.resolve(mapsDir, file);
        if (!file.endsWith('.png') || ruta === mantener) continue;
        try {
            const info = fs.statSync(ruta);
            if (ahora - info.mtimeMs < MINIMAP_RETENCION_MS) continue;
            fs.unlinkSync(ruta);
        } catch (err) {
            console.error(`[mapa] no se pudo borrar minimapa viejo ${file}:`, err.message);
        }
    }
}

// dibuja líneas rojas un píxel fuera del terreno en el frente de cada
// parcela identificada por `parcelId` en la lista `structures`.
function overlayParcelFronts(minimap, width, depth, structures) {
    // agrupar por parcelId
    const parcels = {};
    for (const s of structures) {
        if (!s.parcelId) continue;
        let p = parcels[s.parcelId];
        if (!p) {
            p = {minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, orientation: null};
            parcels[s.parcelId] = p;
        }
        p.minX = Math.min(p.minX, s.x);
        p.maxX = Math.max(p.maxX, s.x + s.width);
        p.minZ = Math.min(p.minZ, s.z);
        p.maxZ = Math.max(p.maxZ, s.z + s.depth);
        if (s.hasFrontDoor) {
            if (s.frontNorth) p.orientation = 'N';
            else if (s.frontSouth) p.orientation = 'S';
            else if (s.frontEast) p.orientation = 'E';
            else if (s.frontWest) p.orientation = 'O';
        }
    }

    const r = 255, g = 0, b = 0, a = 255;
    for (const p of Object.values(parcels)) {
        if (!p.orientation) continue;
        if (p.orientation === 'N') {
            const z = p.minZ - 1;
            for (let x = p.minX; x < p.maxX; x++) {
                if (x >= 0 && x < width && z >= 0 && z < depth) {
                    const idx4 = (z * width + x) * 4;
                    minimap.data[idx4] = r;
                    minimap.data[idx4 + 1] = g;
                    minimap.data[idx4 + 2] = b;
                    minimap.data[idx4 + 3] = a;
                }
            }
        } else if (p.orientation === 'S') {
            const z = p.maxZ;
            for (let x = p.minX; x < p.maxX; x++) {
                if (x >= 0 && x < width && z >= 0 && z < depth) {
                    const idx4 = (z * width + x) * 4;
                    minimap.data[idx4] = r;
                    minimap.data[idx4 + 1] = g;
                    minimap.data[idx4 + 2] = b;
                    minimap.data[idx4 + 3] = a;
                }
            }
        } else if (p.orientation === 'E') {
            const x = p.maxX;
            for (let z = p.minZ; z < p.maxZ; z++) {
                if (x >= 0 && x < width && z >= 0 && z < depth) {
                    const idx4 = (z * width + x) * 4;
                    minimap.data[idx4] = r;
                    minimap.data[idx4 + 1] = g;
                    minimap.data[idx4 + 2] = b;
                    minimap.data[idx4 + 3] = a;
                }
            }
        } else if (p.orientation === 'O') {
            const x = p.minX - 1;
            for (let z = p.minZ; z < p.maxZ; z++) {
                if (x >= 0 && x < width && z >= 0 && z < depth) {
                    const idx4 = (z * width + x) * 4;
                    minimap.data[idx4] = r;
                    minimap.data[idx4 + 1] = g;
                    minimap.data[idx4 + 2] = b;
                    minimap.data[idx4 + 3] = a;
                }
            }
        }
    }
}

/**
 * Marca bien visible sobre el centro de `zona`: un disco relleno con una
 * cruz más larga encima. El mapa es ~1000x1000 bloques y el minimapa es 1:1
 * con él, así que un marcador de pocos bloques de lado (como la cruz de 5
 * que había antes) queda en unos pocos píxeles y no se ve una vez que el
 * <img> lo achica para mostrarlo en pantalla — de ahí que no se notara.
 */
function overlayBase(minimap, width, depth, zona, color) {
    const cx = Math.round(zona.x), cz = Math.round(zona.z);
    const r = (color >> 16) & 0xFF, g = (color >> 8) & 0xFF, b = color & 0xFF, a = 255;
    const pintar = (x, z) => {
        if (x < 0 || x >= width || z < 0 || z >= depth) return;
        const idx4 = (z * width + x) * 4;
        minimap.data[idx4] = r;
        minimap.data[idx4 + 1] = g;
        minimap.data[idx4 + 2] = b;
        minimap.data[idx4 + 3] = a;
    };
    const RADIO_DISCO = 14;
    for (let dz = -RADIO_DISCO; dz <= RADIO_DISCO; dz++) {
        for (let dx = -RADIO_DISCO; dx <= RADIO_DISCO; dx++) {
            if (dx * dx + dz * dz <= RADIO_DISCO * RADIO_DISCO) pintar(cx + dx, cz + dz);
        }
    }
    const BRAZO = 24;
    const ESPESOR = 2;
    for (let d = -BRAZO; d <= BRAZO; d++) {
        for (let e = -ESPESOR; e <= ESPESOR; e++) {
            pintar(cx + d, cz + e);
            pintar(cx + e, cz + d);
        }
    }
}

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
    configurarMundo,
    getFactorSuperficie,
    CONFIG_GENERATION,
    WORLD_CONFIG,
    TERRAIN_CONFIG,
    BLOCK_TYPES,
    BLOCK_PROPERTIES,
    isTintableMinimap,
    isTintableRender,
    isTransparent,
    placeStructure,
    generateMapPNGs,
    limpiarMinimapasViejos,
    tintBlock,
    tintBlockMinimap,
    tintBlockRender,
    getLastMinimapFile,
    setLastMinimapFile
};