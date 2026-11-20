// construirMapa.js - Genera un mapa completo: alturas, estructuras, chunks,
// luces e índice de salas.
//
// No tiene efectos al importarse. Pensado para correrse en un worker (el
// host decide dónde): ver `buffersTransferibles` para pasar el resultado sin
// copiar los buffers grandes.
//
// Opciones de `construirMapa(opciones)`:
//   - modo: 'zombies' | 'equipos' | otro (sin bases especiales).
// Configuración del mundo (tamaño, minimapas): ver `configurarMundo` en
// mapConfig.js. Datos de juego (autos, árboles, etc.): ver plugins/datos.js.
import { generateMapType3, generateVolumeType3 } from './mapType3.js';
import { WORLD_CONFIG, BLOCK_TYPES, isTintableMinimap, tintBlockMinimap } from './mapConfig.js';
import { idPaleta, claveTinte, compactarMapaAlturas } from '../formato/chunk_compacto.js';
import { CONFIG } from '../plugins/datos.js';
import { pluginsFaltantes } from '../plugins/registro.js';
import { COLORES_EQUIPO } from '../plugins/datos.js';
import { generarNidos } from './genera_nidos.js';
import { generarRefugios } from './genera_refugios.js';
import { elegirTiendas } from './genera_tiendas.js';
import { ID_LUZ_INTERIOR } from '../plugins/datos.js';

/**
 * Elige, para cada bando del modo zombies, una casa YA generada por el
 * algoritmo normal (nunca se construye nada nuevo) para que haga de base. Se
 * agrupan las estructuras por `parcelId` (cada parcela es una casa completa,
 * con todos sus ambientes y pisos) y se calcula la caja que la contiene.
 *
 * Las dos bases quedan en cuadras opuestas del mapa: una casa del cuadrante
 * noroeste para los humanos y otra del cuadrante sudeste para los zombies,
 * sorteada al azar entre las candidatas de cada cuadrante. Si algún
 * cuadrante no tiene casas (mapa chico o mala suerte), se cae a la candidata
 * más cercana a esa esquina entre todas las que hay.
 *
 * Devuelve `[zonaHumana, zonaZombie]`, cada una `{ x, z, radio }` en el mismo
 * formato que antes usaba `ZONAS_ESPECIALES`: centro de la casa elegida y un
 * radio que cubre su huella (con margen), para que `buscarSpawn` sortee
 * puntos de aparición dentro de ella.
 */
function elegirBasesEnEdificios(structures, width, depth) {
    const porParcela = new Map();
    for (const s of structures) {
        if (!s || !s.parcelId || s.type === 'spawn') continue;
        // `techo`: altura real del punto más alto de la casa (y + alto de la
        // sala). `maxHeightMap` sólo guarda el nivel del suelo, no los edificios.
        const tope = (s.y || 0) + (s.height || 0);
        let caja = porParcela.get(s.parcelId);
        if (!caja) {
            caja = { minX: s.x, minZ: s.z, maxX: s.x + s.width, maxZ: s.z + s.depth, techo: tope };
            porParcela.set(s.parcelId, caja);
        } else {
            caja.minX = Math.min(caja.minX, s.x);
            caja.minZ = Math.min(caja.minZ, s.z);
            caja.maxX = Math.max(caja.maxX, s.x + s.width);
            caja.maxZ = Math.max(caja.maxZ, s.z + s.depth);
            caja.techo = Math.max(caja.techo, tope);
        }
    }

    // sólo casas de un tamaño razonable: descarta restos de parcelas que no
    // llegaron a construirse (hueco demasiado chico para una casa real).
    // También se descartan las pegadas al borde del mapa: `buscarSpawn`
    // fuerza los puntos de aparición a quedar a `MARGEN_BORDE` del límite
    // (ver `multijugador.js`), así que una base ahí terminaría generando
    // jugadores fuera de su propia parcela, pisando el límite del mundo.
    const TAMANO_MIN = 20;
    const MARGEN_BASE = 40;
    const candidatas = [...porParcela.values()]
        .filter(c => (c.maxX - c.minX) >= TAMANO_MIN && (c.maxZ - c.minZ) >= TAMANO_MIN)
        .filter(c => c.minX >= MARGEN_BASE && c.maxX <= width - MARGEN_BASE &&
            c.minZ >= MARGEN_BASE && c.maxZ <= depth - MARGEN_BASE)
        .map(c => ({
            cx: (c.minX + c.maxX) / 2,
            cz: (c.minZ + c.maxZ) / 2,
            radio: Math.max(c.maxX - c.minX, c.maxZ - c.minZ) / 2 + 6,
            caja: { minX: c.minX, minZ: c.minZ, maxX: c.maxX, maxZ: c.maxZ, techo: c.techo }
        }));

    const medioX = width / 2, medioZ = depth / 2;
    const poolHumano = candidatas.filter(c => c.cx < medioX && c.cz < medioZ);
    const poolZombie = candidatas.filter(c => c.cx >= medioX && c.cz >= medioZ);

    const alAzar = (arr) => arr[Math.floor(Math.random() * arr.length)];
    // fallback: sin candidatas en el cuadrante propio, la más cercana a esa
    // esquina entre todas las casas del mapa (mejor eso que no tener base).
    const masCercanaA = (ex, ez) => candidatas.reduce((mejor, c) => {
        const d = Math.hypot(c.cx - ex, c.cz - ez);
        return (!mejor || d < mejor.d) ? { c, d } : mejor;
    }, null)?.c;

    const zonaHumana = poolHumano.length ? alAzar(poolHumano) : masCercanaA(0, 0);
    const zonaZombie = poolZombie.length ? alAzar(poolZombie) : masCercanaA(width, depth);

    return [
        zonaHumana && { x: zonaHumana.cx, z: zonaHumana.cz, radio: zonaHumana.radio, caja: zonaHumana.caja },
        zonaZombie && { x: zonaZombie.cx, z: zonaZombie.cz, radio: zonaZombie.radio, caja: zonaZombie.caja }
    ];
}

