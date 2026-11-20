// Lógica específica de una "cuadra" para el mapa tipo 3.
// Se ocupa de pintar veredas, parterres, delimitar parcelas y construir
// las casas/estructura interior. El archivo principal (mapType3.js) define
// la grilla de cuadras y calles y delega el trabajo de cada bloque a este módulo.

import { BLOCK_TYPES, WORLD_CONFIG } from './mapConfig.js';
import { processInterior } from './mapType3Center.js';
import { elegirArbol } from '../plugins/datos.js';
import { AUTOS, ORDEN_AUTOS, idEntidadAuto, PROPORCION_MOTOS } from '../plugins/datos.js';
import { ID_POSTE } from '../plugins/datos.js';
import { ID_LUZ_INTERIOR } from '../plugins/datos.js';

// Listas de autos por tipo. Se calculan al usarlas (no al cargar el módulo):
// los datos de autos llegan por plugin (ver plugins/registro.js).
// los drones de base los crea el juego, no se estacionan al azar.
function listasDeAutos() {
    return {
        MOTOS: ORDEN_AUTOS.filter(id => AUTOS[id].forma === 'moto'),
        CARROS: ORDEN_AUTOS.filter(id => AUTOS[id].forma !== 'moto' && AUTOS[id].forma !== 'drone'),
    };
}

// Constantes compartidas con mapType3.js
const blockZoneSize = 176; // tamaño de la cuadra en bloques (doble) ajustado para que el interior siga siendo 144
const veredaWidth = 16;    // ancho de la vereda en bloques (borde interior de la cuadra) duplicado
const streetWidth = 20;    // ancho de la calle en bloques (doble)
const patternSize = blockZoneSize + streetWidth;


// dimensiones de la sala inicial y de las casas (altura de casa igual a sala)
const roomWidth = 12;
const roomHeight = 12;
const roomDepth = 12;

// parque: 10% de las cuadras. Pasto en todo el suelo y muchos árboles, más juntos
// que en una vereda (distancia mínima entre troncos de 6 bloques en vez de 8).
const PROBABILIDAD_PARQUE = 0.10;
const DISTANCIA_ARBOL_PARQUE = 6;
const INTENTOS_ARBOL_PARQUE = 400;
const MARGEN_PARQUE = 4;            // sin árboles pegados a la calle
const RADIO_LIBRE_CENTRO_PARQUE = 8;

// parámetros para parterres
const patchSize = 2;               // 2x2
const gapBetweenPatches = 16;        // separación entre parterres (doble que antes)
const step = patchSize + gapBetweenPatches; // 18

// postes de alumbrado: uno cada POSTE_ESPACIADO bloques, pegados al cordón de
// la vereda (el borde que da a la calle), con el farol mirando hacia ella.
// Sólo forma por ahora, sin fuente de luz (ver cliente/modelo_poste.js).
const POSTE_ESPACIADO = 48; // el doble que antes (24): la mitad de postes por cuadra
const POSTE_MARGEN_ESQUINA = 10; // no pegado a la esquina, como los autos

// El árbol se planta en el CENTRO del parterre. Un bloque de índice i ocupa el
// intervalo [i, i+1) del mundo (es la convención de `fisica_mapa.js`, que pasa
// de mundo a bloque con Math.floor), así que un parterre que arranca en el
// bloque x0 y mide `patchSize` va de x0 a x0 + patchSize y su centro cae en
// x0 + patchSize/2. Antes se le restaba medio bloque y el árbol quedaba
// clavado en el centro del PRIMER bloque del parterre, con lo que de un lado
// le sobraba medio bloque y del otro bloque y medio: el tronco se salía al
// cantero en cuanto se lo escalaba. Con el centro bien puesto, el tronco tiene
// patchSize/2 bloques de radio para crecer, que es lo que da por cierto
// `cliente/arboles_config.js` en RADIO_MAX_TRONCO.
const patchCenterOffset = patchSize / 2;

