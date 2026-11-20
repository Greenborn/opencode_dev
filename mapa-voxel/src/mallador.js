// mallador.js - Mallado (greedy meshing) de un chunk voxel. Sin three.js ni DOM.
//
// Entrada: un chunk denso { cx, cz, ancho, alto, profundidad, datos, tintes? }
//   * datos:  Uint8Array de tipos, índice (x*alto + y)*profundidad + z.
//   * tintes: Uint16Array opcional con índices a `paletaTintes` (0 = sin tinte).
// Los vecinos (4 lados) se consultan sólo para decidir la visibilidad de las
// caras del borde: cada chunk emite únicamente las caras de SUS voxeles, así
// que al cambiar un voxel de borde hay que remallar también al vecino.
//
// Algoritmo:
//   1. Se copia el chunk en un arreglo "padded" (+1 celda por lado) con los
//      tipos de los vecinos, para que el barrido no tenga ramas por borde.
//   2. Por cada eje y plano entre voxeles se construye una máscara de códigos
//      (tipo, tinte, sol, luz, orientación; ver codigos.js).
//   3. Greedy merge 2D sobre la máscara: celdas idénticas se funden en rectángulos.
//   4. Cada rectángulo se emite con su contorno completo (todos los enteros del
//      borde, sin T-junctions) y un abanico desde un vértice central interior.

import { codificar, decodificar, cuantizar, NIVELES } from './codigos.js';
import { BufferCara, contornoRectangulo, fusionarMascara } from './contorno.js';

// Ejes (u, v) de cada eje de normal d (0 = X, 1 = Y, 2 = Z), en el mismo orden
// que usa el contorno: el sentido de (u × v) define el winding.
const EJES_UV = [[2, 1], [0, 2], [0, 1]];
// Signo de (e_u × e_v) para cada d: decide si el contorno CCW da normal +d.
const CRUCE = [-1, -1, 1];

const _pts = [];
let _idx = new Int32Array(64);
const _c = [0, 0, 0];
const _w = [0, 0, 0];
const _dueno = [0, 0, 0];

/**
 * Chunk → arreglo padded de tipos (+1 celda en cada eje). Los vecinos
 * ausentes cuentan como aire (la cara del borde queda visible).
 */
function rellenarPadded(chunk, vecinos) {
    const { ancho, alto, profundidad } = chunk;
    const H = alto + 2, D = profundidad + 2;
    const P = new Uint8Array((ancho + 2) * H * D);
    const datos = chunk.datos;
    for (let x = -1; x <= ancho; x++) {
        const dx = x < 0 ? -1 : x >= ancho ? 1 : 0;
        const lx = x - dx * ancho;
        for (let z = -1; z <= profundidad; z++) {
            const dz = z < 0 ? -1 : z >= profundidad ? 1 : 0;
            const lz = z - dz * profundidad;
            const fuente = dx === 0 && dz === 0 ? chunk : vecinos(chunk.cx + dx, chunk.cz + dz);
            if (!fuente || !fuente.datos) continue;   // vecino ausente: aire
            const src = dx === 0 && dz === 0 ? datos : fuente.datos;
            const base = ((x + 1) * H) * D + (z + 1);
            for (let y = 0; y < alto; y++) {
                P[base + (y + 1) * D] = src[(lx * alto + y) * profundidad + lz];
            }
        }
    }
    return P;
}

function obtenerBuffer(mapa, clave, tipo, conTinte) {
    let e = mapa.get(clave);
    if (!e) { e = { tipo, conTinte, buffer: new BufferCara() }; mapa.set(clave, e); }
    return e.buffer;
}

/**
 * Malla un chunk.
 *
 * @param {Object} chunk
 * @param {(cx:number, cz:number) => Object|undefined} vecinos  chunk vecino por coordenadas de chunk
 * @param {Object} [opts]
 * @param {number} [opts.bloque=1]              tamaño de un voxel en unidades de mundo
 * @param {(tipo:number)=>boolean} [opts.esTransparente]  tipos que van al lado transparente
 * @param {Array<number[]>} [opts.paletaTintes] colores RGB lineales por índice de tinte (índice 0 sin uso)
 * @param {Function} [opts.iluminacion]         hook (info) => {sol, luz} en 0..1 (o null). `info` es
 *        un objeto reutilizable { x, y, z, eje, sentido, tipo } con las coordenadas de MUNDO del
 *        voxel que posee la cara. Sin hook: sol = 1, luz = 0.
 * @returns {{ clave:string, opacos:Array, transparentes:Array }}
 *        cada entrada: { tipo, conTinte, position, normal, uv, color, sol, luz, index }
 */
