// mapa.js - Almacén de chunks voxel, mallado incremental y modos dinámico/estático.
//
// Modo 'dinamico' (por defecto): el mapa puede editarse. Cada cambio marca como
// "sucio" al chunk editado y a su entorno de radio 2 (5 x 5 chunks): el borde
// compartido de cada chunk depende de sus vecinos de cara y de los vecinos de éstos
// (ver mallador.js, "acoplamiento entre chunks"). El remallado se hace por lotes
// con presupuesto de tiempo (`mallarPendientes`) o en workers (`mallarConPool`),
// de modo que una edición nunca bloquea el frame.
//
// Modo 'estatico': para mapas que no cambian (p. ej. un escenario de otro
// proyecto). Se malla todo una vez; `congelar()` libera los datos crudos de los
// chunks (sólo quedan las salidas de malla) y cualquier edición lanza error.
// `combinarTodo()` une el mapa completo en una geometría por material.

import { mallarChunk } from './mallador.js';
import { combinarLado } from './combinar.js';
import { MAX_TINTES } from './codigos.js';
import { construirAtlas } from './atlas.js';

const CLAVE = (cx, cz) => cx + '_' + cz;
// Versión global de chunk: cada cambio de datos recibe un número nuevo (lo usa el pool de workers).
let _versionChunk = 0;

export class MapaVoxel {
    /**
     * @param {Object} opts
     * @param {number} opts.tamanoChunk            ancho (x) y profundidad (z) de un chunk, en voxeles
     * @param {number} opts.alto                   alto del mundo en voxeles (y)
     * @param {number} [opts.profundidad]          por defecto = tamanoChunk
     * @param {number} [opts.bloque=1]             tamaño de un voxel en unidades de mundo
     * @param {number[]} [opts.tiposTransparentes] tipos que van al lado transparente (ej. vidrio)
     * @param {Array<number[]>} [opts.paletaTintes] colores RGB lineales por índice de tinte
     * @param {Function} [opts.iluminacion]        hook de luz horneada, ver mallarChunk
     * @param {'dinamico'|'estatico'} [opts.modo='dinamico']
     * @param {number} [opts.regionTamano=2]       chunks por lado de una región combinada
     * @param {number} [opts.alturaMinimaCamara]   plano Y bajo el que nunca está la cámara: omite las caras -Y
     *        que quedan en o por debajo de él (nunca se ven de frente). Ver mallarChunk.
     * @param {boolean} [opts.contornoCompleto=false] contorno con todos los enteros (salida de la 0.2)
     * @param {boolean} [opts.atlas=false]         modo atlas de caras (ver atlas.js): la máscara no tiene tipo
     *        ni tinte y cada voxel de una cara fundida lleva su color en un texel; sin atributo color.
     *        `colorTipos` (RGB por tipo para tinte 0) opcional, por defecto blanco.
     * @param {Array<number[]>} [opts.colorTipos]
     */
    constructor(opts) {
        this.ancho = opts.tamanoChunk;
        this.alto = opts.alto;
        this.profundidad = opts.profundidad ?? opts.tamanoChunk;
        this.modo = opts.modo ?? 'dinamico';
        if (this.modo !== 'dinamico' && this.modo !== 'estatico') throw new Error(`modo desconocido: ${this.modo}`);
        this.bloque = opts.bloque ?? 1;
        this.tiposTransparentes = opts.tiposTransparentes ?? [];
        this.paletaTintes = opts.paletaTintes ?? [];
        this.iluminacion = opts.iluminacion ?? null;
        this.regionTamano = opts.regionTamano ?? 2;
        this.atlas = opts.atlas ? construirAtlas({ paletaTintes: this.paletaTintes, colorTipos: opts.colorTipos }) : null;

        const setT = new Set(this.tiposTransparentes);
        this._esTransparente = tipo => setT.has(tipo);

        this.chunks = new Map();     // clave -> { cx, cz, datos, tintes }
        this.salidas = new Map();    // clave -> { clave, opacos, transparentes }
        this.sucios = new Set();     // claves pendientes de mallar
        this.versiones = new Map();  // clave -> contador de cambios (descarta resultados viejos)
        this.enVuelo = new Set();    // claves despachadas a workers
        this.congelado = false;
        this._vecinos = (cx, cz) => this.chunks.get(CLAVE(cx, cz));
        this._opts = {
            bloque: this.bloque,
            esTransparente: this._esTransparente,
            paletaTintes: this.paletaTintes,
            iluminacion: this.iluminacion,
            alturaMinimaCamara: opts.alturaMinimaCamara,
            contornoCompleto: opts.contornoCompleto === true,
            atlas: this.atlas,
        };
    }

