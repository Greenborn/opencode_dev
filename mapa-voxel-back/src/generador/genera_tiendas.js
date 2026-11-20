// genera_tiendas.js - Decide las tiendas del mapa (supervivencia, ver
// cliente/tiendas_config.js). Cada tienda es una sala de planta baja que da a la
// calle (tiene puerta de frente). El mostrador va a `DIST_MOSTRADOR` celdas del
// fondo de la sala, con el NPC detrás y la entrada libre delante.
//
// Reparto uniforme: el mapa se divide en COLUMNAS franjas (una por tienda) y se elige
// una sala candidata por franja. Así las tiendas quedan distribuidas por todo el
// mapa y no apiladas en un barrio. Si una celda no tiene candidatas se toma la
// más cercana al centro de la celda entre las que quedan.
//
// Sólo se elige entre salas sin botín fijo ni armario: no se quita nada a las
// otras modalidades. Las salas elegidas quedan marcadas con `sala.tienda = true`.

import { TIENDAS_POR_MAPA, ROT_PUERTA, ALTO_GONDOLA } from '../plugins/datos.js';
import { ESCALA_SUPERFICIE } from '../plugins/datos.js';

/**
 * Tiendas de este mapa: la densidad de referencia por la superficie de la sala.
 * Se calcula al usarla (los datos llegan por plugin, ver plugins/registro.js).
 */
function cantidadMapa() {
    return Math.max(1, Math.round(TIENDAS_POR_MAPA * ESCALA_SUPERFICIE));
}
const FILAS = 1;
/** Celdas entre el mostrador y el fondo de la sala (el NPC queda en la celda de atrás). */
const DIST_MOSTRADOR = 4;
/** Largo del mostrador en celdas. */
const LARGO_MOSTRADOR = 4;
/** Tipos de sala que pueden ser tienda (no pasillo, escalera ni spawn). */
const TIPOS = new Set(['banio', 'cocina', 'comedor', 'dormitorio', 'living']);

/** Lado de la calle de la sala ('N','S','E','O') o null si no tiene puerta de frente en planta baja. */
function ladoCalle(s) {
    if (!s.hasFrontDoor || (s.floor || 0) !== 0) return null;
    if (s.frontNorth) return 'N';
    if (s.frontSouth) return 'S';
    if (s.frontEast) return 'E';
    if (s.frontWest) return 'O';
    return null;
}

/**
 * Geometría de la tienda dentro de la sala `s` con la calle en `lado`.
 * Devuelve los datos del mostrador y del NPC en coordenadas de mundo, o null
 * si la sala es demasiado chica o el mostrador tapa el hueco de la escalera.
 */
