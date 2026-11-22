// mallador.js - Mallado (greedy meshing) de un chunk voxel. Sin three.js ni DOM.
//
// Entrada: un chunk denso { cx, cz, ancho, alto, profundidad, datos, tintes? }
//   * datos:  Uint8Array de tipos, índice (x*alto + y)*profundidad + z.
//   * tintes: Uint16Array opcional con índices a `paletaTintes` (0 = sin tinte).
//
// ACOPLAMIENTO ENTRE CHUNKS (versión 0.6): cada chunk se malla por separado, pero
// sus aristas de borde deben coincidir con las del vecino. Por eso el mallado de
// un chunk consulta a sus 4 vecinos (lados) y a los vecinos de éstos (radio 2 en
// chunks, por el greedy merge global de cada plano): la función `vecinos(cx, cz)`
// debe devolver los chunks crudos hasta radio 2 (en el worker, el pool envía
// los 5 x 5 chunks alrededor). Un cambio de voxel en un chunk puede alterar el
// mallado de los chunks a distancia <= 2: `MapaVoxel.setVoxel` remalla ese
// entorno. Sin vecinos cargados, el borde se trata como aire (cara visible).
//
// Algoritmo:
//   1. Se copia el chunk en un arreglo "padded" (+1 celda por lado) con los
//      tipos de los vecinos, para que el barrido no tenga ramas por borde.
//   2. Por cada eje y plano entre voxeles se construye una máscara de códigos
//      (tipo, tinte, sol, luz, orientación; ver codigos.js).
//   3. Greedy merge 2D sobre la máscara: celdas idénticas se funden en rectángulos.
//      Se guardan todos los rectángulos del chunk y se marcan sus esquinas.
//   4. Esquinas de borde: para cada vecino de cara (4 lados) se recalculan, con
//      sus datos, los rectángulos de sus planos que tocan el borde compartido y
//      se marcan sus esquinas sobre ese borde. Así cada chunk conoce TODAS las
//      esquinas que caen en el borde, sin forzar todos los enteros.
//   5. Cada rectángulo se emite con un contorno sin T-junctions pero mínimo:
//      sus 4 esquinas más los puntos de sus aristas marcados como esquina (de
//      cualquiera de los dos lados). Las aristas verticales sobre una esquina
//      del chunk (x y z de borde) llevan todos los enteros de su altura, porque
//      esa arista se comparte con hasta cuatro chunks y no hay un vecino de cara
//      que la determine.
//   6. Triangulación sin vértices extra: abanico desde una esquina libre, zigzag
//      entre aristas opuestas, o ear clipping del contorno convexo (n - 2
//      triángulos en todos los casos). Los vértices con atributos idénticos se comparten.

import { codificar, decodificar, cuantizar, NIVELES, codificarCaraAtlas, decodificarCaraAtlas } from './codigos.js';
import { BufferCara, fusionarMascara } from './contorno.js';
import { TIPO_ATLAS, indiceVariante, empaquetarEnFilas } from './atlas.js';

// Ejes (u, v) de cada eje de normal d (0 = X, 1 = Y, 2 = Z): el sentido de
// (u × v) define el winding.
const EJES_UV = [[2, 1], [0, 2], [0, 1]];
// Signo de (e_u × e_v) para cada d: decide si el contorno CCW da normal +d.
const CRUCE = [-1, -1, 1];
// Desplazamiento del código en la clave de vértice compartido (|código| < 2^27).
const CODIGO_OFF = 2 ** 27, CODIGO_RANGO = 2 ** 28;

