// contorno.js - Buffers de vértices/índices y triangulación de rectángulos.
//
// Invariante: el contorno de cada rectángulo se corta en TODOS los enteros de
// sus aristas (contornoRectangulo). Así dos caras vecinas comparten las
// posiciones de arista y no hay T-junctions: la malla resultante es cerrada.

/** Acumulador de vértices e índices de un (tipo, tinte) de un chunk. */
export class BufferCara {
    constructor() {
        this.cap = 512;
        this.n = 0;
        this.pos = new Float32Array(this.cap * 3);
        this.nor = new Float32Array(this.cap * 3);
        this.uv = new Float32Array(this.cap * 2);
        this.col = null;                       // se crea con el primer tinte
        this.reg = null;                       // región de atlas de caras (ox, oy, w, h); se crea con la primera
        this.sol = new Float32Array(this.cap);
        this.luz = new Float32Array(this.cap);
        this.idxCap = 1536;
        this.idx = new Uint32Array(this.idxCap);
        this.idxN = 0;
    }

    _ensureV(extra) {
        if (this.n + extra <= this.cap) return;
        let cap = this.cap;
        while (cap < this.n + extra) cap *= 2;
        const pos = new Float32Array(cap * 3); pos.set(this.pos); this.pos = pos;
        const nor = new Float32Array(cap * 3); nor.set(this.nor); this.nor = nor;
        const uv = new Float32Array(cap * 2); uv.set(this.uv); this.uv = uv;
        if (this.col) { const col = new Float32Array(cap * 3); col.fill(1); col.set(this.col); this.col = col; }
        if (this.reg) { const reg = new Float32Array(cap * 4); reg.set(this.reg); this.reg = reg; }
        const sol = new Float32Array(cap); sol.set(this.sol); this.sol = sol;
        const luz = new Float32Array(cap); luz.set(this.luz); this.luz = luz;
        this.cap = cap;
    }

    _ensureI(extra) {
        if (this.idxN + extra <= this.idxCap) return;
        let cap = this.idxCap;
        while (cap < this.idxN + extra) cap *= 2;
        const idx = new Uint32Array(cap); idx.set(this.idx); this.idx = idx;
        this.idxCap = cap;
    }

    /**
     * Como `vertex`, pero reutiliza el vértice si ya se emitió uno con la misma
     * `clave` (posición + normal + código de cara: todos sus atributos iguales).
     * Así dos rectángulos vecinos del mismo código comparten sus vértices.
     */
    verticeCompartido(clave, x, y, z, nx, ny, nz, tu, tv, rgb, sol, luz) {
        if (this.vistos === undefined) this.vistos = new Map();
        const i = this.vistos.get(clave);
        if (i !== undefined) return i;
        const n = this.vertex(x, y, z, nx, ny, nz, tu, tv, rgb, sol, luz);
        this.vistos.set(clave, n);
        return n;
    }

    /**
     * Añade un vértice y devuelve su índice. `rgb` puede ser null (sin tinte).
     * `reg` (opcional) = [ox, oy, w, h] del bloque de atlas de la cara (ver atlas.js).
     */
    vertex(x, y, z, nx, ny, nz, tu, tv, rgb, sol, luz, reg = null) {
        this._ensureV(1);
        const i = this.n;
        const p = i * 3;
        this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z;
        this.nor[p] = nx; this.nor[p + 1] = ny; this.nor[p + 2] = nz;
        this.uv[i * 2] = tu; this.uv[i * 2 + 1] = tv;
        this.sol[i] = sol;
        this.luz[i] = luz;
        if (rgb !== null) {
            if (this.col === null) { this.col = new Float32Array(this.cap * 3); this.col.fill(1); }
            this.col[p] = rgb[0]; this.col[p + 1] = rgb[1]; this.col[p + 2] = rgb[2];
        }
        if (reg !== null) {
            if (this.reg === null) this.reg = new Float32Array(this.cap * 4);
            this.reg[i * 4] = reg[0]; this.reg[i * 4 + 1] = reg[1]; this.reg[i * 4 + 2] = reg[2]; this.reg[i * 4 + 3] = reg[3];
        }
        this.n = i + 1;
        return i;
    }

    tri(a, b, c) {
        this._ensureI(3);
        this.idx[this.idxN] = a; this.idx[this.idxN + 1] = b; this.idx[this.idxN + 2] = c;
        this.idxN += 3;
    }

    /**
     * Buffers exactos, listos para transferir (transferables) al hilo principal.
     * `atlas` (opcional) = bloque de texels del chunk para este lado (modo atlas de caras).
     */
    serializar(tipo, conTinte, atlas = null) {
        const verts = this.n;
        if (verts === 0 || this.idxN === 0) return null;
        const IndexCtor = verts > 65535 ? Uint32Array : Uint16Array;
        const index = new IndexCtor(this.idxN);
        index.set(this.idx.subarray(0, this.idxN));
        return {
            tipo,
            conTinte,
            position: this.pos.slice(0, verts * 3),
            normal: this.nor.slice(0, verts * 3),
            uv: this.uv.slice(0, verts * 2),
            color: this.col ? this.col.slice(0, verts * 3) : null,
            region: this.reg ? this.reg.slice(0, verts * 4) : null,
            atlas,
            sol: this.sol.slice(0, verts),
            luz: this.luz.slice(0, verts),
            index,
        };
    }
}

/**
 * Contorno completo (todos los enteros de las aristas). El mallador usa ahora
 * sólo los puntos necesarios (ver mallador.js); se conserva como referencia.
 * Puntos del contorno de un rectángulo (i,j,w,h) en coordenadas de plano, con
 * todos los enteros de sus cuatro aristas. Devuelve la cantidad de puntos; los
 * pares (u,v) quedan en `pts` (aplanados).
 */
export function contornoRectangulo(i, j, w, h, pts) {
    pts.length = 0;
    const i1 = i + w, j1 = j + h;
    for (let u = i; u < i1; u++) pts.push(u, j);       // arista inferior, u creciente
    for (let v = j; v < j1; v++) pts.push(i1, v);      // arista derecha, v creciente
    for (let u = i1; u > i; u--) pts.push(u, j1);      // arista superior, u decreciente
    for (let v = j1; v > j; v--) pts.push(i, v);       // arista izquierda, v decreciente
    return pts.length >> 1;
}

/**
 * Greedy merge 2D sobre una máscara plana de enteros (0 = vacío). Rellena
 * `rects` con tuplas (i, j, w, h, valor). `visitado` se reutiliza entre llamadas.
 */
export function fusionarMascara(mascara, visitado, cols, filas, rects) {
    visitado.fill(0, 0, cols * filas);
    rects.length = 0;
    for (let j = 0; j < filas; j++) {
        const base = j * cols;
        for (let i = 0; i < cols; i++) {
            const celda = base + i;
            const v = mascara[celda];
            if (v === 0 || visitado[celda]) continue;

            let w = 1;
            while (i + w < cols && mascara[celda + w] === v && visitado[celda + w] === 0) w++;

            let h = 1;
            crecer: while (j + h < filas) {
                const fila = (j + h) * cols + i;
                for (let k = 0; k < w; k++) {
                    if (mascara[fila + k] !== v || visitado[fila + k] !== 0) break crecer;
                }
                h++;
            }

            for (let dj = 0; dj < h; dj++) {
                const fila = (j + dj) * cols + i;
                visitado.fill(1, fila, fila + w);
            }
            rects.push(i, j, w, h, v);
            i += w - 1;
        }
    }
}