// función auxiliar reutilizada por cada cuadra para evitar árboles demasiado
// cercanos unos de otros. Está encapsulada aquí ya que sólo se usa en este
// módulo y trabaja sobre el array "entities" que se pasa como argumento.
//
// La especie, el tamaño y la rotación los sortea `cliente/arboles_config.js` a
// partir de la posición del parterre: son los árboles procedurales de
// `cliente/modelo_arbol.js` y ya no hay un único GLTF repetido. El sorteo es
// determinista, así que el mismo parterre planta siempre el mismo árbol.
//
// La comparación de distancia mira TODOS los árboles, no los de la misma
// especie: con trece variedades, filtrar por modelo dejaría pasar dos árboles
// distintos superpuestos en las esquinas, donde se cruzan las dos hileras de
// la vereda.
function addTreeIfAllowed(entities, x, y, z, distanciaMinima = null) {
    const treeMinDistance = distanciaMinima ?? ((typeof WORLD_CONFIG.treeMinDistance === 'number') ? WORLD_CONFIG.treeMinDistance : 8);
    const treeMinDistanceSq = treeMinDistance * treeMinDistance;
    for (const ent of entities) {
        if (ent.arbol) {
            const dx = ent.x - x;
            const dz = ent.z - z;
            if ((dx * dx + dz * dz) < treeMinDistanceSq) {
                return false; // demasiado cerca: no añadir
            }
        }
    }
    const { model, escala, rotY } = elegirArbol(x, z);
    entities.push({ type: 'entidad_objeto', model, x, y, z, rotY, escala, arbol: true });
    return true;
}