const _pu = [], _pv = [];          // contorno del rectángulo actual (coordenadas de plano)
const _tri = [];                   // triángulos (índices al contorno; n = vértice central)
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
 * @param {(cx:number, cz:number) => Object|undefined} vecinos  chunk por coordenadas de chunk; debe
 *        servir los chunks hasta radio 2 (los 4 vecinos de cara y los de éstos).
 * @param {Object} [opts]
 * @param {number} [opts.bloque=1]              tamaño de un voxel en unidades de mundo
 * @param {(tipo:number)=>boolean} [opts.esTransparente]  tipos que van al lado transparente
 * @param {Array<number[]>} [opts.paletaTintes] colores RGB lineales por índice de tinte (índice 0 sin uso)
 * @param {Function} [opts.iluminacion]         hook (info) => {sol, luz} en 0..1 (o null). `info` es
 *        un objeto reutilizable { x, y, z, eje, sentido, tipo } con las coordenadas de MUNDO del
 *        voxel que posee la cara. Sin hook: sol = 1, luz = 0.
 * @param {number} [opts.alturaMinimaCamara]    plano Y (en voxeles) por debajo del cual nunca está la
 *        cámara. Las caras que miran hacia abajo (-Y) en un plano y <= ese valor nunca se ven de frente
 *        y no se emiten (ni se evalúa su iluminación). Ej.: la cara inferior del suelo.
 * @param {Object} [opts.atlas]  salida de `construirAtlas` (paleta de texels, ver atlas.js). Si se pasa, el
 *        modo atlas de caras: la máscara no tiene tipo ni tinte, cada rectángulo fundido de w x h voxels
 *        reserva un bloque de w x h texels (un texel por voxel, con su color) y los vértices llevan `region`
 *        (origen y tamaño del bloque) y `uv` local en voxeles. Sin `color`; un buffer por lado (TIPO_ATLAS).
 * @param {boolean} [opts.contornoCompleto=false]  contorno con todos los enteros de cada arista (como
 *        la versión 0.2): más vértices, sin ventaja visual. Sólo para comparar.
 * @returns {{ clave:string, opacos:Array, transparentes:Array }}
 *        cada entrada: { tipo, conTinte, position, normal, uv, color, sol, luz, index }
 */
export function mallarChunk(chunk, vecinos, opts = {}) {
    const bloque = opts.bloque ?? 1;
    const esTransparente = opts.esTransparente ?? (() => false);
    const paleta = opts.paletaTintes ?? [];
    const iluminacion = opts.iluminacion ?? null;
    const yMinCam = opts.alturaMinimaCamara ?? -Infinity;
    const completo = opts.contornoCompleto === true;
    const atlas = opts.atlas ?? null;
    const atlasOn = atlas !== null;
    const { cx, cz, ancho, alto, profundidad } = chunk;
    const tintes = chunk.tintes ?? null;
    const origen = [cx * ancho, 0, cz * profundidad];

    const P = rellenarPadded(chunk, vecinos);
    const H = alto + 2, D = profundidad + 2;
    const dims = [ancho, alto, profundidad];

    const ctx = {
        iluminacion,
        info: { x: 0, y: 0, z: 0, eje: 0, sentido: 0, tipo: 0 },
        origen, alto, profundidad,
        tintes,
        esTransparente, atlasOn, atlas, tinteUltima: 0, yMinCam,
    };

    // ---- pasada 1: rectángulos del chunk y sus esquinas ----
    // Esquinas en una grilla de puntos (ancho+1) x (alto+1) x (profundidad+1).
    const EH = alto + 1, ED = profundidad + 1;
    const esquinas = new Uint8Array((ancho + 1) * EH * ED);
    const { todos, celdasTexel } = rectangulos(P, H, D, dims, ctx, atlasOn, null);
    marcarEsquinas(esquinas, EH, ED, todos);
    // ---- bordes: esquinas que aportan los rectángulos de cada vecino de cara ----
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        marcarVecinoEnBorde(esquinas, EH, ED, chunk, vecinos, dx, dz, ctx);
    }

    // ---- atlas de caras: bloque de texels por lado y origen de cada rectángulo ----
    const planes = atlasOn ? planificarAtlas(todos, celdasTexel, atlas) : null;

    // ---- pasada 2: emisión con contorno mínimo ----
    const mapaOpacos = new Map();
    const mapaTransp = new Map();
    const geo = { esquinas, EH, ED, ancho, profundidad, completo, origen, bloque };
    for (let r = 0; r < todos.length; r += 8) {
        const d = todos[r], plano = todos[r + 1], code = todos[r + 6];
        const i = todos[r + 2], j = todos[r + 3], w = todos[r + 4], h = todos[r + 5];
        if (atlasOn) {
            const f = decodificarCaraAtlas(code);
            const lado = f.transparente ? 1 : 0;
            const buf = obtenerBuffer(lado ? mapaTransp : mapaOpacos, 0, TIPO_ATLAS, false);
            const rr = r >> 3;
            const reg = [planes.origen[rr * 2], planes.origen[rr * 2 + 1], w, h];
            emitirRectangulo(buf, geo, d, plano, i, j, w, h, code, f.positivo ? 1 : -1, null,
                f.sol / NIVELES, f.luz / NIVELES, reg);
            continue;
        }
        const f = decodificar(code);
        const tinteOk = f.tinte > 0 ? paleta[f.tinte] ?? null : null;
        const conTinte = tinteOk !== null;
        const transp = esTransparente(f.tipo);
        const mapa = transp ? mapaTransp : mapaOpacos;
        const clave = (f.tipo * 2 + (conTinte ? 1 : 0)) * 2 + (transp ? 1 : 0);
        const buf = obtenerBuffer(mapa, clave, f.tipo, conTinte);
        emitirRectangulo(buf, geo, d, plano, i, j, w, h,
            code, f.positivo ? 1 : -1, tinteOk, f.sol / NIVELES, f.luz / NIVELES, null);
    }

    const serializar = (mapa, bloque) => {
        const out = [];
        for (const e of mapa.values()) {
            const s = e.buffer.serializar(e.tipo, e.conTinte, bloque);
            if (s) out.push(s);
        }
        return out;
    };
    return {
        clave: cx + '_' + cz,
        opacos: serializar(mapaOpacos, planes?.bloques[0] ?? null),
        transparentes: serializar(mapaTransp, planes?.bloques[1] ?? null),
    };
}

