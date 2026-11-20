/**
 * VolumeBuffer — almacenamiento eficiente de volumen 3D de bloques.
 *
 * Internamente usa UNA sola asignación plana (no un array denso de
 * width*height*depth, ni un objeto por columna) repartida por columna (x,z)
 * según `colHeights`: la altura que esa columna necesita en la práctica
 * (suelo + el edificio más alto que la cubra), calculada de antemano por
 * quien genera el mapa a partir de `heightMap`/`structures` (ver
 * `computeColumnHeights` más abajo y su uso en mapType3.js).
 *
 * La mayoría de las columnas son calle/vereda y sólo necesitan una fracción
 * de `height` (volumeHeight); sólo las que tienen un edificio encima reservan
 * hasta su altura real. Como es UN array (con offsets precalculados, estilo
 * CSR) y no uno por columna, no paga el overhead por objeto de tener
 * millones de TypedArrays sueltos.
 *
 * Si algún escritor pide una celda por encima de lo previsto (un caso no
 * cubierto por `computeColumnHeights`), no se pierde ni se corta: cae a un
 * `Map` de desborde disperso, así que el peor caso es "un poco menos
 * compacto", nunca datos perdidos o corrompidos.
 *
 *   - Un Map disperso para tintes (solo almacena celdas que los tienen), con
 *     las combinaciones de color en una paleta compartida (ver `paleta`).
 *
 * BLOCK_TYPES.AIR = 0: una celda sin escribir (dentro o fuera del rango
 * reservado) se lee como aire.
 */
export class VolumeBuffer {
    /**
     * @param {Uint16Array|number[]} colHeights - alto a reservar por columna
     *   (x*depth+z), calculado por `computeColumnHeights`.
     */
    constructor(width, height, depth, colHeights) {
        this.width  = width;
        this.height = height; // volumeHeight: tope teórico, no lo que reserva cada columna
        this.depth  = depth;

        const numCols = width * depth;
        this.colHeights = colHeights || new Uint16Array(numCols).fill(height);

        // offsets estilo CSR: colOffset[ci] = inicio de la columna ci en `data`.
        this.colOffset = new Uint32Array(numCols + 1);
        let total = 0;
        for (let ci = 0; ci < numCols; ci++) {
            this.colOffset[ci] = total;
            total += this.colHeights[ci];
        }
        this.colOffset[numCols] = total;
        this.data = new Uint8Array(total);

        // Red de seguridad: celdas con y >= colHeights[ci] que alguna parte
        // del generador necesite escribir igual (no debería pasar si
        // `computeColumnHeights` está bien calculado, pero así no se pierden).
        this.overflow = new Map(); // Map<flatIndex, type>

        // Tintes: Map<flatIndex, id de paleta>. Antes cada celda tintada
        // guardaba su propio objeto `{ tintMinimap: {...}, tintRender: {...} }`
        // (3 objetos de heap por celda, y un mapa tiene ~550 mil): como las
        // combinaciones distintas son unas pocas decenas, se guarda una sola
        // vez cada una en `paleta` y la celda sólo lleva su número.
        this.tints = new Map();
        this.paleta = [null];           // id -> { tintMinimap?, tintRender? } (inmutable)
        this._idPorClave = new Map();   // "color|opacidad|color|opacidad" -> id
    }

    /** Id de paleta de la combinación (minimapa, render); la crea si no existe. */
    _idTinte(tintMinimap, tintRender) {
        const clave = (tintMinimap ? tintMinimap.color + '|' + tintMinimap.opacity : '|') + '|' +
            (tintRender ? tintRender.color + '|' + tintRender.opacity : '|');
        let id = this._idPorClave.get(clave);
        if (id === undefined) {
            const entrada = {};
            if (tintMinimap) entrada.tintMinimap = { color: tintMinimap.color, opacity: tintMinimap.opacity };
            if (tintRender) entrada.tintRender = { color: tintRender.color, opacity: tintRender.opacity };
            id = this.paleta.length;
            this.paleta.push(entrada);
            this._idPorClave.set(clave, id);
        }
        return id;
    }

    /** Índice de columna para (x, z). */
    _colIdx(x, z) {
        return x * this.depth + z;
    }

    /** Índice plano "lógico" para la posición (x, y, z) — clave de `tints`/`overflow`. */
    _idx(x, y, z) {
        return x * this.height * this.depth + y * this.depth + z;
    }

    get(x, y, z) {
        const type = this.getType(x, y, z);
        const id = this.tints.get(this._idx(x, y, z));
        return id ? { type, ...this.paleta[id] } : type;
    }