export function geometriaTienda(s, lado) {
    const alongZ = lado === 'N' || lado === 'S';          // la calle está en un lado de z
    const L = alongZ ? s.depth : s.width;                 // largo hacia el fondo (desde la puerta)
    const M = alongZ ? s.width : s.depth;                 // ancho de la sala (paralelo a la puerta)
    if (L < DIST_MOSTRADOR + 3 || M < LARGO_MOSTRADOR + 2) return null;

    // coordenada de mundo de la celda r (distancia desde la puerta) y de la celda m (lateral)
    const celdaAxis = (r) => {
        if (lado === 'N') return s.z + r;                    // puerta en z mínimo
        if (lado === 'S') return s.z + s.depth - 1 - r;     // puerta en z máximo
        if (lado === 'O') return s.x + r;                   // puerta en x mínimo
        return s.x + s.width - 1 - r;                       // E: puerta en x máximo
    };
    const celdaLat = (m) => (alongZ ? s.x + m : s.z + m);

    const rMostrador = L - DIST_MOSTRADOR;                  // fila del mostrador
    const rNpc = rMostrador + 1;                            // detrás, hacia el fondo
    const rUso = rMostrador - 1;                            // delante, lado de la puerta

    const mc = Math.floor(M / 2);
    let m0 = Math.max(1, mc - Math.floor(LARGO_MOSTRADOR / 2));
    let m1 = Math.min(M - 2, m0 + LARGO_MOSTRADOR - 1);
    m0 = Math.max(1, m1 - LARGO_MOSTRADOR + 1);
    const largo = m1 - m0 + 1;

    // el hueco de la escalera (si lo hay) no puede quedar debajo del mostrador
    const keep = s.stairKeepOut;
    if (keep) {
        for (let m = m0; m <= m1; m++) {
            const x = alongZ ? celdaLat(m) : celdaAxis(rMostrador);
            const z = alongZ ? celdaAxis(rMostrador) : celdaLat(m);
            if (x >= keep.x0 && x < keep.x1 && z >= keep.z0 && z < keep.z1) return null;
        }
    }

    // góndolas con exposición junto a las paredes laterales: la celda 0 y la M-1 son el muro,
    // así que la góndola va en la celda 1 y en la M-2 (libres del mostrador).
    // Van en las filas 2..4 (o hasta el mostrador), así la fila 0 queda libre para entrar.
    // Son dos filas como mínimo; si no entran, la sala se queda sin góndolas.
    const gondolas = [];
    const r0 = 2, r1 = Math.min(4, rMostrador - 2);
    if (r1 - r0 + 1 >= 2) {
        for (const m of [1, M - 2]) {
            let libre = true;
            for (let r = r0; keep && r <= r1; r++) {
                const x = alongZ ? celdaLat(m) : celdaAxis(r);
                const z = alongZ ? celdaAxis(r) : celdaLat(m);
                if (x >= keep.x0 && x < keep.x1 && z >= keep.z0 && z < keep.z1) libre = false;
            }
            if (!libre) continue;
            const ra = celdaAxis(r0), rb = celdaAxis(r1);
            const a0 = Math.min(ra, rb), a1 = Math.max(ra, rb) + 1;   // borde a borde
            const latC = celdaLat(m) + 0.5;
            const c = alongZ ? { x: latC, z: (a0 + a1) / 2 } : { x: (a0 + a1) / 2, z: latC };
            gondolas.push({ x: c.x, z: c.z, hl: (a1 - a0) / 2, hw: 0.4, rotY: alongZ ? Math.PI / 2 : 0 });
        }
    }

    const lateralCentro = celdaLat(m0) + largo / 2;         // borde a borde: m0 .. m1+1
    const axisMostrador = celdaAxis(rMostrador) + 0.5;
    const axisNpc = celdaAxis(rNpc) + 0.5;
    const axisUso = celdaAxis(rUso) + 0.5;

    // coordenadas de mundo (x, z) según el eje
    const en = (axis, lat) => (alongZ ? { x: lat, z: axis } : { x: axis, z: lat });
    const centro = en(axisMostrador, lateralCentro);
    const npc = en(axisNpc, celdaLat(Math.floor((m0 + m1) / 2)) + 0.5);
    const uso = en(axisUso, lateralCentro);

    // caja de colisión del mostrador: hl a lo largo de la pared (x si rotY=0), hw hacia la calle
    const rotY = alongZ ? 0 : Math.PI / 2;
    return {
        largo,
        // rotY 0: el largo va en x; rotY π/2: el largo va en z (ver cajaDeMostrador)
        mostrador: { x: centro.x, z: centro.z, hl: largo / 2, hw: 0.5, rotY },
        gondolas,
        npc: { x: npc.x, z: npc.z, rot: ROT_PUERTA[lado] },
        uso: { x: uso.x, z: uso.z }
    };
}

/**
 * Elige hasta `cantidad` salas para tiendas y devuelve
 * { tiendas, diag }. Cada tienda: { id, sala (tipo), x, y, z (centro del mostrador),
 * npc:{x,y,z,rot}, uso:{x,z}, caja:{x,z,hl,hw,rotY,y0,y1}, lado }.
 * `width`/`depth` son el tamaño del mapa (WORLD_CONFIG).
 */