/**
 * Greedy merge de los planos de un chunk (o de un vecino, con `filtro`).
 * @param {Uint8Array} P          arreglo padded (ver rellenarPadded)
 * @param {number[]} dims         [ancho, alto, profundidad] del chunk dueño de P
 * @param {Object} ctx            contexto de códigos (iluminación, origen, tintes, transparencia...)
 * @param {boolean} conTexel      guardar la variante de cada celda (modo atlas)
 * @param {Function|null} filtro  (d, plano) => boolean: qué planos calcular (null = todos)
 * @returns {{ todos: number[], celdasTexel: number[] }}
 *        `todos`: 8 valores por rectángulo (d, plano, i, j, w, h, código, inicio en celdasTexel).
 */
function rectangulos(P, H, D, dims, ctx, conTexel, filtro) {
    const strides = [H * D, D, 1];
    const { esTransparente, atlasOn } = ctx;
    const todos = [];
    const celdasTexel = [];
    const rects = [];
    for (let d = 0; d < 3; d++) {
        const [au, av] = EJES_UV[d];
        const nU = dims[au], nV = dims[av], nD = dims[d];
        const stride = strides[d];
        const mascara = new Int32Array(nU * nV);
        const visitado = new Uint8Array(nU * nV);
        // modo atlas: tipo y tinte del voxel dueño de cada celda de la máscara del plano
        const duenoTipo = conTexel ? new Uint8Array(nU * nV) : null;
        const duenoTinte = conTexel ? new Uint16Array(nU * nV) : null;

        for (let p = -1; p < nD; p++) {
            if (filtro !== null && !filtro(d, p + 1)) continue;
            // ---- máscara de códigos para el plano entre p y p+1 ----
            // La cara -Y de este plano nunca se ve si la cámara no baja de yMinCam.
            const sinNegativa = d === 1 && p + 1 <= ctx.yMinCam;
            let hayCaras = false;
            for (let v = 0; v < nV; v++) {
                for (let u = 0; u < nU; u++) {
                    _c[d] = p; _c[au] = u; _c[av] = v;
                    const iA = ((_c[0] + 1) * H + (_c[1] + 1)) * D + (_c[2] + 1);
                    const iB = iA + stride;
                    const a = P[iA], b = P[iB];
                    let code = 0, tipoDueno = 0;
                    // Dueño de la cara: el voxel de adentro del chunk. La cara
                    // positiva la posee `a` (sólo si está en el chunk, p >= 0);
                    // la negativa la posee `b` (sólo si p + 1 < nD).
                    if (p >= 0 && a !== 0 && !ocultaCara(b, a, esTransparente)) {
                        code = celda(d, p, u, v, au, av, true, a, ctx);
                        tipoDueno = a;
                    } else if (!sinNegativa && p + 1 < nD && b !== 0 && !ocultaCara(a, b, esTransparente)) {
                        code = celda(d, p + 1, u, v, au, av, false, b, ctx);
                        tipoDueno = b;
                    }
                    const k = v * nU + u;
                    mascara[k] = code;
                    if (code !== 0) hayCaras = true;
                    if (conTexel && code !== 0) { duenoTipo[k] = tipoDueno; duenoTinte[k] = ctx.tinteUltima; }
                }
            }
            if (!hayCaras) continue;

            fusionarMascara(mascara, visitado, nU, nV, rects);
            const plano = p + 1;
            for (let r = 0; r < rects.length; r += 5) {
                const i = rects[r], j = rects[r + 1], w = rects[r + 2], h = rects[r + 3];
                let inicioTexel = 0;
                if (conTexel) {
                    inicioTexel = celdasTexel.length;
                    for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) {
                        const c = (j + b) * nU + (i + a);
                        celdasTexel.push(indiceVariante(ctx.atlas, duenoTipo[c], duenoTinte[c]));
                    }
                }
                todos.push(d, plano, i, j, w, h, rects[r + 4], inicioTexel);
            }
        }
    }
    return { todos, celdasTexel };
}