    /** Carga (o reemplaza) un chunk. `datos`: Uint8Array de tipos, índice (x*alto+y)*profundidad+z. */
    setChunk(cx, cz, datos, tintes = null) {
        if (this.congelado) throw new Error('mapa congelado: no admite cargar chunks');
        if (datos.length !== this.ancho * this.alto * this.profundidad) {
            throw new Error(`chunk ${CLAVE(cx, cz)}: tamaño de datos inválido`);
        }
        this.chunks.set(CLAVE(cx, cz), {
            cx, cz, ancho: this.ancho, alto: this.alto, profundidad: this.profundidad,
            datos, tintes, version: ++_versionChunk,
        });
        this._marcarConVecinos(cx, cz);
    }

    /** Tipo del voxel de MUNDO (x, y, z). Fuera de los chunks cargados, aire (0). */
    tipoEn(x, y, z) {
        if (y < 0 || y >= this.alto) return 0;
        const cx = Math.floor(x / this.ancho), cz = Math.floor(z / this.profundidad);
        const c = this.chunks.get(CLAVE(cx, cz));
        if (!c || !c.datos) return 0;
        const lx = x - cx * this.ancho, lz = z - cz * this.profundidad;
        return c.datos[(lx * this.alto + y) * this.profundidad + lz];
    }

    /** Cambia un voxel de MUNDO (modo dinámico). `tinte` es un índice de la paleta (0 = sin tinte). */
    setVoxel(x, y, z, tipo, tinte = 0) {
        this._verEditable();
        if (y < 0 || y >= this.alto) throw new Error('setVoxel: y fuera del mundo');
        if (tinte < 0 || tinte > MAX_TINTES) throw new Error('setVoxel: tinte fuera de rango');
        const cx = Math.floor(x / this.ancho), cz = Math.floor(z / this.profundidad);
        const c = this.chunks.get(CLAVE(cx, cz));
        if (!c) throw new Error(`setVoxel: chunk ${CLAVE(cx, cz)} no cargado`);
        const lx = x - cx * this.ancho, lz = z - cz * this.profundidad;
        const idx = (lx * this.alto + y) * this.profundidad + lz;
        c.datos[idx] = tipo;
        if (tinte > 0 || c.tintes) {
            if (!c.tintes) c.tintes = new Uint16Array(c.datos.length);
            c.tintes[idx] = tinte;
        }
        c.version = ++_versionChunk;
        this._marcarEntorno(cx, cz);
    }

    /** Marca un chunk para remallado (y bumpea su versión). */
    _marcar(cx, cz) {
        const k = CLAVE(cx, cz);
        if (!this.chunks.has(k)) return;   // chunk no cargado: nada que mallar
        this.sucios.add(k);
        this.versiones.set(k, (this.versiones.get(k) ?? 0) + 1);
    }

