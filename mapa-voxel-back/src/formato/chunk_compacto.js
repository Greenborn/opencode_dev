// chunk_compacto.js - Formato compacto de los datos crudos de un chunk.
//
// Lo comparten el servidor (construirMapa.js, multijugador.js), el hilo
// principal del cliente (manejo_chunks.js) y el worker de mallado
// (world_voxel.js): por eso no importa nada ni toca three.js/DOM.
//
// Un mapa son ~38 millones de celdas y ~550 mil tintes, y cada copia viva de
// esos datos (mapa vigente del servidor, mapa de la ronda siguiente, mensaje
// a cada cliente, `chunkData`, caché de cada worker) pagaba el formato
// ingenuo entero. Acá se guarda sólo lo que no se puede deducir:
//
// VOXELS
//   Todas las columnas de un chunk son iguales por debajo de cierta altura
//   (subsuelo macizo) y aire por encima del edificio más alto. Sólo se
//   guardan las capas [yBase, yBase + capas):
//     - y <  yBase          => `relleno` (tipo implícito del subsuelo)
//     - y >= yBase + capas  => aire
//   `types` sigue empaquetado a 4 bits/celda, con el mismo orden de siempre
//   pero relativo a yBase:  idx = (lx * capas + (y - yBase)) * D + lz
//   `volumeHeight` conserva su significado: el alto LÓGICO del mundo.
//   Si alguien escribe fuera del rango guardado (un cráter que baja al
//   subsuelo), el rango crece solo (ver `escribirVoxel`).
//
// TINTES
//   En vez de un objeto `{ idx, tintMinimap: {...}, tintRender: {...} }` por
//   celda (3 objetos de heap, y JSON al viajar), tres piezas:
//     - `tintClaves` Uint32Array ordenado: clave de celda (ver `claveTinte`)
//     - `tintIds`    Uint16Array paralelo: índice en `tintPaleta` (0 = sin tinte)
//     - `tintPaleta` [null, { tintMinimap?, tintRender? }, ...] combinaciones únicas
//   `tintN` es la cantidad de entradas usadas (los arrays pueden tener holgura).
//   La clave no depende de yBase/capas, así que crecer el rango no la mueve.
//
// MAPAS DE ALTURA
//   `heightMap`/`maxHeightMap` eran arrays de arrays de números (8 bytes por
//   celda en Node, y JSON de ~1.5 MB c/u hacia cada cliente). Viajan y se
//   guardan como un Uint8Array plano; `filasMapaAlturas` arma vistas por fila
//   para que el código que hace `mapa[x][z]` siga funcionando sin copiar.

/** Capas extra que se reservan al crecer, para no realojar en cada voxel. */
const MARGEN_CRECER = 6;

// ---------------------------------------------------------------------------
// Voxels
// ---------------------------------------------------------------------------

/**
 * Tipo de bloque en coordenadas LOCALES del chunk. No valida lx/lz (el que
 * llama ya sabe que caen dentro); `y` puede ser cualquiera.
 */
export function leerVoxel(c, lx, y, lz) {
    const yl = y - c.yBase;
    if (yl < 0) return y < 0 ? 0 : c.relleno;
    if (yl >= c.capas) return 0;
    const idx = (lx * c.capas + yl) * c.volumeDepth + lz;
    return (c.types[idx >> 1] >> ((idx & 1) << 2)) & 0x0F;
}

/** Realoja `types` para que cubra las capas [y0, y1). Conserva el contenido. */
function cambiarRango(c, y0, y1) {
    const W = c.volumeWidth, D = c.volumeDepth;
    const capasNuevas = y1 - y0;
    const nuevo = new Uint8Array(Math.ceil((W * capasNuevas * D) / 2));
    for (let lx = 0; lx < W; lx++) {
        for (let yl = 0; yl < capasNuevas; yl++) {
            const y = y0 + yl;
            const fila = (lx * capasNuevas + yl) * D;
            for (let lz = 0; lz < D; lz++) {
                const t = leerVoxel(c, lx, y, lz);
                if (t === 0) continue;
                const idx = fila + lz;
                nuevo[idx >> 1] |= t << ((idx & 1) << 2);
            }
        }
    }
    c.types = nuevo;
    c.yBase = y0;
    c.capas = capasNuevas;
}