/** Marca en `esquinas` las 4 esquinas de cada rectángulo de `todos` (8 valores por rectángulo). */
function marcarEsquinas(esquinas, EH, ED, todos) {
    for (let r = 0; r < todos.length; r += 8) {
        const d = todos[r], plano = todos[r + 1];
        const i = todos[r + 2], j = todos[r + 3], w = todos[r + 4], h = todos[r + 5];
        const [au, av] = EJES_UV[d];
        marcarPunto(esquinas, EH, ED, d, au, av, plano, i, j);
        marcarPunto(esquinas, EH, ED, d, au, av, plano, i + w, j);
        marcarPunto(esquinas, EH, ED, d, au, av, plano, i + w, j + h);
        marcarPunto(esquinas, EH, ED, d, au, av, plano, i, j + h);
    }
}

function marcarPunto(esquinas, EH, ED, d, au, av, plano, u, v) {
    _w[d] = plano; _w[au] = u; _w[av] = v;
    esquinas[(_w[0] * EH + _w[1]) * ED + _w[2]] = 1;
}

/**
 * Marca las esquinas que el vecino de cara (dx, dz) aporta sobre el borde que
 * comparte con `chunk`. Se recalculan sus rectángulos de los planos que tocan
 * ese borde (los de la normal del eje del borde, sólo el plano de contacto, y
 * los otros dos ejes completos) con sus propios datos, así que el resultado es
 * el mismo que obtiene el vecino al mallarse. Ver la nota de acoplamiento arriba.
 */
function marcarVecinoEnBorde(esquinas, EH, ED, chunk, vecinos, dx, dz, ctx) {
    const vec = vecinos(chunk.cx + dx, chunk.cz + dz);
    if (!vec || !vec.datos) return;
    const { ancho, alto, profundidad } = chunk;
    const H = alto + 2, D = profundidad + 2;
    const PV = rellenarPadded(vec, vecinos);
    const eje = dx !== 0 ? 0 : 2;                  // eje normal al borde compartido
    const sentido = dx !== 0 ? dx : dz;
    const dimEje = eje === 0 ? ancho : profundidad;
    const objetivo = sentido < 0 ? dimEje : 0;     // plano del vecino que toca el chunk
    const desplazo = sentido * dimEje;             // coordenada del chunk = coordenada del vecino + desplazo
    const ctxV = {
        iluminacion: ctx.iluminacion,
        info: { x: 0, y: 0, z: 0, eje: 0, sentido: 0, tipo: 0 },
        origen: [vec.cx * ancho, 0, vec.cz * profundidad],
        alto, profundidad,
        tintes: vec.tintes ?? null,
        esTransparente: ctx.esTransparente, atlasOn: ctx.atlasOn, atlas: ctx.atlas,
        tinteUltima: 0, yMinCam: ctx.yMinCam,
    };
    const filtro = (d, plano) => d !== eje || plano === objetivo;
    const { todos } = rectangulos(PV, H, D, [ancho, alto, profundidad], ctxV, false, filtro);
    for (let r = 0; r < todos.length; r += 8) {
        const d = todos[r], plano = todos[r + 1];
        const i = todos[r + 2], j = todos[r + 3], w = todos[r + 4], h = todos[r + 5];
        const [au, av] = EJES_UV[d];
        const us = [i, i + w, i + w, i], vs = [j, j, j + h, j + h];
        for (let k = 0; k < 4; k++) {
            _w[d] = plano; _w[au] = us[k]; _w[av] = vs[k];
            if (_w[eje] !== objetivo) continue;
            const x = _w[0] + (eje === 0 ? desplazo : 0);
            const z = _w[2] + (eje === 2 ? desplazo : 0);
            esquinas[(x * EH + _w[1]) * ED + z] = 1;
        }
    }
}