export function mallarChunk(chunk, vecinos, opts = {}) {
    const bloque = opts.bloque ?? 1;
    const esTransparente = opts.esTransparente ?? (() => false);
    const paleta = opts.paletaTintes ?? [];
    const iluminacion = opts.iluminacion ?? null;
    const { cx, cz, ancho, alto, profundidad } = chunk;
    const tintes = chunk.tintes ?? null;
    const origen = [cx * ancho, 0, cz * profundidad];

    const P = rellenarPadded(chunk, vecinos);
    const H = alto + 2, D = profundidad + 2;
    const strides = [H * D, D, 1];
    const dims = [ancho, alto, profundidad];

    const mapaOpacos = new Map();
    const mapaTransp = new Map();
    const ctx = {
        iluminacion,
        info: { x: 0, y: 0, z: 0, eje: 0, sentido: 0, tipo: 0 },
        origen, alto, profundidad,
        tintes,
    };

    for (let d = 0; d < 3; d++) {
        const [au, av] = EJES_UV[d];
        const nU = dims[au], nV = dims[av], nD = dims[d];
        const stride = strides[d];
        const mascara = new Int32Array(nU * nV);
        const visitado = new Uint8Array(nU * nV);
        const rects = [];

        for (let p = -1; p < nD; p++) {
            // ---- 1. máscara de códigos para el plano entre p y p+1 ----
            let hayCaras = false;
            for (let v = 0; v < nV; v++) {
                for (let u = 0; u < nU; u++) {
                    _c[d] = p; _c[au] = u; _c[av] = v;
                    const iA = ((_c[0] + 1) * H + (_c[1] + 1)) * D + (_c[2] + 1);
                    const iB = iA + stride;
                    const a = P[iA], b = P[iB];
                    let code = 0;
                    // Dueño de la cara: el voxel de adentro del chunk. La cara
                    // positiva la posee `a` (sólo si está en el chunk, p >= 0);
                    // la negativa la posee `b` (sólo si p + 1 < nD).
                    if (p >= 0 && a !== 0 && !ocultaCara(b, a, esTransparente)) {
                        code = celda(d, p, u, v, au, av, true, a, ctx);
                    } else if (p + 1 < nD && b !== 0 && !ocultaCara(a, b, esTransparente)) {
                        code = celda(d, p + 1, u, v, au, av, false, b, ctx);
                    }
                    mascara[v * nU + u] = code;
                    if (code !== 0) hayCaras = true;
                }
            }
            if (!hayCaras) continue;

            // ---- 2. greedy merge y emisión ----
            fusionarMascara(mascara, visitado, nU, nV, rects);
            const plano = p + 1;
            for (let r = 0; r < rects.length; r += 5) {
                const i = rects[r], j = rects[r + 1], w = rects[r + 2], h = rects[r + 3], code = rects[r + 4];
                const f = decodificar(code);
                const tinteOk = f.tinte > 0 ? paleta[f.tinte] ?? null : null;
                const conTinte = tinteOk !== null;
                const transp = esTransparente(f.tipo);
                const mapa = transp ? mapaTransp : mapaOpacos;
                const clave = (f.tipo * 2 + (conTinte ? 1 : 0)) * 2 + (transp ? 1 : 0);
                const buf = obtenerBuffer(mapa, clave, f.tipo, conTinte);
                emitirRectangulo(buf, d, au, av, plano, origen, bloque, i, j, w, h,
                    f.positivo ? 1 : -1, tinteOk, f.sol / NIVELES, f.luz / NIVELES);
            }
        }
    }

    const serializar = mapa => {
        const out = [];
        for (const e of mapa.values()) {
            const s = e.buffer.serializar(e.tipo, e.conTinte);
            if (s) out.push(s);
        }
        return out;
    };
    return {
        clave: cx + '_' + cz,
        opacos: serializar(mapaOpacos),
        transparentes: serializar(mapaTransp),
    };
}