/**
 * Cambia el tipo de un voxel (coordenadas locales). Devuelve false si cae
 * fuera del mundo. Si la celda queda fuera del rango guardado, lo agranda.
 */
export function escribirVoxel(c, lx, y, lz, tipo) {
    if (y < 0 || y >= c.volumeHeight) return false;
    if (lx < 0 || lx >= c.volumeWidth || lz < 0 || lz >= c.volumeDepth) return false;
    tipo &= 0x0F;
    if (y < c.yBase) {
        if (tipo === c.relleno) return true;            // ya vale eso
        cambiarRango(c, Math.max(0, y - MARGEN_CRECER), c.yBase + c.capas);
    } else if (y >= c.yBase + c.capas) {
        if (tipo === 0) return true;                    // ya es aire
        cambiarRango(c, c.yBase, Math.min(c.volumeHeight, y + 1 + MARGEN_CRECER));
    }
    const idx = (lx * c.capas + (y - c.yBase)) * c.volumeDepth + lz;
    const byteIdx = idx >> 1;
    const shift = (idx & 1) << 2;
    c.types[byteIdx] = (c.types[byteIdx] & (0xF0 >> shift)) | (tipo << shift);
    return true;
}

// ---------------------------------------------------------------------------
// Tintes
// ---------------------------------------------------------------------------

/** Clave de celda para los tintes: columna (lx,lz) en los bits altos, `y` en los 8 bajos. */
export function claveTinte(c, lx, y, lz) {
    return ((lx * c.volumeDepth + lz) << 8) | y;
}

/** Posición de `clave` en `tintClaves`, o -1 si la celda no tiene entrada. */
function buscarTinte(c, clave) {
    const claves = c.tintClaves;
    let lo = 0, hi = (c.tintN | 0) - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const v = claves[mid];
        if (v === clave) return mid;
        if (v < clave) lo = mid + 1; else hi = mid - 1;
    }
    return -(lo + 1);   // negativo: -(punto de inserción + 1)
}

function mismoTinte(a, b) {
    if (!a || !b) return !a && !b;
    return a.color === b.color && a.opacity === b.opacity;
}

/** Índice en `tintPaleta` de la combinación (minimapa, render); la agrega si falta. */
export function idPaleta(c, tintMinimap, tintRender) {
    if (!tintMinimap && !tintRender) return 0;
    const paleta = c.tintPaleta || (c.tintPaleta = [null]);
    for (let i = 1; i < paleta.length; i++) {
        const p = paleta[i];
        if (mismoTinte(p.tintMinimap, tintMinimap) && mismoTinte(p.tintRender, tintRender)) return i;
    }
    if (paleta.length >= 65535) return 0;   // no entra en Uint16: se queda sin tinte
    const entrada = {};
    if (tintMinimap) entrada.tintMinimap = { color: tintMinimap.color, opacity: tintMinimap.opacity };
    if (tintRender) entrada.tintRender = { color: tintRender.color, opacity: tintRender.opacity };
    paleta.push(entrada);
    return paleta.length - 1;
}

/** Combinación `{ tintMinimap?, tintRender? }` de una celda, o null. */
export function tinteDe(c, lx, y, lz) {
    if (!c.tintN) return null;
    const pos = buscarTinte(c, claveTinte(c, lx, y, lz));
    if (pos < 0) return null;
    return c.tintPaleta[c.tintIds[pos]] || null;
}