    /**
     * Marca para remallado el entorno de radio 2 de un chunk. El borde compartido de
     * un chunk depende de sus vecinos de cara y de los vecinos de éstos (ver mallador.js),
     * así que cualquier cambio de datos afecta a los 5 x 5 chunks alrededor.
     */
    _marcarEntorno(cx, cz) {
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) this._marcar(cx + dx, cz + dz);
    }

    _marcarConVecinos(cx, cz) {
        // al cargar un chunk, su entorno (ya cargado) debe remallarse: ve su borde nuevo
        this._marcarEntorno(cx, cz);
    }

    _verEditable() {
        if (this.modo === 'estatico' || this.congelado) throw new Error('mapa estático: no admite ediciones');
    }

    /** Malla síncrona de un chunk (en el hilo que llama). */
    mallarChunk(cx, cz) {
        const k = CLAVE(cx, cz);
        const chunk = this.chunks.get(k);
        if (!chunk || !chunk.datos) return this.salidas.get(k) ?? null;   // liberado (congelado): no se remalla
        const salida = mallarChunk(chunk, this._vecinos, this._opts);
        this.salidas.set(k, salida);
        this.sucios.delete(k);
        return salida;
    }

    /**
     * Remallado incremental con presupuesto de tiempo. Devuelve cuántos chunks
     * se mallaron. Sin presupuesto malla todo lo pendiente.
     */
    mallarPendientes({ presupuestoMs = Infinity } = {}) {
        const t0 = performance.now();
        let n = 0;
        for (const k of [...this.sucios]) {
            if (n > 0 && performance.now() - t0 > presupuestoMs) break;
            const [cx, cz] = k.split('_').map(Number);
            this.mallarChunk(cx, cz);
            n++;
        }
        return n;
    }

    /**
     * Remallado en workers (ver worker/pool.js). Los resultados se aceptan sólo
     * si el chunk no cambió mientras se mallaba; si cambió, sigue sucio.
     * @returns {Promise<number>} cantidad de chunks aplicados
     */
    async mallarConPool(pool, { lote = 8 } = {}) {
        const pendientes = [...this.sucios].filter(k => !this.enVuelo.has(k));
        const tandas = [];
        for (let i = 0; i < pendientes.length; i += lote) tandas.push(pendientes.slice(i, i + lote));
        let aplicados = 0;
        await Promise.all(tandas.map(async tanda => {
            const versionesPedidas = new Map(tanda.map(k => [k, this.versiones.get(k)]));
            tanda.forEach(k => this.enVuelo.add(k));
            try {
                const salidas = await pool.mallar(tanda, k => this.chunks.get(k));
                for (const s of salidas) {
                    if (this.versiones.get(s.clave) !== versionesPedidas.get(s.clave)) continue;
                    this.salidas.set(s.clave, s);
                    this.sucios.delete(s.clave);
                    aplicados++;
                }
            } finally {
                tanda.forEach(k => this.enVuelo.delete(k));
            }
        }));
        return aplicados;
    }

    /** Salida de malla de un chunk (o undefined si aún no se malló). */
    salida(cx, cz) { return this.salidas.get(CLAVE(cx, cz)); }

    /** Clave de región de un chunk: chunks agrupados en bloques de `regionTamano` por lado. */
    regionDe(cx, cz) {
        return Math.floor(cx / this.regionTamano) + '_' + Math.floor(cz / this.regionTamano);
    }

    /**
     * Combina en una geometría por lado todos los chunks de una región.
     * @returns {{opacos, transparentes}|null} cada lado es el resultado de combinarLado
     */
    combinarRegion(region) {
        const listas = [];
        for (const [k, s] of this.salidas) {
            const [cx, cz] = k.split('_').map(Number);
            if (this.regionDe(cx, cz) === region) listas.push(s);
        }
        return this._combinarListas(listas);
    }

    /** Combina todo el mapa (uso típico del modo estático). */
    combinarTodo() { return this._combinarListas([...this.salidas.values()]); }

    _combinarListas(listas) {
        if (listas.length === 0) return null;
        return {
            opacos: combinarLado(listas.map(s => s.opacos)),
            transparentes: combinarLado(listas.map(s => s.transparentes)),
        };
    }

    /**
     * Modo estático: malla lo pendiente y libera los datos crudos de los chunks.
     * Después sólo quedan las salidas; `combinarTodo()` sigue funcionando.
     */
    congelar({ liberarDatos = true } = {}) {
        this.mallarPendientes();
        if (liberarDatos) {
            for (const c of this.chunks.values()) { c.datos = null; c.tintes = null; }
        }
        this.congelado = true;
        return this;
    }

    /** Número de chunks esperando remallado. */
    get pendientes() { return this.sucios.size; }
}