export function elegirTiendas(structures, { width, depth, cantidad = cantidadMapa(), random = Math.random } = {}) {
    const COLUMNAS = cantidad;   // una franja por tienda: cubren el mapa de punta a punta
    const diag = { candidatas: 0, sinGeometria: 0 };
    const candidatas = [];
    for (const s of structures || []) {
        if (!s || s.type === undefined || !TIPOS.has(s.type)) continue;
        if (s.width == null || s.depth == null || s.x == null || s.z == null) continue;
        if (s.lootSpot || (s.armarios && s.armarios.length)) continue;
        const lado = ladoCalle(s);
        if (!lado) continue;
        const geo = geometriaTienda(s, lado);
        if (!geo) { diag.sinGeometria++; continue; }
        candidatas.push({ sala: s, lado, geo, cx: s.x + s.width / 2, cz: s.z + s.depth / 2 });
    }
    diag.candidatas = candidatas.length;

    const elegidas = [];
    const usadas = new Set();
    const cw = width / COLUMNAS, ch = depth / FILAS;
    const celdas = [];
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLUMNAS; c++) celdas.push({ c, f });
    // mezclar el orden de las celdas: si faltan candidatas, no siempre se quedan sin tienda las mismas
    for (let i = celdas.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [celdas[i], celdas[j]] = [celdas[j], celdas[i]];
    }
    for (const { c, f } of celdas) {
        if (elegidas.length >= cantidad) break;
        const x0 = c * cw, x1 = x0 + cw, z0 = f * ch, z1 = z0 + ch;
        const enCelda = candidatas.filter(k => !usadas.has(k) && k.cx >= x0 && k.cx < x1 && k.cz >= z0 && k.cz < z1);
        let elegida = enCelda.length ? enCelda[Math.floor(random() * enCelda.length)] : null;
        if (!elegida) {
            // celda vacía: la candidata libre más cercana al centro de la celda
            const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
            let md = Infinity;
            for (const k of candidatas) {
                if (usadas.has(k)) continue;
                const d = Math.hypot(k.cx - mx, k.cz - mz);
                if (d < md) { md = d; elegida = k; }
            }
        }
        if (!elegida) continue;
        usadas.add(elegida);
        elegidas.push(elegida);
    }

    const tiendas = elegidas.map((k, id) => {
        const s = k.sala;
        s.tienda = true;
        s.tiendaLado = k.lado;   // fachada de calle: ahí va el cartel (ver cartel_tienda.js)
        const m = k.geo.mostrador;
        return {
            id, sala: s.type, lado: k.lado,
            x: m.x, y: s.y + 1, z: m.z,
            npc: { x: k.geo.npc.x, y: s.y + 1, z: k.geo.npc.z, rot: k.geo.npc.rot },
            uso: k.geo.uso,
            // huella de la sala (x0,z0,x1,z1): la bandera de la banda que la conquista va dentro de ella
            sala_rect: { x0: s.x, z0: s.z, x1: s.x + s.width, z1: s.z + s.depth },
            caja: { x: m.x, z: m.z, hl: m.hl, hw: m.hw, rotY: m.rotY, y0: s.y + 1, y1: s.y + 1 + 2, especie: 'mostrador' },
            // góndolas con exposición: cajas de colisión propias (ver cliente/multijugador/tiendas.js)
            gondolas: k.geo.gondolas.map(g => ({ ...g, y0: s.y + 1, y1: s.y + 1 + ALTO_GONDOLA, especie: 'gondola' }))
        };
    });
    diag.elegidas = tiendas.length;
    console.log(`[tiendas] ${tiendas.length} de ${cantidad} tiendas en el mapa (candidatas: ${diag.candidatas}, sin geometría: ${diag.sinGeometria})`);
    return { tiendas, diag };
}