// Genera todos los detalles de una única cuadra. Se invoca desde generateMapType3
// por cada bloqueStartX/Z que delimita una cuadra. Modifica los mapas y arrays
// que se le pasan por referencia.
function processBlock(blockStartX, blockStartZ, width, depth, baseY, heightMap, maxHeightMap, surfaceTypeMap, structures, entities, zonas) {
    const blockId = `${blockStartX}_${blockStartZ}`;
    if (Math.random() < PROBABILIDAD_PARQUE) {
        armarParque(blockStartX, blockStartZ, width, depth, heightMap, surfaceTypeMap, entities);
        addVehiculos(blockStartX, blockStartZ, width, depth, heightMap, entities);
        // zona de control: un parque es una única zona grande, sin parcelas ni
        // veredas separadas (ver plan_zonas_control.md, "parques" pendiente).
        if (zonas) {
            zonas.push({
                id: `${blockId}:parque`, tipo: 'parque',
                x0: blockStartX, z0: blockStartZ,
                x1: blockStartX + blockZoneSize, z1: blockStartZ + blockZoneSize
            });
        }
        agregarZonasCalle(blockStartX, blockStartZ, blockId, zonas);
        agregarPostes(blockStartX, blockStartZ, width, depth, heightMap, entities);
        return;
    }
    // procesar interior de la cuadra (parcelas y casas)
    const structuresAntes = structures.length;
    processInterior(blockStartX, blockStartZ, width, depth, baseY, heightMap, surfaceTypeMap, structures, roomWidth, roomHeight, zonas);
    agregarLucesInteriores(structures, structuresAntes, entities);
    agregarZonasVereda(blockStartX, blockStartZ, blockId, zonas);
    agregarZonasCalle(blockStartX, blockStartZ, blockId, zonas);
    // 2. añadir parterres en las veredas de esta cuadra
    const patchOffset = Math.min(
        veredaWidth - patchSize,
        Math.floor(veredaWidth / 2) + 1
    );
    const alongLineStartOffset = patchOffset;

    // Vereda norte (top)
    const zTop = blockStartZ + patchOffset;
    const maxOX_north = blockZoneSize - patchSize - patchOffset;
    for (let ox = alongLineStartOffset; ox <= maxOX_north; ox += step) {
        const x0 = blockStartX + ox;
        const centerXi = x0;
        const centerZi = zTop;
        if (!(centerXi >= 0 && centerXi < width && centerZi >= 0 && centerZi < depth && surfaceTypeMap[centerXi][centerZi] === BLOCK_TYPES.VEREDA)) continue;
        const centerY = heightMap[centerXi] && typeof heightMap[centerXi][centerZi] === 'number' ? heightMap[centerXi][centerZi] : baseY;
        const treeY = Math.max(0, centerY - 1);
        if (!addTreeIfAllowed(entities, x0 + patchCenterOffset, treeY, zTop + patchCenterOffset)) continue;
        for (let dx = 0; dx < patchSize; dx++) {
            for (let dz = 0; dz < patchSize; dz++) {
                const x = x0 + dx;
                const z = zTop + dz;
                if (x >= 0 && x < width && z >= 0 && z < depth && surfaceTypeMap[x][z] === BLOCK_TYPES.VEREDA) {
                    surfaceTypeMap[x][z] = BLOCK_TYPES.GREEN;
                    if (heightMap[x] && typeof heightMap[x][z] === 'number') {
                        heightMap[x][z] = Math.max(0, heightMap[x][z] - 1);
                        if (maxHeightMap && maxHeightMap[x]) {
                            maxHeightMap[x][z] = heightMap[x][z];
                        }
                    }
                }
            }
        }
    }

    // Vereda sur (bottom)
    const zBottom = blockStartZ + blockZoneSize - patchOffset - patchSize;
    const maxOX_south = blockZoneSize - patchSize - patchOffset;
    for (let ox = alongLineStartOffset; ox <= maxOX_south; ox += step) {
        const x0 = blockStartX + ox;
        const centerXi = x0;
        const centerZi = zBottom;
        if (!(centerXi >= 0 && centerXi < width && centerZi >= 0 && centerZi < depth && surfaceTypeMap[centerXi][centerZi] === BLOCK_TYPES.VEREDA)) continue;
        const centerY = heightMap[centerXi] && typeof heightMap[centerXi][centerZi] === 'number' ? heightMap[centerXi][centerZi] : baseY;
        const treeY = Math.max(0, centerY - 1);
        if (!addTreeIfAllowed(entities, x0 + patchCenterOffset, treeY, zBottom + patchCenterOffset)) continue;
        for (let dx = 0; dx < patchSize; dx++) {
            for (let dz = 0; dz < patchSize; dz++) {
                const x = x0 + dx;
                const z = zBottom + dz;
                if (x >= 0 && x < width && z >= 0 && z < depth && surfaceTypeMap[x][z] === BLOCK_TYPES.VEREDA) {
                    surfaceTypeMap[x][z] = BLOCK_TYPES.GREEN;
                    if (heightMap[x] && typeof heightMap[x][z] === 'number') {
                        heightMap[x][z] = Math.max(0, heightMap[x][z] - 1);
                        if (maxHeightMap && maxHeightMap[x]) {
                            maxHeightMap[x][z] = heightMap[x][z];
                        }
                    }
                }
            }
        }
    }

    // Vereda oeste (left)
    const xLeft = blockStartX + patchOffset;
    const maxOZ_west = blockZoneSize - patchSize - patchOffset;
    for (let oz = alongLineStartOffset; oz <= maxOZ_west; oz += step) {
        const z0 = blockStartZ + oz;
        const centerXi = xLeft;
        const centerZi = z0;
        if (!(centerXi >= 0 && centerXi < width && centerZi >= 0 && centerZi < depth && surfaceTypeMap[centerXi][centerZi] === BLOCK_TYPES.VEREDA)) continue;
        const centerY = heightMap[centerXi] && typeof heightMap[centerXi][centerZi] === 'number' ? heightMap[centerXi][centerZi] : baseY;
        const treeY = Math.max(0, centerY - 1);
        if (!addTreeIfAllowed(entities, xLeft + patchCenterOffset, treeY, z0 + patchCenterOffset)) continue;
        for (let dx = 0; dx < patchSize; dx++) {
            for (let dz = 0; dz < patchSize; dz++) {
                const x = xLeft + dx;
                const z = z0 + dz;
                if (x >= 0 && x < width && z >= 0 && z < depth && surfaceTypeMap[x][z] === BLOCK_TYPES.VEREDA) {
                    surfaceTypeMap[x][z] = BLOCK_TYPES.GREEN;
                    if (heightMap[x] && typeof heightMap[x][z] === 'number') {
                        heightMap[x][z] = Math.max(0, heightMap[x][z] - 1);
                        if (maxHeightMap && maxHeightMap[x]) {
                            maxHeightMap[x][z] = heightMap[x][z];
                        }
                    }
                }
            }
        }
    }

    // Vereda este (right)
    const xRight = blockStartX + blockZoneSize - patchOffset - patchSize;
    const maxOZ_east = blockZoneSize - patchSize - patchOffset;
    for (let oz = alongLineStartOffset; oz <= maxOZ_east; oz += step) {
        const z0 = blockStartZ + oz;
        const centerXi = xRight;
        const centerZi = z0;
        if (!(centerXi >= 0 && centerXi < width && centerZi >= 0 && centerZi < depth && surfaceTypeMap[centerXi][centerZi] === BLOCK_TYPES.VEREDA)) continue;
        const centerY = heightMap[centerXi] && typeof heightMap[centerXi][centerZi] === 'number' ? heightMap[centerXi][centerZi] : baseY;
        const treeY = Math.max(0, centerY - 1);
        if (!addTreeIfAllowed(entities, xRight + patchCenterOffset, treeY, z0 + patchCenterOffset)) continue;
        for (let dx = 0; dx < patchSize; dx++) {
            for (let dz = 0; dz < patchSize; dz++) {
                const x = xRight + dx;
                const z = z0 + dz;
                if (x >= 0 && x < width && z >= 0 && z < depth && surfaceTypeMap[x][z] === BLOCK_TYPES.VEREDA) {
                    surfaceTypeMap[x][z] = BLOCK_TYPES.GREEN;
                    if (heightMap[x] && typeof heightMap[x][z] === 'number') {
                        heightMap[x][z] = Math.max(0, heightMap[x][z] - 1);
                        if (maxHeightMap && maxHeightMap[x]) {
                            maxHeightMap[x][z] = heightMap[x][z];
                        }
                    }
                }
            }
        }
    }
    addVehiculos(blockStartX, blockStartZ, width, depth, heightMap, entities);
    agregarPostes(blockStartX, blockStartZ, width, depth, heightMap, entities);
}

