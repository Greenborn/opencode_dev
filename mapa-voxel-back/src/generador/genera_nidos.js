// genera_nidos.js - Decide los nidos de zombies del mapa (plan_supervivencia.md
// §5). Corre una sola vez al construir el mapa, con la heightMap todavía como
// arrays y las zonas `parcela` a mano. Es puro (sin sockets): lo prueba
// scripts/test_nidos.mjs.

import { PROB_NIDO_PARCELA, INTENTOS_NIDO, RADIO_NIDO, DIST_MIN_BASE_NIDO, DIST_MIN_ENTRE_NIDOS } from '../plugins/datos.js';
import { BLOCK_TYPES } from './mapConfig.js';

const MARGEN_EDIFICIO = 2;      // aire libre entre el nido y cualquier pared
const MARGEN_OBJETO = 2;        // ... y árboles/postes/luces (además del radio)
const MARGEN_BORDE_MAPA = 12;

/**
 * @param zonas lista de zonas del mapa (se usan las de tipo 'parcela')
 * @param ctx { structures, entities, heightMap, surfaceTypeMap, width, depth, bases: [{x,z}], rand }
 * @returns [{ id, x, y, z, radio, parcela }]
 */
export function generarNidos(zonas, ctx) {
    const { structures = [], entities = [], heightMap, surfaceTypeMap, width, depth, bases = [], rand = Math.random } = ctx;
    const nidos = [];
    const edificios = structures.filter(s => s && s.width != null && s.depth != null && s.x >= 0 && s.z >= 0);
    const objetos = entities.filter(e => e && e.type === 'entidad_objeto');
    const R = RADIO_NIDO;

    const alt = (x, z) => {
        const col = heightMap[x];
        const v = col && col[z];
        return typeof v === 'number' ? v : null;
    };

    const motivo = ctx.diag || {};
    const no = (m) => { motivo[m] = (motivo[m] || 0) + 1; return false; };
    const libre = (x, z) => {
        if (x < MARGEN_BORDE_MAPA || z < MARGEN_BORDE_MAPA || x > width - MARGEN_BORDE_MAPA || z > depth - MARGEN_BORDE_MAPA) return no('borde');
        const r = R + MARGEN_EDIFICIO;
        for (const s of edificios) {
            if (x > s.x - r && x < s.x + s.width + r && z > s.z - r && z < s.z + s.depth + r) return no('edificio');
        }
        const ro = R + MARGEN_OBJETO;
        for (const e of objetos) if (Math.abs(e.x - x) < ro && Math.abs(e.z - z) < ro && Math.hypot(e.x - x, e.z - z) < ro) return no('objeto');
        for (const b of bases) if (b && Math.hypot(b.x - x, b.z - z) < DIST_MIN_BASE_NIDO) return no('base');
        for (const n of nidos) if (Math.hypot(n.x - x, n.z - z) < DIST_MIN_ENTRE_NIDOS) return no('entre');
        // suelo plano y no calle/vereda: toda la huella a la misma altura
        const h0 = alt(x, z);
        if (h0 == null) return no('sinaltura');
        for (let dx = -R; dx <= R; dx += 1) {
            for (let dz = -R; dz <= R; dz += 1) {
                if (dx * dx + dz * dz > R * R) continue;
                const xi = x + dx, zi = z + dz;
                if (alt(xi, zi) !== h0) return no('desnivel');
                const t = surfaceTypeMap[xi] && surfaceTypeMap[xi][zi];
                if (t === BLOCK_TYPES.ASPHALT || t === BLOCK_TYPES.VEREDA || t === BLOCK_TYPES.BRICK) return no('superficie');
            }
        }
        return true;
    };

    for (const z of zonas || []) {
        if (z.tipo !== 'parcela') continue;
        if (z.x0 < 0 || z.z0 < 0 || z.x1 > width || z.z1 > depth) continue;   // parcela fuera del mapa recortado
        if (rand() >= PROB_NIDO_PARCELA) continue;
        const m = R + 2;
        const ancho = z.x1 - z.x0 - 2 * m, prof = z.z1 - z.z0 - 2 * m;
        if (ancho <= 0 || prof <= 0) continue;
        for (let k = 0; k < INTENTOS_NIDO; k++) {
            const x = Math.floor(z.x0 + m + rand() * ancho);
            const zz = Math.floor(z.z0 + m + rand() * prof);
            if (!libre(x, zz)) continue;
            nidos.push({ id: nidos.length, x: x + 0.5, y: alt(x, zz), z: zz + 0.5, radio: R, parcela: z.id });
            break;
        }
    }
    return nidos;
}