/**
 * Modo atlas: empaqueta los rectángulos de cada lado (0 = opaco, 1 = transparente)
 * en un bloque de texels. Cada rectángulo recibe su origen (ox, oy) y sus texels
 * se copian de la paleta del atlas (un texel por voxel).
 * @returns {{ origen: Int32Array, bloques: Array<{ancho, alto, datos}|null> }}  origen[r*2..] del rectángulo r
 */
function planificarAtlas(todos, celdasTexel, atlas) {
    const R = todos.length >> 3;
    const origen = new Int32Array(R * 2);
    const bloques = [null, null];
    for (let lado = 0; lado < 2; lado++) {
        const idx = [];
        let area = 0, maxW = 0;
        for (let r = 0; r < R; r++) {
            if ((decodificarCaraAtlas(todos[r * 8 + 6]).transparente ? 1 : 0) !== lado) continue;
            const w = todos[r * 8 + 4], h = todos[r * 8 + 5];
            idx.push(r); area += w * h; if (w > maxW) maxW = w;
        }
        if (idx.length === 0) continue;
        const tamanos = [];
        for (const r of idx) tamanos.push(todos[r * 8 + 4], todos[r * 8 + 5]);
        const ancho = Math.max(maxW, Math.ceil(Math.sqrt(area)));
        const { pos, alto } = empaquetarEnFilas(tamanos, ancho);
        const datos = new Float32Array(ancho * alto * 4);
        idx.forEach((r, k) => {
            const ox = pos[k * 2], oy = pos[k * 2 + 1];
            const w = todos[r * 8 + 4], h = todos[r * 8 + 5], inicio = todos[r * 8 + 7];
            origen[r * 2] = ox; origen[r * 2 + 1] = oy;
            for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) {
                const src = celdasTexel[inicio + b * w + a] * 4;
                const dst = ((oy + b) * ancho + ox + a) * 4;
                datos[dst] = atlas.datos[src];
                datos[dst + 1] = atlas.datos[src + 1];
                datos[dst + 2] = atlas.datos[src + 2];
                datos[dst + 3] = 1;
            }
        });
        bloques[lado] = { ancho, alto, datos };
    }
    return { origen, bloques };
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
    ctx.tinteUltima = tinte;
    if (ctx.atlasOn) return codificarCaraAtlas(ctx.esTransparente(tipo), positivo, cuantizar(sol), cuantizar(luz));
    return codificar(tipo, tinte, positivo, cuantizar(sol), cuantizar(luz));
}

/**
 * ¿La arista que sale de (u0, v0) a lo largo del eje `eje` (au o av) va sobre
 * una esquina vertical del chunk (x y z de borde)? Esas aristas llevan todos los
 * enteros de su altura: no hay un vecino de cara que defina sus puntos. En el
 * modo `contornoCompleto` todas las aristas llevan todos los enteros.
 */
function aristaEsquina(geo, d, au, av, plano, u0, v0, eje) {
    if (geo.completo) return true;
    if (eje !== 1) return false;
    _w[d] = plano; _w[au] = u0; _w[av] = v0;
    const x = _w[0], z = _w[2];
    return (x === 0 || x === geo.ancho) && (z === 0 || z === geo.profundidad);
}