// --- zonas de control (modo equipos) ------------------------------------------
//
// Las 4 tiras de vereda de una cuadra, como zonas separadas (una por lado). Las
// esquinas quedan del lado de la vereda norte/sur para no superponer zonas.
function agregarZonasVereda(blockStartX, blockStartZ, blockId, zonas) {
    if (!zonas) return;
    zonas.push(
        { id: `${blockId}:vereda:N`, tipo: 'vereda', x0: blockStartX, z0: blockStartZ, x1: blockStartX + blockZoneSize, z1: blockStartZ + veredaWidth },
        { id: `${blockId}:vereda:S`, tipo: 'vereda', x0: blockStartX, z0: blockStartZ + blockZoneSize - veredaWidth, x1: blockStartX + blockZoneSize, z1: blockStartZ + blockZoneSize },
        { id: `${blockId}:vereda:O`, tipo: 'vereda', x0: blockStartX, z0: blockStartZ + veredaWidth, x1: blockStartX + veredaWidth, z1: blockStartZ + blockZoneSize - veredaWidth },
        { id: `${blockId}:vereda:E`, tipo: 'vereda', x0: blockStartX + blockZoneSize - veredaWidth, z0: blockStartZ + veredaWidth, x1: blockStartX + blockZoneSize, z1: blockStartZ + blockZoneSize - veredaWidth }
    );
}