/**
 * ¿El bloque `vecino` tapa la cara del bloque `propio`? Regla de la app
 * (ver block_types.js en el juego): el aire nunca tapa; un sólido tapa siempre;
 * un transparente (vidrio) sólo tapa a otro de su mismo tipo.
 */
function ocultaCara(vecino, propio, esTransparente) {
    if (vecino === 0) return false;
    if (esTransparente(vecino)) return vecino === propio;
    return true;
}

/** Código de la cara del dueño (local `pLado` en el eje d). Llama al hook de iluminación si existe. */
function celda(d, pLado, u, v, au, av, positivo, tipo, ctx) {
    const loc = _dueno;
    loc[d] = pLado; loc[au] = u; loc[av] = v;
    let sol = 1, luz = 0;
    if (ctx.iluminacion) {
        const info = ctx.info;
        info.x = ctx.origen[0] + loc[0];
        info.y = loc[1];
        info.z = ctx.origen[2] + loc[2];
        info.eje = d;
        info.sentido = positivo ? 1 : -1;
        info.tipo = tipo;
        const r = ctx.iluminacion(info);
        if (r) { sol = r.sol ?? 1; luz = r.luz ?? 0; }
    }
    let tinte = 0;
    if (ctx.tintes) tinte = ctx.tintes[(loc[0] * ctx.alto + loc[1]) * ctx.profundidad + loc[2]];
    return codificar(tipo, tinte, positivo, cuantizar(sol), cuantizar(luz));
}

/**
 * Emite un rectángulo: vértices del contorno (todos los enteros del borde, para
 * que coincidan con los vecinos) + un vértice central interior, y un abanico
 * desde el centro. Cada arista unitaria del contorno queda en un triángulo no
 * degenerado, y el centro nunca cae sobre una arista, así que no quedan
 * agujeros: cada arista aparece en un número par de triángulos (>= 2).
 */
function emitirRectangulo(buf, d, au, av, plano, origen, bloque, i, j, w, h, s, rgb, sol, luz) {
    const n = contornoRectangulo(i, j, w, h, _pts);
    const nx = d === 0 ? s : 0, ny = d === 1 ? s : 0, nz = d === 2 ? s : 0;
    const ccw = s * CRUCE[d] > 0;
    const uBase = origen[au], vBase = origen[av];
    if (_idx.length < n) _idx = new Int32Array(n * 2);
    for (let k = 0; k < n; k++) {
        _idx[k] = verticeEn(buf, _pts[k * 2], _pts[k * 2 + 1], d, au, av, plano, origen, bloque, nx, ny, nz, uBase, vBase, rgb, sol, luz);
    }
    if (n === 4) {
        // cara de 1x1: el contorno son sólo las 4 esquinas, dos triángulos bastan
        const [a, b, c, e] = [_idx[0], _idx[1], _idx[2], _idx[3]];
        if (ccw) { buf.tri(a, b, c); buf.tri(a, c, e); }
        else { buf.tri(a, c, b); buf.tri(a, e, c); }
        return;
    }
    const c = verticeEn(buf, i + w / 2, j + h / 2, d, au, av, plano, origen, bloque, nx, ny, nz, uBase, vBase, rgb, sol, luz);
    for (let k = 0; k < n; k++) {
        const a = _idx[k], b = _idx[(k + 1) % n];
        if (ccw) buf.tri(c, a, b); else buf.tri(c, b, a);
    }
}

function verticeEn(buf, u, v, d, au, av, plano, origen, bloque, nx, ny, nz, uBase, vBase, rgb, sol, luz) {
    _w[au] = u; _w[av] = v; _w[d] = plano;
    const x = (_w[0] + origen[0]) * bloque;
    const y = (_w[1] + origen[1]) * bloque;
    const z = (_w[2] + origen[2]) * bloque;
    return buf.vertex(x, y, z, nx, ny, nz, uBase + u, vBase + v, rgb, sol, luz);
}