/** Luces del mapa: ambiente, sol y una point light en la sala inicial. */
function construirLuces(room) {
    const lights = [];

    // AmbientLight aumentada para iluminar escenas oscuras fuera de las fuentes directas
    lights.push({
        type: 'ambient',
        color: 0xFFFFFF,
        intensity: .5
    });

    // DirectionalLight para amanecer
    lights.push({
        type: 'directional',
        position: [0, 50, 0],
        color: 0xffffff,
        intensity: 5,
        castShadow: true
    });

    // Sólo se considera el comportamiento de tipo3. añadimos una PointLight
    // si la sala inicial (`room`) está definida.
    if (room) {
        const centerX = room.x + Math.floor(room.width / 2);
        const centerZ = room.z + Math.floor(room.depth / 2);
        const lightY = room.y + Math.floor(room.height / 2); // Centro vertical de la sala para mejor iluminación
        lights.push({
            type: 'point',
            position: [centerX, lightY, centerZ],
            color: 0xffffff,
            intensity: 10.0,
            distance: CONFIG.lighting.point.distance,
            castShadow: true
        });
    }

    return lights;
}

// Parte el volumen en chunks con el formato compacto de
// `cliente/chunks/chunk_compacto.js` (leer ahí el detalle): de cada chunk sólo
// se guardan las capas que no son subsuelo macizo ni cielo, y los tintes van
// en arrays tipados + paleta en lugar de un objeto por celda.
function dividirEnChunks(volume, chunkSize) {
    const chunks = {};
    const numChunksX = Math.ceil(volume.width  / chunkSize);
    const numChunksZ = Math.ceil(volume.depth  / chunkSize);
    const volH = volume.height;
    const volD = volume.depth;
    const RELLENO = BLOCK_TYPES.BROWN;   // subsuelo (ver generateVolumeType3)

    // Celdas escritas por encima de lo previsto para su columna (ver
    // `overflow` en volumeBuffer.js): casi nunca hay, pero si hay tienen que
    // entrar en el rango de capas de su chunk.
    const topeOverflow = new Map();   // chunkKey -> y máxima + 1
    for (const idx of volume.overflow.keys()) {
        const x = Math.floor(idx / (volH * volD));
        const resto = idx - x * volH * volD;
        const y = Math.floor(resto / volD);
        const z = resto - y * volD;
        const key = `${Math.floor(x / chunkSize)}_${Math.floor(z / chunkSize)}`;
        if ((topeOverflow.get(key) || 0) < y + 1) topeOverflow.set(key, y + 1);
    }

    for (let chunkX = 0; chunkX < numChunksX; chunkX++) {
        for (let chunkZ = 0; chunkZ < numChunksZ; chunkZ++) {
            const chunkKey = `${chunkX}_${chunkZ}`;
            const startX = chunkX * chunkSize;
            const endX   = Math.min(startX + chunkSize, volume.width);
            const startZ = chunkZ * chunkSize;
            const endZ   = Math.min(startZ + chunkSize, volume.depth);

            const cw = endX - startX;
            const cd = endZ - startZ;

            // Rango vertical que hace falta guardar: desde la primera capa
            // donde alguna columna deja de ser subsuelo hasta la última con
            // algún bloque.
            let yBase = volH;
            let yTope = topeOverflow.get(chunkKey) || 0;
            for (let lx = 0; lx < cw; lx++) {
                const gx = startX + lx;
                for (let lz = 0; lz < cd; lz++) {
                    const gz = startZ + lz;
                    let tope = volume.colHeights[gx * volD + gz];
                    while (tope > 0 && volume.getType(gx, tope - 1, gz) === 0) tope--;
                    if (tope > yTope) yTope = tope;
                    let piso = 0;
                    while (piso < yBase && volume.getType(gx, piso, gz) === RELLENO) piso++;
                    if (piso < yBase) yBase = piso;
                }
            }
            if (yTope <= yBase) {
                // chunk sin nada más que subsuelo: una capa (de aire) alcanza
                yBase = Math.min(yBase, volH - 1);
                yTope = yBase + 1;
            }
            const capas = yTope - yBase;

            // Uint8Array empaquetado: 4 bits/celda (2 celdas por byte), ya que
            // los tipos de bloque actuales van de 0 a 13 y entran en un nibble.
            // El nibble alto/bajo dentro del byte se elige con `idx & 1` (ver
            // leerVoxel/escribirVoxel en chunk_compacto.js).
            const chunkTypes = new Uint8Array(Math.ceil((cw * capas * cd) / 2));
            for (let lx = 0; lx < cw; lx++) {
                const gx = startX + lx;
                for (let yl = 0; yl < capas; yl++) {
                    const fila = (lx * capas + yl) * cd;
                    for (let lz = 0; lz < cd; lz++) {
                        const val = volume.getType(gx, yBase + yl, startZ + lz) & 0x0F;
                        if (val === 0) continue;
                        const dstIdx = fila + lz;
                        chunkTypes[dstIdx >> 1] |= val << ((dstIdx & 1) << 2);
                    }
                }
            }

            chunks[chunkKey] = {
                types:        chunkTypes,
                yBase,
                capas,
                relleno:      RELLENO,
                volumeWidth:  cw,
                volumeHeight: volH,
                volumeDepth:  cd,
                tintClaves:   null,
                tintIds:      null,
                tintN:        0,
                tintPaleta:   [null],
                startX,
                startZ,
                entities: []
            };
        }
    }

    // Tintes: UNA pasada por las celdas tintadas (antes se consultaba el Map
    // por cada una de las ~38 millones de celdas del mapa), repartiéndolas al
    // chunk que les toca. Clave y id de paleta van juntos en un solo número
    // (clave * 65536 + id) para poder ordenar por clave con un sort nativo.
    const porChunk = new Map();       // chunkKey -> number[]
    const idLocal = new Map();        // chunkKey -> Map<id global, id del chunk>
    for (const [idx, idGlobal] of volume.tints) {
        const x = Math.floor(idx / (volH * volD));
        const resto = idx - x * volH * volD;
        const y = Math.floor(resto / volD);
        const z = resto - y * volD;
        const chunkKey = `${Math.floor(x / chunkSize)}_${Math.floor(z / chunkSize)}`;
        const c = chunks[chunkKey];
        if (!c) continue;
        let ids = idLocal.get(chunkKey);
        if (!ids) { ids = new Map(); idLocal.set(chunkKey, ids); porChunk.set(chunkKey, []); }
        let id = ids.get(idGlobal);
        if (id === undefined) {
            const t = volume.paleta[idGlobal];
            id = idPaleta(c, t.tintMinimap || null, t.tintRender || null);
            ids.set(idGlobal, id);
        }
        if (id === 0) continue;
        porChunk.get(chunkKey).push(claveTinte(c, x - c.startX, y, z - c.startZ) * 65536 + id);
    }
    for (const [chunkKey, lista] of porChunk) {
        const c = chunks[chunkKey];
        const ordenado = Float64Array.from(lista).sort();
        const n = ordenado.length;
        c.tintClaves = new Uint32Array(n);
        c.tintIds = new Uint16Array(n);
        for (let i = 0; i < n; i++) {
            const v = ordenado[i];
            const clave = Math.floor(v / 65536);
            c.tintClaves[i] = clave;
            c.tintIds[i] = v - clave * 65536;
        }
        c.tintN = n;
    }

    return chunks;
}