/** Aplica (o reemplaza) el tinte de render de una celda, conservando el de minimapa. */
export function ponerTinteRender(c, lx, y, lz, color, opacity) {
    if (y < 0 || y >= c.volumeHeight) return false;
    if (lx < 0 || lx >= c.volumeWidth || lz < 0 || lz >= c.volumeDepth) return false;
    const clave = claveTinte(c, lx, y, lz);
    const n = c.tintN | 0;
    let pos = n > 0 ? buscarTinte(c, clave) : -1;
    if (pos >= 0) {
        const previo = c.tintPaleta[c.tintIds[pos]] || null;
        c.tintIds[pos] = idPaleta(c, previo && previo.tintMinimap, { color, opacity });
        return true;
    }
    const id = idPaleta(c, null, { color, opacity });
    if (id === 0) return false;
    pos = -pos - 1;
    if (!c.tintClaves || n >= c.tintClaves.length) {
        const cap = n + Math.max(64, n >> 3);
        const claves = new Uint32Array(cap);
        const ids = new Uint16Array(cap);
        if (n > 0) { claves.set(c.tintClaves.subarray(0, n)); ids.set(c.tintIds.subarray(0, n)); }
        c.tintClaves = claves;
        c.tintIds = ids;
    }
    c.tintClaves.copyWithin(pos + 1, pos, n);
    c.tintIds.copyWithin(pos + 1, pos, n);
    c.tintClaves[pos] = clave;
    c.tintIds[pos] = id;
    c.tintN = n + 1;
    return true;
}

/** Quita cualquier tinte de la celda (el bloque ya no existe). */
export function quitarTinte(c, lx, y, lz) {
    if (!c.tintN) return;
    const pos = buscarTinte(c, claveTinte(c, lx, y, lz));
    if (pos >= 0) c.tintIds[pos] = 0;
}

// ---------------------------------------------------------------------------
// Transporte
// ---------------------------------------------------------------------------

function comoTipado(valor, Ctor) {
    if (!valor || valor instanceof Ctor) return valor;
    // socket.io entrega los binarios como ArrayBuffer en el navegador (y como
    // Buffer en Node): se vuelve a envolver con el tipo original.
    if (valor instanceof ArrayBuffer) return new Ctor(valor);
    if (ArrayBuffer.isView(valor)) {
        const bytes = Ctor.BYTES_PER_ELEMENT;
        if (valor.byteOffset % bytes === 0) {
            return new Ctor(valor.buffer, valor.byteOffset, Math.floor(valor.byteLength / bytes));
        }
        return new Ctor(valor.buffer.slice(valor.byteOffset, valor.byteOffset + valor.byteLength));
    }
    return new Ctor(valor);
}

/**
 * Deja listo para usar un chunk recién llegado por la red: los TypedArray
 * pierden su tipo en el camino (ver `comoTipado`). Idempotente.
 */
export function revivirChunk(c) {
    if (!c) return c;
    if (c.types) c.types = comoTipado(c.types, Uint8Array);
    if (c.tintClaves) c.tintClaves = comoTipado(c.tintClaves, Uint32Array);
    if (c.tintIds) c.tintIds = comoTipado(c.tintIds, Uint16Array);
    return c;
}

// ---------------------------------------------------------------------------
// Mapas de altura
// ---------------------------------------------------------------------------

/**
 * Pasa un mapa de alturas `mapa[x][z]` a `{ ancho, profundo, datos }` con un
 * byte por celda (datos[x * profundo + z]). Devuelve null si algún valor no
 * entra en un byte: en ese caso se sigue usando el array anidado.
 */
export function compactarMapaAlturas(mapa) {
    if (!Array.isArray(mapa) || mapa.length === 0 || !mapa[0]) return null;
    const ancho = mapa.length;
    const profundo = mapa[0].length;
    const datos = new Uint8Array(ancho * profundo);
    for (let x = 0; x < ancho; x++) {
        const fila = mapa[x];
        if (!fila || fila.length !== profundo) return null;
        const base = x * profundo;
        for (let z = 0; z < profundo; z++) {
            const v = fila[z];
            if (!Number.isInteger(v) || v < 0 || v > 255) return null;
            datos[base + z] = v;
        }
    }
    return { ancho, profundo, datos };
}

/**
 * Inverso de `compactarMapaAlturas` para leer: un array de vistas por fila
 * sobre el mismo buffer, así `filas[x][z]` funciona sin copiar los datos.
 * Si ya recibe un array anidado (formato viejo), lo devuelve tal cual.
 */
export function filasMapaAlturas(mapa) {
    if (!mapa || Array.isArray(mapa)) return mapa || null;
    const datos = comoTipado(mapa.datos, Uint8Array);
    const { ancho, profundo } = mapa;
    const filas = new Array(ancho);
    for (let x = 0; x < ancho; x++) {
        filas[x] = datos.subarray(x * profundo, (x + 1) * profundo);
    }
    return filas;
}