// Cada cuadra se queda con la calle de su lado este y la de su lado sur (la
// misma convención que `addVehiculos`, así ninguna calle se cuenta dos veces).
// La esquina sureste (donde se cruzan ambas calles) queda del lado de la zona
// sur para que, igual que con las veredas, no se superpongan.
function agregarZonasCalle(blockStartX, blockStartZ, blockId, zonas) {
    if (!zonas) return;
    zonas.push(
        { id: `${blockId}:calle:S`, tipo: 'calle', x0: blockStartX, z0: blockStartZ + blockZoneSize, x1: blockStartX + blockZoneSize + streetWidth, z1: blockStartZ + blockZoneSize + streetWidth },
        { id: `${blockId}:calle:E`, tipo: 'calle', x0: blockStartX + blockZoneSize, z0: blockStartZ, x1: blockStartX + blockZoneSize + streetWidth, z1: blockStartZ + blockZoneSize }
    );
}

// --- parque -------------------------------------------------------------------
//
// Con probabilidad PROBABILIDAD_PARQUE la cuadra entera es un parque: todo el
// suelo (veredas incluidas) queda como pasto, no hay casas ni parterres y se
// planta un bosque de árboles repartidos al azar. No se toca la altura, así que
// se camina igual que por una vereda.
function armarParque(blockStartX, blockStartZ, width, depth, heightMap, surfaceTypeMap, entities) {
    for (let dx = 0; dx < blockZoneSize; dx++) {
        for (let dz = 0; dz < blockZoneSize; dz++) {
            const x = blockStartX + dx;
            const z = blockStartZ + dz;
            if (x < width && z < depth) surfaceTypeMap[x][z] = BLOCK_TYPES.GREEN;
        }
    }

    // centro de la cuadra: ahí cae la sala de inicio (ver mapType3Center.js),
    // así que no se planta nada alrededor para que el jugador no nazca tronco adentro
    const centroX = blockStartX + blockZoneSize / 2;
    const centroZ = blockStartZ + blockZoneSize / 2;
    const radioLibreCentro = RADIO_LIBRE_CENTRO_PARQUE;

    for (let i = 0; i < INTENTOS_ARBOL_PARQUE; i++) {
        const x = blockStartX + MARGEN_PARQUE + Math.random() * (blockZoneSize - 2 * MARGEN_PARQUE);
        const z = blockStartZ + MARGEN_PARQUE + Math.random() * (blockZoneSize - 2 * MARGEN_PARQUE);
        const xi = Math.floor(x);
        const zi = Math.floor(z);
        if (xi >= width || zi >= depth) continue;
        if ((x - centroX) ** 2 + (z - centroZ) ** 2 < radioLibreCentro ** 2) continue;
        const y = Math.max(0, heightMap[xi][zi] - 1);
        addTreeIfAllowed(entities, xi + 0.5, y, zi + 0.5, DISTANCIA_ARBOL_PARQUE);
    }
}

// --- autos estacionados -------------------------------------------------------
//
// Cada cuadra se queda con la calle de su lado este y la de su lado sur (la
// del oeste y la del norte son las de la cuadra vecina), así ninguna calle
// recibe autos dos veces. Se estacionan en dos carriles, a 5 y a 15 bloques del
// cordón de la calle de 20: el centro queda libre para pasar.
//
// Sorteo determinista por cuadra (mismo mapa = mismos autos), con la misma
// idea que `elegirArbol`.

const AUTOS_MIN = 2;
const AUTOS_MAX = 3;
const CARRILES = [5, 15];
const MARGEN_CUADRA = 14;    // a lo largo de la calle, lejos de las esquinas
const SEPARACION_AUTOS = 18;

