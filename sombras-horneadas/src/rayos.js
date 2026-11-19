// Sombra del sol horneada: muestreo de visibilidad por cara de un volumen de voxeles.
//
// El sol tiene dirección fija, así que la visibilidad de cada cara se calcula UNA
// vez al mallar y se guarda como nivel 0..SUN_SAMPLES. El paquete no conoce el
// formato del mallado ni el catálogo del juego: el llamador entrega
//   - `bloqueo(x, y, z)`: 1 si el voxel tapa el sol, 0 si no, -1 si el punto
//     sale del área con datos (fin del rayo). Coordenadas locales al volumen.
//   - `ocluyentes`: ocluyentes extra (árboles, postes...) en coordenadas de mundo,
//     construidos con `ocluyenteEsfera` / `ocluyenteCilindro`.
// Sin three.js ni DOM: pensado para correr en un Web Worker.

/** Alcance máximo del rayo en bloques (protege de un sol casi horizontal). */
export const SUN_RAY_MAX = 256;
/** Paso de avance del rayo en bloques. */
export const SUN_RAY_STEP = 0.75;
/** Rayos por cara => niveles 0..SUN_SAMPLES. */
export const SUN_SAMPLES = 4;

// Desplazamiento de cada rayo dentro de la celda (coordenadas sobre el plano de la cara).
const OFFSETS_MUESTRA = [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]];
// Tangentes de cada eje normal, para repartir los rayos sobre la cara.
const TANGENTES = [[[0, 1, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 1, 0]]];

/** Normaliza un vector [x, y, z]. Devuelve un vector nuevo. */
export function normalizarDireccion(dir) {
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    return [dir[0] / l, dir[1] / l, dir[2] / l];
}

/**
 * Dirección hacia el sol a partir de una posición {x,y,z}. Si la posición no
 * viene, usa `por_defecto`. Devuelve un vector normalizado nuevo.
 */
export function direccionDesdePosicion(p, por_defecto = { x: 50, y: 50, z: 50 }) {
    const q = p || por_defecto;
    return normalizarDireccion([q.x, q.y, q.z]);
}

/** Ocluyente esférico (copa de árbol): centro (x,y,z) y radio r. */
export function ocluyenteEsfera({ x, y, z, r }) {
    return { tipo: 'esfera', x, y, z, r };
}

/** Ocluyente cilíndrico vertical (fuste, poste): eje en (x,z), radio r, entre y0 e y1. */
export function ocluyenteCilindro({ x, z, r, y0, y1 }) {
    return { tipo: 'cilindro', x, z, r, y0, y1 };
}

/**
 * ¿El rayo (px,py,pz) + t·SUN, con 0 < t <= tMax, toca el ocluyente `o`?
 * Coordenadas de mundo.
 */
export function rayoTocaOcluyente(o, px, py, pz, SUN, tMax) {
    if (o.tipo === 'esfera') {
        const ox = px - o.x, oy = py - o.y, oz = pz - o.z;
        const b = ox * SUN[0] + oy * SUN[1] + oz * SUN[2];
        const c = ox * ox + oy * oy + oz * oz - o.r * o.r;
        const disc = b * b - c;
        if (disc < 0) return false;
        const sq = Math.sqrt(disc);
        const t1 = -b - sq, t2 = -b + sq;
        return t2 > 0 && t1 <= tMax;
    }
    // cilindro vertical: intersección con el infinito en XZ y con el rango en Y
    const dx = SUN[0], dz = SUN[2];
    const a = dx * dx + dz * dz;
    if (a < 1e-12) return false;     // sol casi vertical: el fuste no tapa en el plano
    const ox = px - o.x, oz = pz - o.z;
    const b = ox * dx + oz * dz;
    const c = ox * ox + oz * oz - o.r * o.r;
    const disc = b * b - a * c;
    if (disc < 0) return false;
    const sq = Math.sqrt(disc);
    let lo = Math.max(0, (-b - sq) / a);
    let hi = Math.min(tMax, (-b + sq) / a);
    if (SUN[1] !== 0) {
        const ta = (o.y0 - py) / SUN[1], tb = (o.y1 - py) / SUN[1];
        lo = Math.max(lo, Math.min(ta, tb));
        hi = Math.min(hi, Math.max(ta, tb));
    } else if (py < o.y0 || py > o.y1) return false;
    return lo <= hi && hi > 0;
}

/**
 * Nivel de sol (0..SUN_SAMPLES) de una cara cuya celda libre es (ex,ey,ez) y
 * cuya normal apunta a lo largo del eje `eje` (0=x, 1=y, 2=z), sentido `positivo`.
 *
 * `cfg` (se puede reutilizar entre llamadas del mismo volumen):
 *   bloqueo(x, y, z)   -> 1 tapa, 0 libre, -1 fuera de datos (corta el rayo)
 *   altoVolumen        altura del volumen: por encima no hay bloqueo
 *   alcance            distancia máxima del rayo (ver SUN_RAY_SAFE en el llamador)
 *   ocluyentes         lista de ocluyentes de mundo (opcional)
 *   origenX, origenZ   origen del volumen en mundo, para cruzar con `ocluyentes`
 */
export function nivelSolCara(ex, ey, ez, eje, positivo, SUN, cfg) {
    const facing = (positivo ? 1 : -1) * SUN[eje];
    // de espaldas al sol: nunca recibe luz directa => nivel mínimo (0)
    if (facing <= 0) return 0;
    const [t1, t2] = TANGENTES[eje];
    const bloqueo = cfg.bloqueo;
    const altoVolumen = cfg.altoVolumen;
    const alcance = cfg.alcance;
    const ocl = cfg.ocluyentes || [];
    const origenX = cfg.origenX || 0, origenZ = cfg.origenZ || 0;
    let lit = 0;
    for (let s = 0; s < SUN_SAMPLES; s++) {
        const a = OFFSETS_MUESTRA[s][0], b = OFFSETS_MUESTRA[s][1];
        const px = ex + 0.5 + t1[0] * a + t2[0] * b;
        const py = ey + 0.5 + t1[1] * a + t2[1] * b;
        const pz = ez + 0.5 + t1[2] * a + t2[2] * b;
        let blocked = false;
        for (let d = SUN_RAY_STEP; d <= alcance; d += SUN_RAY_STEP) {
            const qx = px + SUN[0] * d, qy = py + SUN[1] * d, qz = pz + SUN[2] * d;
            if (qy >= altoVolumen) break;
            const r = bloqueo(Math.floor(qx), Math.floor(qy), Math.floor(qz));
            if (r < 0) break;
            if (r === 1) { blocked = true; break; }
        }
        if (!blocked && ocl.length) {
            const wx = px + origenX, wz = pz + origenZ;
            for (let i = 0; i < ocl.length; i++) {
                if (rayoTocaOcluyente(ocl[i], wx, py, wz, SUN, alcance)) { blocked = true; break; }
            }
        }
        if (!blocked) lit++;
    }
    return lit;
}
