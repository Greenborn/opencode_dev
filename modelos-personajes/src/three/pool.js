// Pool instanciado: muchos personajes de UNA geometría en un solo InstancedMesh.
//
// - Slots contiguos [0, n): sólo se dibujan los vivos (`mesh.count` = n).
// - Capacidad inicial reservada en memoria y en GPU; crece al doble si se llena y
//   se reduce a la mitad si queda por debajo de un cuarto (sin bajar de la inicial).
// - Liberar compacta con el último vivo (swap-remove): no quedan huecos.
// - Atributos por instancia (p. ej. luz horneada): se declaran al crear el pool y
//   viajan con la matriz en el mismo slot.
// - Cada id de personaje se reserva con `reservar(id)`, se escribe con `poner` y se
//   libera con `liberar(id)`. `subir()` una vez por frame sube lo escrito a la GPU.
import * as THREE from 'three';

const CAPACIDAD_INICIAL = 50;
const _m = new THREE.Matrix4();

export class PoolInstanciado {
    /**
     * @param {THREE.Scene} scene
     * @param {THREE.BufferGeometry} geometria   la misma para todas las instancias
     * @param {THREE.Material} material
     * @param {object} [opciones]
     * @param {string} [opciones.nombre]          nombre de la malla (depuración)
     * @param {number} [opciones.capacidadInicial=50]
     * @param {{nombre: string, tamano: number}[]} [opciones.atributos]  atributos por instancia
     */
    constructor(scene, geometria, material, opciones = {}) {
        this.scene = scene;
        this.geometria = geometria;
        this.material = material;
        this.nombre = opciones.nombre ?? 'personajes';
        this.capacidadInicial = opciones.capacidadInicial ?? CAPACIDAD_INICIAL;
        this.atributosDef = opciones.atributos ?? [];
        this.capacidad = 0;
        this.malla = null;
        this.n = 0;
        this.idEnSlot = [];
        this.slotDe = new Map();
        this._attrs = new Map();   // nombre -> { tamano, array: Float32Array, attr: THREE.InstancedBufferAttribute }
        this._crearMalla(this.capacidadInicial, null);
    }

    /** Cantidad de instancias vivas. */
    get vivos() { return this.n; }

    /** Slot del id, o -1 si no está en el pool. */
    slotDeId(id) {
        const s = this.slotDe.get(id);
        return s === undefined ? -1 : s;
    }

    /** Reserva un slot para `id` (reusa el existente si ya estaba). */
    reservar(id) {
        const existente = this.slotDe.get(id);
        if (existente !== undefined) return existente;
        if (this.n >= this.capacidad) this._redimensionar(this.capacidad * 2);
        const slot = this.n;
        this.n++;
        this.idEnSlot[slot] = id;
        this.slotDe.set(id, slot);
        this.malla.count = this.n;
        return slot;
    }

    /** Escribe la matriz de mundo de `id`. Si no está reservado, no hace nada. */
    poner(id, matriz) {
        const slot = this.slotDe.get(id);
        if (slot === undefined) return;
        this.malla.setMatrixAt(slot, matriz);
    }

    /**
     * Escribe un atributo por instancia (ej. `luzInst`) para `id`.
     * @param {number[]|Float32Array} valores  `tamano` números
     */
    escribirAtributo(id, nombre, valores) {
        const slot = this.slotDe.get(id);
        const a = this._attrs.get(nombre);
        if (slot === undefined || !a) return;
        for (let k = 0; k < a.tamano; k++) a.array[slot * a.tamano + k] = valores[k];
    }

    /** Libera el slot de `id` compactando con el último vivo. */
    liberar(id) {
        const slot = this.slotDe.get(id);
        if (slot === undefined) return;
        const ultimo = this.n - 1;
        if (slot !== ultimo) {
            const idUltimo = this.idEnSlot[ultimo];
            this.malla.getMatrixAt(ultimo, _m);
            this.malla.setMatrixAt(slot, _m);
            for (const a of this._attrs.values()) {
                a.array.copyWithin(slot * a.tamano, ultimo * a.tamano, ultimo * a.tamano + a.tamano);
            }
            this.idEnSlot[slot] = idUltimo;
            this.slotDe.set(idUltimo, slot);
        }
        this.idEnSlot.length = ultimo;
        this.slotDe.delete(id);
        this.n = ultimo;
        this.malla.count = this.n;

        if (this.capacidad > this.capacidadInicial && this.n < this.capacidad / 4) {
            this._redimensionar(Math.max(this.capacidadInicial, Math.floor(this.capacidad / 2)));
        }
    }

    /** Sube al GPU lo escrito en este frame. Llamar una vez por frame. */
    subir() {
        if (this.n > 0) {
            this.malla.instanceMatrix.needsUpdate = true;
            for (const a of this._attrs.values()) a.attr.needsUpdate = true;
        }
    }

    /** Quita la malla de la escena. Geometría y material no se tocan. */
    destruir() {
        if (!this.malla) return;
        this.scene.remove(this.malla);
        this.malla.dispose();
        this.malla = null;
        this.n = 0;
        this.slotDe.clear();
        this.idEnSlot.length = 0;
    }

    _crearMalla(capacidad, previa) {
        // atributos por instancia: se realojan al crecer, copiando lo que había
        for (const def of this.atributosDef) {
            const viejo = this._attrs.get(def.nombre);
            const array = new Float32Array(capacidad * def.tamano);
            if (viejo) array.set(viejo.array.subarray(0, Math.min(viejo.array.length, array.length)));
            const attr = new THREE.InstancedBufferAttribute(array, def.tamano);
            this.geometria.setAttribute(def.nombre, attr);
            this._attrs.set(def.nombre, { tamano: def.tamano, array, attr });
        }
        const nueva = new THREE.InstancedMesh(this.geometria, this.material, capacidad);
        nueva.name = `personajes_${this.nombre}`;
        nueva.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        nueva.castShadow = false;
        nueva.receiveShadow = true;
        // las instancias se mueven por todo el mapa: el bounding de la geometría base no sirve
        nueva.frustumCulled = false;
        nueva.count = this.n;
        if (previa) {
            for (let i = 0; i < this.n; i++) {
                previa.getMatrixAt(i, _m);
                nueva.setMatrixAt(i, _m);
            }
            this.scene.remove(previa);
            previa.dispose();
        }
        this.scene.add(nueva);
        this.malla = nueva;
        this.capacidad = capacidad;
    }

    _redimensionar(capacidad) {
        this._crearMalla(capacidad, this.malla);
    }
}
