// Greedy meshing de voxels (lógica pura, sin three.js: apta para Web Worker).
//
// En lugar de un cubo completo por voxel (24 vértices, 12 triángulos, también las caras tapadas):
//   - sólo se emiten las caras expuestas (vecino vacío en la misma grilla);
//   - las caras coplanares contiguas con la misma clave (color + acabado) se funden en un rectángulo;
//   - los vértices se comparten con índice cuando coinciden posición, normal y clave.
// El volumen cubierto, la silueta y el color de cada cara visible son los mismos que con cubos sueltos.

/**
 * Malla de una grilla de voxels unitarios: la celda (x, y, z) ocupa [x, x+1] × [y, y+1] × [z, z+1].
 * @param {ArrayLike<number>} celdas  x, y, z enteros por voxel (3 por voxel)
 * @param {ArrayLike<number>} claves  entero > 0 por voxel; misma clave = mismo material (se pueden fundir).
 *   Si dos voxels caen en la misma celda, gana el último.
 * @returns {{ posiciones: Float32Array, normales: Float32Array, claves: Uint32Array, indices: Uint16Array|Uint32Array }}
 *   posiciones en la grilla de entrada; claves por vértice; triángulos antihorarios vistos desde afuera.
 */
export function mallaVoxelGreedy(celdas, claves) {
    const n = claves.length;
    const P = [], N = [], K = [], I = [];
    if (!n) return { posiciones: new Float32Array(0), normales: new Float32Array(0), claves: new Uint32Array(0), indices: new Uint16Array(0) };
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < n; c++) for (let e = 0; e < 3; e++) {
        const x = celdas[c * 3 + e];
        if (x < min[e]) min[e] = x;
        if (x > max[e]) max[e] = x;
    }
    const dim = [max[0] - min[0] + 1, max[1] - min[1] + 1, max[2] - min[2] + 1];
    const vol = new Int32Array(dim[0] * dim[1] * dim[2]);
    for (let c = 0; c < n; c++) {
        vol[(celdas[c * 3] - min[0]) + dim[0] * ((celdas[c * 3 + 1] - min[1]) + dim[1] * (celdas[c * 3 + 2] - min[2]))] = claves[c];
    }
    const en = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= dim[0] || y >= dim[1] || z >= dim[2]) ? 0 : vol[x + dim[0] * (y + dim[1] * z)];

    // vértice compartido por (posición, dirección de la cara, clave)
    const vertices = new Map();
    const vertice = (p, d, s, k) => {
        const clave = `${p[0]},${p[1]},${p[2]},${d * 2 + (s > 0 ? 1 : 0)},${k}`;
        let i = vertices.get(clave);
        if (i !== undefined) return i;
        i = K.length;
        P.push(p[0] + min[0], p[1] + min[1], p[2] + min[2]);
        N.push(d === 0 ? s : 0, d === 1 ? s : 0, d === 2 ? s : 0);
        K.push(k);
        vertices.set(clave, i);
        return i;
    };

    const x = [0, 0, 0], p = [0, 0, 0], esq = [0, 0, 0, 0];
    for (let d = 0; d < 3; d++) {
        const u = (d + 1) % 3, v = (d + 2) % 3;                          // (u, v, d) cíclico: u × v = +d
        const du = dim[u], dv = dim[v];
        const mask = new Int32Array(du * dv);
        for (const s of [-1, 1]) {
            for (x[d] = 0; x[d] < dim[d]; x[d]++) {
                // caras expuestas de esta capa hacia s (0 = sin cara)
                for (x[v] = 0; x[v] < dv; x[v]++) for (x[u] = 0; x[u] < du; x[u]++) {
                    const k = en(x[0], x[1], x[2]);
                    let vecino = 0;
                    if (k) { x[d] += s; vecino = en(x[0], x[1], x[2]); x[d] -= s; }
                    mask[x[u] + du * x[v]] = k && !vecino ? k : 0;
                }
                // rectángulos máximos de la misma clave: primero a lo ancho (u), después a lo alto (v)
                for (let j = 0; j < dv; j++) for (let i = 0; i < du;) {
                    const k = mask[i + du * j];
                    if (!k) { i++; continue; }
                    let w = 1;
                    while (i + w < du && mask[i + w + du * j] === k) w++;
                    let h = 1;
                    alto: for (; j + h < dv; h++) for (let t = 0; t < w; t++) if (mask[i + t + du * (j + h)] !== k) break alto;
                    for (let jj = 0; jj < h; jj++) mask.fill(0, i + du * (j + jj), i + w + du * (j + jj));
                    p[d] = x[d] + (s > 0 ? 1 : 0);
                    p[u] = i; p[v] = j; esq[0] = vertice(p, d, s, k);
                    p[u] = i + w; esq[1] = vertice(p, d, s, k);
                    p[v] = j + h; esq[2] = vertice(p, d, s, k);
                    p[u] = i; esq[3] = vertice(p, d, s, k);
                    if (s > 0) I.push(esq[0], esq[1], esq[2], esq[0], esq[2], esq[3]);
                    else I.push(esq[0], esq[2], esq[1], esq[0], esq[3], esq[2]);
                    i += w;
                }
            }
        }
    }
    return {
        posiciones: new Float32Array(P),
        normales: new Float32Array(N),
        claves: new Uint32Array(K),
        indices: K.length > 65535 ? new Uint32Array(I) : new Uint16Array(I),
    };
}