/**
 * Agrega a (_pu, _pv) los puntos interiores de una arista que sale de (u0, v0)
 * en la dirección (du, dv) y mide n, sin los extremos: todos los enteros si
 * `todosLosEnteros`; si no, sólo los marcados como esquina (de cualquier lado
 * del borde). Devuelve cuántos agregó.
 */
function puntosArista(geo, d, au, av, plano, u0, v0, du, dv, n, todosLosEnteros) {
    let k = 0;
    for (let s = 1; s < n; s++) {
        const u = u0 + du * s, v = v0 + dv * s;
        if (!todosLosEnteros) {
            _w[d] = plano; _w[au] = u; _w[av] = v;
            if (geo.esquinas[(_w[0] * geo.EH + _w[1]) * geo.ED + _w[2]] === 0) continue;
        }
        _pu.push(u); _pv.push(v); k++;
    }
    return k;
}

/**
 * Emite un rectángulo (i, j, w, h) del plano `plano` del eje d. Contorno en
 * sentido antihorario en (u, v): arista inferior (v = j), derecha (u = i + w),
 * superior (v = j + h) e izquierda (u = i).
 */
function emitirRectangulo(buf, geo, d, plano, i, j, w, h, code, s, rgb, sol, luz, reg) {
    const [au, av] = EJES_UV[d];
    const i1 = i + w, j1 = j + h;
    // las aristas a lo largo de u tienen fija la coordenada v (eje av), y viceversa
    const forzInf = aristaEsquina(geo, d, au, av, plano, i, j, au);
    const forzDer = aristaEsquina(geo, d, au, av, plano, i1, j, av);
    const forzSup = aristaEsquina(geo, d, au, av, plano, i1, j1, au);
    const forzIzq = aristaEsquina(geo, d, au, av, plano, i, j1, av);

    _pu.length = 0; _pv.length = 0;
    _pu.push(i); _pv.push(j);
    const nb = puntosArista(geo, d, au, av, plano, i, j, 1, 0, w, forzInf);
    _pu.push(i1); _pv.push(j);
    const nr = puntosArista(geo, d, au, av, plano, i1, j, 0, 1, h, forzDer);
    _pu.push(i1); _pv.push(j1);
    const nt = puntosArista(geo, d, au, av, plano, i1, j1, -1, 0, w, forzSup);
    _pu.push(i); _pv.push(j1);
    const nl = puntosArista(geo, d, au, av, plano, i, j1, 0, -1, h, forzIzq);
    const n = _pu.length;

    const nx = d === 0 ? s : 0, ny = d === 1 ? s : 0, nz = d === 2 ? s : 0;
    const o = geo.origen, B = geo.bloque;
    const uBase = o[au], vBase = o[av];
    if (_idx.length < n) _idx = new Int32Array(n * 2);
    for (let k = 0; k < n; k++) {
        const u = _pu[k], v = _pv[k];
        _w[au] = u; _w[av] = v; _w[d] = plano;
        const px = (_w[0] + o[0]) * B, py = (_w[1] + o[1]) * B, pz = (_w[2] + o[2]) * B;
        if (reg !== null) {
            // modo atlas: los vértices no se comparten (cada rectángulo tiene su bloque);
            // uv = posición local dentro del rectángulo, en voxeles (0..w, 0..h)
            _idx[k] = buf.vertex(px, py, pz, nx, ny, nz, u - i, v - j, null, sol, luz, reg);
            continue;
        }
        // clave: punto local de la grilla + eje + código (incluye sentido, tipo, tinte, sol y luz)
        const clave = (((_w[0] * geo.EH + _w[1]) * geo.ED + _w[2]) * 3 + d) * CODIGO_RANGO + code + CODIGO_OFF;
        _idx[k] = buf.verticeCompartido(clave, px, py, pz, nx, ny, nz, uBase + u, vBase + v, rgb, sol, luz);
    }

    triangular(n, nb, nr, nt, nl);
    const ccw = s * CRUCE[d] > 0;
    for (let t = 0; t < _tri.length; t += 3) {
        const a = _idx[_tri[t]], b = _idx[_tri[t + 1]], c = _idx[_tri[t + 2]];
        if (ccw) buf.tri(a, b, c); else buf.tri(a, c, b);
    }
}