// -----------------------------------------------------------------------------
// índice de salas para búsquedas rápidas por posición
// cada sala recibe un id numérico y se guarda en un diccionario `byId`.
// también generamos dos listas ordenadas (minX y minZ) para filtrar por ejes

function buildRoomIndex(structures) {
    const byId = Object.create(null);
    const sortedByMinX = [];
    const sortedByMinZ = [];
    let counter = 1;

    for (const s of structures) {
        if (s == null) continue;
        // consideramos únicamente elementos con caja delimitadora válida
        if (typeof s.x === 'number' && typeof s.z === 'number' &&
            typeof s.width === 'number' && typeof s.depth === 'number') {
            const id = counter++;
            s.roomId = id; // opcional, útil para depuración
            const minX = s.x;
            const minZ = s.z;
            const maxX = s.x + s.width - 1;
            const maxZ = s.z + s.depth - 1;
            const meta = { id, type: s.type || 'unknown', minX, minZ, maxX, maxZ };
            byId[id] = meta;
            sortedByMinX.push(meta);
            sortedByMinZ.push(meta);
        }
    }

    sortedByMinX.sort((a, b) => a.minX - b.minX);
    sortedByMinZ.sort((a, b) => a.minZ - b.minZ);

    return { byId, sortedByMinX, sortedByMinZ };
}