function crearRng(semilla) {
    let s = semilla >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function addVehiculos(blockStartX, blockStartZ, width, depth, heightMap, entities) {
    const listas = listasDeAutos();
    const rng = crearRng(Math.imul(blockStartX + 1, 73856093) ^ Math.imul(blockStartZ + 1, 19349663));
    const cantidad = AUTOS_MIN + Math.floor(rng() * (AUTOS_MAX - AUTOS_MIN + 1));
    const colocados = [];
    // Se reparte por cuenta, no por sorteo: moto cada vez que las que hay hasta
    // ahora no alcanzan para la proporción pedida. Así el mapa da casi exacto el
    // 35% sin depender de la suerte (con 2 o 3 autos por cuadra, el azar solo
    // se desviaría mucho).
    let total = 0, motos = 0;
    for (const e of entities) {
        if (e.type !== 'vehiculo') continue;
        total++;
        if (AUTOS[e.model.slice('auto_'.length)].forma === 'moto') motos++;
    }

    for (let intentos = 0; colocados.length < cantidad && intentos < 40; intentos++) {
        const calleEste = rng() < 0.5;
        const carril = CARRILES[rng() < 0.5 ? 0 : 1];
        const t = MARGEN_CUADRA + rng() * (blockZoneSize - 2 * MARGEN_CUADRA);

        // calleEste: la calle corre a lo largo de Z; si no, a lo largo de X
        const x = calleEste ? blockStartX + blockZoneSize + carril : blockStartX + t;
        const z = calleEste ? blockStartZ + t : blockStartZ + blockZoneSize + carril;

        const lista = motos < Math.round(PROPORCION_MOTOS * (total + 1)) ? listas.MOTOS : listas.CARROS;
        const modelo = lista[Math.floor(rng() * lista.length)];
        const medio = AUTOS[modelo].largo / 2 + 1;
        // el auto entero tiene que caer dentro del mapa
        if (x + medio >= width || z + medio >= depth || x - medio < 0 || z - medio < 0) continue;
        if (colocados.some(c => (c.x - x) ** 2 + (c.z - z) ** 2 < SEPARACION_AUTOS ** 2)) continue;

        const y = heightMap[Math.floor(x)][Math.floor(z)];
        // frente hacia un sentido u otro, con un pequeño desvío de estacionado
        const sentido = rng() < 0.5 ? 1 : -1;
        const base = calleEste ? -Math.PI / 2 : 0;
        const rotY = base + (sentido > 0 ? 0 : Math.PI) + (rng() - 0.5) * 0.1;

        const ent = { type: 'vehiculo', model: idEntidadAuto(modelo), x, y, z, rotY };
        colocados.push(ent);
        entities.push(ent);
        total++;
        if (lista === listas.MOTOS) motos++;
    }
}

// --- postes de alumbrado -------------------------------------------------------
//
// Misma convención que `addVehiculos`/`agregarZonasCalle`: cada cuadra es
// dueña de la calle de su lado este y de su lado sur (las del oeste y el
// norte las pone la cuadra vecina), así ninguna calle recibe postes dos
// veces. Pero cada calle completa (ambas veredas) la planta esta misma
// función: el lado "propio" (pegado al cordón de esta cuadra) y el lado
// "opuesto" (pegado al cordón de la cuadra vecina, al otro lado de la
// calle), con las filas intercaladas medio paso entre sí (zigzag), como el
// alumbrado real. El farol siempre mira hacia la calle, así que cada lado
// usa la rotación contraria.
// Tipos de estructura que no son una habitación habitable: el pasillo no
// tiene nada que iluminar en especial (ya recibe luz de las habitaciones
// contiguas) y la caja de escalera queda atravesada por el hueco de la
// escalera, donde una luz fija en el centro quedaría flotando en el aire.
export const TIPOS_SIN_LUZ_INTERIOR = new Set(['hallway', 'escalera']);

// Luz fija por habitación: una por cada estructura que `processInterior`
// (mapType3Center.js / genera_casa/*) acaba de agregar a `structures` en
// esta cuadra (de ahí `desde`, el largo del array antes de llamarla). Mismo
// patrón que `agregarPostes`: el servidor ya conoce la geometría exacta de
// cada sala (ver `createRoom` en genera_casa/generadorCasa.js), así que el
// centro sale directo de esos datos sin tocar el heightMap ni el hilo
// principal del cliente (ver cliente/luces_interiores.js para el pool fijo
// de PointLight que la consume, encendida/apagada con el ciclo día/noche).
function agregarLucesInteriores(structures, desde, entities) {
    for (let i = desde; i < structures.length; i++) {
        const s = structures[i];
        // luz de la casilla de la escalera en la azotea (ver planRoofExtras):
        // `siempre` = de noche está prendida sí o sí (las de habitación se
        // sortean, ver cliente/chunks/world_voxel.js)
        if (s.casillaAzotea) {
            const l = s.casillaAzotea.luz;
            entities.push({ type: 'entidad_objeto', model: ID_LUZ_INTERIOR, x: l.x, y: l.y, z: l.z, siempre: true });
        }
        if (TIPOS_SIN_LUZ_INTERIOR.has(s.type)) continue;
        entities.push({
            type: 'entidad_objeto',
            model: ID_LUZ_INTERIOR,
            x: s.x + s.width / 2,
            y: s.y + s.height - 1.5,
            z: s.z + s.depth / 2
        });
    }
}

function agregarPostes(blockStartX, blockStartZ, width, depth, heightMap, entities) {
    const desde = POSTE_MARGEN_ESQUINA;
    const hasta = blockZoneSize - POSTE_MARGEN_ESQUINA;
    if (hasta <= desde) return;
    const mitadPaso = POSTE_ESPACIADO / 2;

    // calle del sur: vereda propia (borde sur de esta cuadra, farol hacia
    // +Z) y vereda opuesta (borde norte de la cuadra vecina del sur, al otro
    // lado de la calle, farol hacia -Z), intercaladas en X.
    const zSur = blockStartZ + blockZoneSize - 1;
    const zSurOpuesto = zSur + streetWidth + 1;
    for (let ox = desde; ox <= hasta; ox += POSTE_ESPACIADO) {
        const x = blockStartX + ox;
        if (x >= 0 && x < width && zSur >= 0 && zSur < depth) {
            const y = Math.max(0, (heightMap[x] && heightMap[x][zSur]) || 0);
            entities.push({ type: 'entidad_objeto', model: ID_POSTE, x: x + 0.5, y, z: zSur + 0.5, rotY: 0 });
        }
    }
    for (let ox = desde + mitadPaso; ox <= hasta; ox += POSTE_ESPACIADO) {
        const x = blockStartX + ox;
        if (x >= 0 && x < width && zSurOpuesto >= 0 && zSurOpuesto < depth) {
            const y = Math.max(0, (heightMap[x] && heightMap[x][zSurOpuesto]) || 0);
            entities.push({ type: 'entidad_objeto', model: ID_POSTE, x: x + 0.5, y, z: zSurOpuesto + 0.5, rotY: Math.PI });
        }
    }

    // calle del este: vereda propia (borde este de esta cuadra, farol hacia
    // +X) y vereda opuesta (borde oeste de la cuadra vecina del este, farol
    // hacia -X), intercaladas en Z.
    const xEste = blockStartX + blockZoneSize - 1;
    const xEsteOpuesto = xEste + streetWidth + 1;
    for (let oz = desde; oz <= hasta; oz += POSTE_ESPACIADO) {
        const z = blockStartZ + oz;
        if (xEste >= 0 && xEste < width && z >= 0 && z < depth) {
            const y = Math.max(0, (heightMap[xEste] && heightMap[xEste][z]) || 0);
            entities.push({ type: 'entidad_objeto', model: ID_POSTE, x: xEste + 0.5, y, z: z + 0.5, rotY: Math.PI / 2 });
        }
    }
    for (let oz = desde + mitadPaso; oz <= hasta; oz += POSTE_ESPACIADO) {
        const z = blockStartZ + oz;
        if (xEsteOpuesto >= 0 && xEsteOpuesto < width && z >= 0 && z < depth) {
            const y = Math.max(0, (heightMap[xEsteOpuesto] && heightMap[xEsteOpuesto][z]) || 0);
            entities.push({ type: 'entidad_objeto', model: ID_POSTE, x: xEsteOpuesto + 0.5, y, z: z + 0.5, rotY: -Math.PI / 2 });
        }
    }
}

export {
    blockZoneSize,
    veredaWidth,
    streetWidth,
    patternSize,
    processBlock
};
