import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';

const DEFAULT_CLEANUP_INTERVAL_MS = 60_000;

/**
 * Caché en memoria para el lado del servidor.
 *
 * - TTL por entrada (0 = sin expiración).
 * - Expiración perezosa al leer (get/has) + limpieza periódica automática.
 * - Emite eventos: 'set', 'get', 'delete', 'clear', 'expired', 'evicted'.
 *
 * @extends EventEmitter
 */
export class MemoryCache extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {number} [options.ttlMs=0] TTL por defecto en milisegundos (0 = no expira).
   * @param {number} [options.cleanupIntervalMs=60000] Intervalo de limpieza periódica en ms (0 = desactivada).
   * @param {number} [options.maxSize=0] Tamaño máximo de entradas (0 = ilimitado). Al llenarse evita la entrada menos recientemente usada.
   */
  constructor({ ttlMs = 0, cleanupIntervalMs = DEFAULT_CLEANUP_INTERVAL_MS, maxSize = 0 } = {}) {
    super();
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    /** @type {Map<string, { value: unknown, expiresAt: number, lastAccess: number }>} */
    this._store = new Map();
    this._timer = null;

    if (cleanupIntervalMs > 0) {
      this._timer = setInterval(() => this.cleanup(), cleanupIntervalMs);
      if (typeof this._timer.unref === 'function') {
        this._timer.unref();
      }
    }
  }

  /**
   * Devuelve el TTL en milisegundos de una entrada, usando el override por
   * entrada si se indicó, o el TTL por defecto de la caché.
   * @private
   */
  _resolveTtl(ttlMs) {
    return ttlMs === undefined ? this.ttlMs : ttlMs;
  }

  /**
   * Registra o reemplaza una entrada.
   * @param {string} key
   * @param {unknown} value
   * @param {number} [ttlMs] TTL específico en ms (anula el por defecto).
   * @returns {this}
   */
  set(key, value, ttlMs) {
    if (key === undefined || key === null) {
      throw new TypeError('MemoryCache#set: la clave no puede ser null/undefined');
    }
    const resolvedTtl = this._resolveTtl(ttlMs);
    const expiresAt = resolvedTtl > 0 ? Date.now() + resolvedTtl : Infinity;
    const record = { value, expiresAt, lastAccess: performance.now() };

    const exists = this._store.has(key);
    this._store.set(key, record);
    this._evictIfNeeded();
    this.emit('set', { key, value, ttlMs: resolvedTtl, exists });
    return this;
  }

  /**
   * Lee una entrada. Si está expirada la elimina (perezoso) y emite 'expired'.
   * @param {string} key
   * @returns {unknown | undefined}
   */
  get(key) {
    const record = this._store.get(key);
    if (!record) return undefined;

    if (this._isExpired(record)) {
      this._delete(key);
      this.emit('expired', { key });
      return undefined;
    }

    record.lastAccess = performance.now();
    this.emit('get', { key });
    return record.value;
  }

  /**
   * Indica si la clave existe y no está expirada.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const record = this._store.get(key);
    if (!record) return false;

    if (this._isExpired(record)) {
      this._delete(key);
      this.emit('expired', { key });
      return false;
    }

    return true;
  }

  /**
   * Elimina una entrada. Emite 'delete' solo si existía.
   * @param {string} key
   * @returns {boolean} true si existía y fue eliminada.
   */
  delete(key) {
    const existed = this._store.has(key);
    if (existed) {
      this._delete(key);
      this.emit('delete', { key });
    }
    return existed;
  }

  /**
   * Vacía la caché por completo. Emite 'clear' solo si había entradas.
   * @returns {number} cantidad de entradas eliminadas.
   */
  clear() {
    const count = this._store.size;
    if (count > 0) {
      this._store.clear();
      this.emit('clear', { count });
    }
    return count;
  }

  /**
   * Elimina todas las entradas expiradas. Emite 'expired' por cada una.
   * @returns {number} cantidad de entradas expiradas eliminadas.
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [key, record] of this._store) {
      if (record.expiresAt <= now) {
        this._store.delete(key);
        removed += 1;
        this.emit('expired', { key });
      }
    }
    return removed;
  }

  /**
   * Cantidad de entradas vivas (sin contar expiradas pendientes de purga).
   * @returns {number}
   */
  get size() {
    return this._store.size;
  }

  /**
   * Lista de claves de entradas vivas.
   * @returns {string[]}
   */
  keys() {
    return Array.from(this._store.keys());
  }

  /**
   * Detiene la limpieza periódica y libera el temporizador.
   */
  destroy() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.removeAllListeners();
  }

  /**
   * @private
   */
  _delete(key) {
    this._store.delete(key);
  }

  /**
   * @private
   */
  _isExpired(record) {
    return record.expiresAt <= Date.now();
  }

  /**
   * Si hay maxSize y la caché lo supera, expulsa la entrada menos
   * recientemente usada. Emite 'evicted'.
   * @private
   */
  _evictIfNeeded() {
    if (this.maxSize <= 0 || this._store.size <= this.maxSize) return;

    let lruKey = null;
    let lruAccess = Infinity;
    for (const [key, record] of this._store) {
      if (record.lastAccess < lruAccess) {
        lruAccess = record.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey !== null) {
      this._delete(lruKey);
      this.emit('evicted', { key: lruKey });
    }
  }
}

export default MemoryCache;