/**
 * Genera un mapa nuevo. Devuelve sólo datos (clonables con structuredClone,
 * así se puede pasar desde un worker): sin funciones ni instancias de clase.
 */
export function construirMapa(opciones = {}) {
    const faltan = pluginsFaltantes();
    if (faltan.length) {
        throw new Error(`construirMapa: faltan plugins de datos: ${faltan.join(', ')} (ver registrarPlugins)`);
    }
    const modo = opciones.modo ?? null;
    const { heightMap, maxHeightMap, structures, startPosition, room, surfaceTypeMap, entities, zonas } =
        generateMapType3(WORLD_CONFIG.width, WORLD_CONFIG.height, WORLD_CONFIG.volumeHeight);

    // modo zombies: las bases de cada bando son casas ya generadas por el
    // algoritmo normal (ver `elegirBasesEnEdificios`), nunca construcciones
    // nuevas. Se eligen ACÁ, antes de pintar el minimapa, para que éste
    // pueda marcar la base zombie (ver generateMapPNGs/generateVolumeType3).
    // modo equipos: una base por equipo (la base i es del equipo i, ver
    // EQUIPOS en cliente/equipos_config.js), con el color de cada equipo.
    let zonasEspeciales = null;
    if (modo === 'zombies' || modo === 'equipos') {
        const bases = elegirBasesEnEdificios(structures, WORLD_CONFIG.width, WORLD_CONFIG.height);
        const colores = modo === 'equipos'
            ? [COLORES_EQUIPO.azul, COLORES_EQUIPO.rojo]
            : [0x2f9dff, 0xff00ff];
        zonasEspeciales = bases.map((b, i) => b && { ...b, color: colores[i] });
        console.log('[mapa] bases elegidas entre las casas del mapa:', zonasEspeciales);
    }

    // nidos de zombies (supervivencia, §5): se deciden acá, con las alturas
    // todavía como arrays; el modo sólo decide si el servidor los usa.
    const diag = {};
    const nidos = generarNidos(zonas, {
        structures, entities, heightMap, surfaceTypeMap,
        width: WORLD_CONFIG.width, depth: WORLD_CONFIG.height,
        bases: [startPosition, zonasEspeciales && zonasEspeciales[0]], diag
    });
    console.log(`[mapa] ${nidos.length} nido(s) de zombies; puntos rechazados: ${JSON.stringify(diag)}`);

    // refugios subterráneos (§13): se deciden junto a los nidos (los esquivan) y
    // existen en todos los modos; el volumen ya sale excavado, sin excavación en
    // runtime. Cada uno aporta su luz fija de sala como entidad de chunk.
    const diagRef = {};
    const refugios = generarRefugios(zonas, {
        structures, entities, heightMap, surfaceTypeMap,
        width: WORLD_CONFIG.width, depth: WORLD_CONFIG.height, nidos, startPosition, diag: diagRef
    });
    for (const r of refugios) {
        entities.push({ type: 'entidad_objeto', model: ID_LUZ_INTERIOR, x: r.luz.x, y: r.luz.y, z: r.luz.z, siempre: true, refugio: true });
    }
    console.log(`[mapa] ${refugios.length} refugio(s) subterráneo(s) (${refugios.filter(r => r.salida === 'casa').length} con salida en una casa); descartes: ${JSON.stringify(diagRef)}`);

    // tiendas de supervivencia (mostrador + NPC, ver genera_tiendas.js): van en salas de
    // planta baja con puerta a la calle y sin botín; el servidor sólo las usa en supervivencia.
    const { tiendas } = elegirTiendas(structures, { width: WORLD_CONFIG.width, depth: WORLD_CONFIG.height });

    const volume = generateVolumeType3(WORLD_CONFIG.width, WORLD_CONFIG.height, WORLD_CONFIG.volumeHeight, heightMap, startPosition, room, surfaceTypeMap, structures, zonasEspeciales, refugios);

    const lights = construirLuces(room);
    console.log('Mapa generado exitosamente');

    // teñir un bloque debajo de la posición inicial para verlo fácilmente.
    // pintar únicamente en el minimapa (renderDefault se queda sin tintado)
    if (startPosition) {
        const sx = startPosition.x;
        const sy = Math.max(0, startPosition.y - 1);
        const sz = startPosition.z;
        const blockType = volume.getType(sx, sy, sz);
        if (blockType != null && isTintableMinimap(blockType)) {
            tintBlockMinimap(volume, sx, sy, sz, 0xff00ff, 0.5);
        }
    }

    let roomIndex = null;
    if (structures && Array.isArray(structures)) {
        roomIndex = buildRoomIndex(structures);
        console.log('Room index built:', Object.keys(roomIndex.byId).length, 'entries');
    }

    // partir el volumen en chunks (los datos viven en ellos desde acá)
    const chunks = dividirEnChunks(volume, WORLD_CONFIG.chunkSize);

    // Distribuir entidades globales a los chunks correspondientes (si existen)
    // Los autos NO van en los chunks: se mueven, así que los lleva `autos.js`
    // como estado propio (ver `mapa.autos`).
    const autos = [];
    if (entities && Array.isArray(entities)) {
        for (const ent of entities) {
            if (ent.type === 'vehiculo') { autos.push(ent); continue; }
            const cx = Math.floor(ent.x / WORLD_CONFIG.chunkSize);
            const cz = Math.floor(ent.z / WORLD_CONFIG.chunkSize);
            const key = `${cx}_${cz}`;
            if (!chunks[key]) continue;
            chunks[key].entities = chunks[key].entities || [];
            chunks[key].entities.push(ent);
        }
    }

    // Los mapas de altura salen del generador como arrays de arrays de
    // números; el mapa terminado los lleva como un byte por celda (ver
    // chunk_compacto.js). `maxHeightMap` casi siempre es idéntico a
    // `heightMap`: en ese caso va null y el que lo lee usa `heightMap`.
    const alturas = compactarMapaAlturas(heightMap) || heightMap;
    let alturasMax = compactarMapaAlturas(maxHeightMap) || maxHeightMap;
    if (alturas.datos && alturasMax && alturasMax.datos &&
        alturas.datos.length === alturasMax.datos.length &&
        alturas.datos.every((v, i) => v === alturasMax.datos[i])) {
        alturasMax = null;
    }

    return {
        heightMap: alturas, maxHeightMap: alturasMax, structures, startPosition, lights, chunks, roomIndex, autos,
        minimapFile: volume.minimapFile, zonasEspeciales, zonas, nidos, refugios, tiendas,
        modo
    };
}

/**
 * Buffers grandes de un mapa (voxels, tintes, mapas de altura), para pasarlos
 * en la lista de transferencia de `postMessage`: cambian de hilo sin copiarse.
 */
export function buffersTransferibles(mapa) {
    const vistos = new Set();
    const agregar = (v) => { if (v && ArrayBuffer.isView(v)) vistos.add(v.buffer); };
    for (const clave in mapa.chunks) {
        const c = mapa.chunks[clave];
        agregar(c.types);
        agregar(c.tintClaves);
        agregar(c.tintIds);
    }
    if (mapa.heightMap) agregar(mapa.heightMap.datos);
    if (mapa.maxHeightMap) agregar(mapa.maxHeightMap.datos);
    return [...vistos];
}
