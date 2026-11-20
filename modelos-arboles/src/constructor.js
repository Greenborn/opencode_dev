// constructor.js - Acumulador de piezas PURO (sin three.js).
//
// Misma API que `ConstructorPiezas` de `cliente/constructor_piezas.js`, pero en
// lugar de crear geometrías guarda DESCRIPCIONES de primitivas. Así la
// especificación de un árbol es datos planos: se puede calcular en un Web Worker,
// testear en Node y convertir a three.js después (ver `three/geometria.js`).
//
// Cada primitiva: { forma, pos, color, rot, ...parámetros de la forma }.
//   forma 'caja'       -> medidas [ancho, alto, profundidad]
//   forma 'cilindro'   -> rSup, rInf, alto, segmentos (eje Y, luego rot y pos)
//   forma 'esfera'     -> radio, segmentos
//   forma 'elipsoide'  -> radios [rx, ry, rz], segmentos (esfera escalada)
// `rot` es [rx, ry, rz] en radianes, aplicado antes de mover a `pos`.

export class ConstructorPiezas {
    /** @param {number} slots cantidad de acabados distintos que puede usar */
    constructor(slots = 2) {
        this.listas = [];
        for (let i = 0; i < slots; i++) this.listas.push([]);
    }

    caja(medidas, pos, color, slot = 0, rot = null) {
        return this._agregar({ forma: 'caja', medidas: [medidas[0], medidas[1], medidas[2]] }, pos, color, slot, rot);
    }

    cilindro(radio, alto, pos, color, slot = 0, rot = null, segmentos = 10) {
        const rSup = Array.isArray(radio) ? radio[0] : radio;
        const rInf = Array.isArray(radio) ? radio[1] : radio;
        return this._agregar({ forma: 'cilindro', rSup, rInf, alto, segmentos }, pos, color, slot, rot);
    }

    tubo(radio, largo, pos, color, slot = 0, segmentos = 10) {
        return this.cilindro(radio, largo, pos, color, slot, [Math.PI / 2, 0, 0], segmentos);
    }

    /** Cilindro que va de un punto `a` a otro `b` (tronco, rama, raíz). */
    tramo(radio, a, b, color, slot = 0, segmentos = 7) {
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const largo = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (largo < 1e-6) return this;
        // mismo despeje de ángulos que la versión three.js: rotateX(p) y luego rotateY(g)
        const p = Math.acos(Math.max(-1, Math.min(1, dy / largo)));
        const g = Math.atan2(dx, dz);
        return this.cilindro(radio, largo,
            [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2],
            color, slot, [p, g, 0], segmentos);
    }

    esfera(radio, pos, color, slot = 0, segmentos = 8) {
        return this._agregar({ forma: 'esfera', radio, segmentos }, pos, color, slot, null);
    }

    elipsoide(radios, pos, color, slot = 0, segmentos = 8, rot = null) {
        return this._agregar({ forma: 'elipsoide', radios: [radios[0], radios[1], radios[2]], segmentos }, pos, color, slot, rot);
    }

    _agregar(primitiva, pos, color, slot, rot) {
        const lista = this.listas[slot];
        if (!lista) throw new Error(`ConstructorPiezas: slot ${slot} fuera de rango`);
        primitiva.pos = [pos[0], pos[1], pos[2]];
        primitiva.color = color;
        primitiva.rot = rot ? [rot[0], rot[1], rot[2]] : null;
        lista.push(primitiva);
        return this;
    }

    /** ¿Se agregó alguna pieza? */
    get vacio() {
        return this.listas.every(l => l.length === 0);
    }

    /**
     * Primitivas agrupadas por acabado: [{ slot, primitivas }]. Sólo los slots
     * que tienen piezas, en orden.
     */
    primitivasPorSlot() {
        const partes = [];
        for (let i = 0; i < this.listas.length; i++) {
            if (this.listas[i].length) partes.push({ slot: i, primitivas: this.listas[i] });
        }
        if (!partes.length) throw new Error('ConstructorPiezas: no hay piezas');
        return partes;
    }
}