    /** Devuelve solo el tipo numérico (más rápido que get cuando no se necesita el tinte). */
    getType(x, y, z) {
        const ci = this._colIdx(x, z);
        if (y < this.colHeights[ci]) {
            return this.data[this.colOffset[ci] + y];
        }
        if (this.overflow.size === 0) return 0;
        const v = this.overflow.get(this._idx(x, y, z));
        return v == null ? 0 : v;
    }

    /**
     * Almacena un valor de celda.
     *   - Si val es un número: guarda el tipo, borra cualquier tinte existente.
     *   - Si val es un objeto {type, tintMinimap?, tintRender?, tint?}: separa
     *     el tipo y los tintes; el campo legacy `tint` se trata como tintMinimap.
     *   - null/undefined → AIR (0).
     */
    set(x, y, z, val) {
        let type, idTinte = 0;
        if (val && typeof val === 'object') {
            type = val.type || 0;
            const tintMinimap = val.tintMinimap || val.tint || null; // `tint`: campo legacy
            const tintRender = val.tintRender || null;
            if (tintMinimap || tintRender) idTinte = this._idTinte(tintMinimap, tintRender);
        } else {
            type = (val == null ? 0 : val);
        }

        const idx = this._idx(x, y, z);
        const ci  = this._colIdx(x, z);

        if (y < this.colHeights[ci]) {
            this.data[this.colOffset[ci] + y] = type;
        } else {
            // fuera del rango previsto para esta columna: red de seguridad.
            if (type === 0) this.overflow.delete(idx);
            else this.overflow.set(idx, type);
        }

        if (idTinte) this.tints.set(idx, idTinte);
        else this.tints.delete(idx);
    }

    /** Añade o actualiza el tinte de minimapa de una celda sin tocar el tipo. */
    setTintMinimap(x, y, z, color, opacity) {
        const idx    = this._idx(x, y, z);
        const previo = this.paleta[this.tints.get(idx) || 0];
        this.tints.set(idx, this._idTinte({ color, opacity }, previo ? previo.tintRender : null));
    }

    /** Añade o actualiza el tinte de render de una celda sin tocar el tipo. */
    setTintRender(x, y, z, color, opacity) {
        const idx    = this._idx(x, y, z);
        const previo = this.paleta[this.tints.get(idx) || 0];
        this.tints.set(idx, this._idTinte(previo ? previo.tintMinimap : null, { color, opacity }));
    }
}

/**
 * Calcula, para cada columna (x,z), la altura real que necesita reservar:
 * el nivel de suelo (heightMap) más la del edificio más alto (si hay alguno)
 * que la cubra, con un margen chico para antepechos de techo (ver
 * `buildRoofParapets` en generadorCasaPisos.js, que escribe un bloque por
 * encima de `s.y + s.height`).
 *
 * No hace falta que sea exacto: cualquier escritura que se escape de este
 * cálculo cae al `overflow` de VolumeBuffer en vez de perderse.
 */
export function computeColumnHeights(width, depth, volumeHeight, heightMap, room, structures) {
    const colHeights = new Uint16Array(width * depth);

    for (let x = 0; x < width; x++) {
        const row = heightMap[x];
        if (!row) continue;
        const base = x * depth;
        for (let z = 0; z < depth; z++) {
            const h = row[z];
            if (typeof h === 'number' && h > colHeights[base + z]) colHeights[base + z] = h;
        }
    }

    const ROOF_MARGIN = 9; // antepecho, casilla de escalera o tanque de agua (ver buildRoofExtras) + margen

    const markBox = (hx, hz, hw, hd, topY) => {
        const top = Math.min(volumeHeight, topY);
        const x0 = Math.max(0, hx), x1 = Math.min(width, hx + hw);
        const z0 = Math.max(0, hz), z1 = Math.min(depth, hz + hd);
        for (let x = x0; x < x1; x++) {
            const base = x * depth;
            for (let z = z0; z < z1; z++) {
                if (top > colHeights[base + z]) colHeights[base + z] = top;
            }
        }
    };

    if (room) {
        markBox(room.x, room.z, room.width, room.depth, room.y + room.height + ROOF_MARGIN);
    }

    if (structures && structures.length) {
        for (const s of structures) {
            if (!s || s.type === 'spawn' || s.width == null || s.height == null || s.depth == null) continue;
            markBox(s.x, s.z, s.width, s.depth, s.y + s.height + ROOF_MARGIN);
        }
    }

    for (let i = 0; i < colHeights.length; i++) {
        if (colHeights[i] > volumeHeight) colHeights[i] = volumeHeight;
    }

    return colHeights;
}