/**
 * Triangula el contorno (antihorario en u, v; esquinas en 0, c1, c2, c3) de un
 * rectángulo con nb, nr, nt, nl puntos interiores en sus aristas inferior,
 * derecha, superior e izquierda. Deja en `_tri` triángulos antihorarios y sin
 * degenerados (índices al contorno). Siempre n - 2 triángulos, sin vértice central.
 *   - Abanico desde una esquina cuyas dos aristas no tienen puntos.
 *   - Zigzag entre dos aristas opuestas si las otras dos no tienen puntos.
 *   - Si no, ear clipping sobre el contorno convexo.
 */
function triangular(n, nb, nr, nt, nl) {
    _tri.length = 0;
    const c1 = 1 + nb, c2 = c1 + 1 + nr, c3 = c2 + 1 + nt;
    let k = -1;
    if (nb === 0 && nl === 0) k = 0;
    else if (nb === 0 && nr === 0) k = c1;
    else if (nr === 0 && nt === 0) k = c2;
    else if (nt === 0 && nl === 0) k = c3;
    if (k >= 0) {
        for (let m = 1; m < n - 1; m++) _tri.push(k, (k + m) % n, (k + m + 1) % n);
        return false;
    }
    if (nl === 0 && nr === 0) {
        // abajo: 0..c1 (u creciente); arriba: c3..c2 (u creciente, índices decrecientes)
        let a = 0, b = c3;
        while (a < c1 || b > c2) {
            if (b === c2 || (a < c1 && _pu[a + 1] <= _pu[b - 1])) { _tri.push(a, a + 1, b); a++; }
            else { _tri.push(a, b - 1, b); b--; }
        }
        return false;
    }
    if (nb === 0 && nt === 0) {
        // izquierda: 0, n-1 .. c3 (v creciente); derecha: c1..c2 (v creciente)
        const sig = x => (x === 0 ? n - 1 : x - 1);
        let a = 0, b = c1;
        while (a !== c3 || b < c2) {
            if (b === c2 || (a !== c3 && _pv[sig(a)] <= _pv[b + 1])) { _tri.push(a, b, sig(a)); a = sig(a); }
            else { _tri.push(a, b, b + 1); b++; }
        }
        return false;
    }
    // Caso general: el contorno es un rectángulo con puntos colineales en sus
    // lados (polígono convexo). Ear clipping sin vértice central: una oreja
    // (a, b, c) es válida si b es estrictamente convexo y ningún otro vértice
    // del contorno cae dentro del triángulo o sobre sus bordes. Así se obtienen
    // n - 2 triángulos no degenerados.
    const vs = [];
    for (let m = 0; m < n; m++) vs.push(m);
    const cruce = (a, b, c) => (_pu[b] - _pu[a]) * (_pv[c] - _pv[b]) - (_pv[b] - _pv[a]) * (_pu[c] - _pu[b]);
    // orientación de p respecto de la arista o→x (> 0: p a la izquierda)
    const orient = (o, x, y) => (_pu[x] - _pu[o]) * (_pv[y] - _pv[o]) - (_pv[x] - _pv[o]) * (_pu[y] - _pu[o]);
    const dentro = (p, a, b, c) => orient(a, b, p) >= 0 && orient(b, c, p) >= 0 && orient(c, a, p) >= 0;
    while (vs.length > 3) {
        const m = vs.length;
        let k = -1;
        for (let q = 0; q < m && k < 0; q++) {
            const a = vs[(q + m - 1) % m], b = vs[q], c = vs[(q + 1) % m];
            if (cruce(a, b, c) <= 0) continue;
            let libre = true;
            for (let r = 0; r < m && libre; r++) {
                const p = vs[r];
                if (p !== a && p !== b && p !== c && dentro(p, a, b, c)) libre = false;
            }
            if (libre) k = q;
        }
        if (k < 0) break;   // no ocurre con contornos de rectángulo
        _tri.push(vs[(k + m - 1) % m], vs[k], vs[(k + 1) % m]);
        vs.splice(k, 1);
    }
    if (vs.length === 3) _tri.push(vs[0], vs[1], vs[2]);
}
