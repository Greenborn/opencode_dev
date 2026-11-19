// Acumulador de piezas (cajas, cilindros, esferas) fusionadas en una geometría.
// Copia de la parte de geometría de cliente/constructor_piezas.js: sin materiales
// (TSL) ni dependencias del juego, así que corre en un Web Worker.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _color = new THREE.Color();

/** Mete en la geometría un atributo `color` plano con ese color. */
function pintar(geo, color) {
    _color.set(color);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        arr[i * 3] = _color.r;
        arr[i * 3 + 1] = _color.g;
        arr[i * 3 + 2] = _color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
}

/**
 * Acumulador de piezas. Se usa una instancia por "hueso" del modelo (cabeza,
 * torso, antebrazo...): todo lo que no se articule entre sí va junto.
 *
 * Las coordenadas son las del hueso, con su pivote en el origen.
 */
export class ConstructorPiezas {
    /** @param {number} slots cantidad de acabados distintos que puede usar */
    constructor(slots = 2) {
        this.listas = [];
        for (let i = 0; i < slots; i++) this.listas.push([]);
    }

    /**
     * Caja.
     * @param {number[]} medidas [ancho, alto, profundidad]
     * @param {number[]} pos     [x, y, z] del centro
     * @param {number}   color   color de la pieza
     * @param {number}   slot    acabado
     * @param {number[]} [rot]   [rx, ry, rz] en radianes, aplicados antes de mover
     */
    caja(medidas, pos, color, slot = 0, rot = null) {
        const g = new THREE.BoxGeometry(medidas[0], medidas[1], medidas[2]);
        return this._agregar(g, pos, color, slot, rot);
    }

    /**
     * Cilindro, por defecto a lo largo del eje Y (como el de three.js).
     * `radio` puede ser un número (recto) o [superior, inferior].
     */
    cilindro(radio, alto, pos, color, slot = 0, rot = null, segmentos = 10) {
        const rSup = Array.isArray(radio) ? radio[0] : radio;
        const rInf = Array.isArray(radio) ? radio[1] : radio;
        const g = new THREE.CylinderGeometry(rSup, rInf, alto, segmentos, 1);
        return this._agregar(g, pos, color, slot, rot);
    }

    /** Cilindro acostado sobre el eje Z (cañones, tubos de visor, correas). */
    tubo(radio, largo, pos, color, slot = 0, segmentos = 10) {
        return this.cilindro(radio, largo, pos, color, slot, [Math.PI / 2, 0, 0], segmentos);
    }

    /**
     * Cilindro que va de un punto a otro: troncos, ramas, raíces, tirantes.
     *
     * Es lo que falta para armar algo ramificado sin calcular ángulos a mano.
     * `radio` puede ser un número o [en b, en a], con lo que una rama sale
     * gruesa del tronco y termina en punta.
     *
     * @param {number|number[]} radio
     * @param {{x,y,z}} a  extremo inicial
     * @param {{x,y,z}} b  extremo final
     */
    tramo(radio, a, b, color, slot = 0, segmentos = 7) {
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const largo = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (largo < 1e-6) return this;
        // El cilindro de three nace a lo largo de +Y. Con rotateX(p) y después
        // rotateY(g), el eje +Y acaba en (sin p · sin g, cos p, sin p · cos g),
        // así que basta despejar p y g de la dirección pedida.
        const p = Math.acos(Math.max(-1, Math.min(1, dy / largo)));
        const g = Math.atan2(dx, dz);
        return this.cilindro(radio, largo,
            [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2],
            color, slot, [p, g, 0], segmentos);
    }

    esfera(radio, pos, color, slot = 0, segmentos = 8) {
        const g = new THREE.SphereGeometry(radio, segmentos, Math.max(4, segmentos - 2));
        return this._agregar(g, pos, color, slot, null);
    }

    /**
     * Esfera achatada o estirada: `radios` es [rx, ry, rz]. Sirve para las
     * copas, que casi nunca son redondas (el ciprés es un huso, el plátano una
     * cúpula aplastada).
     */
    elipsoide(radios, pos, color, slot = 0, segmentos = 8, rot = null) {
        const g = new THREE.SphereGeometry(1, segmentos, Math.max(4, segmentos - 2));
        g.scale(radios[0], radios[1], radios[2]);
        return this._agregar(g, pos, color, slot, rot);
    }

    _agregar(geo, pos, color, slot, rot) {
        if (rot) {
            if (rot[0]) geo.rotateX(rot[0]);
            if (rot[1]) geo.rotateY(rot[1]);
            if (rot[2]) geo.rotateZ(rot[2]);
        }
        geo.translate(pos[0], pos[1], pos[2]);
        pintar(geo, color);
        const lista = this.listas[slot];
        if (!lista) throw new Error(`ConstructorPiezas: slot ${slot} fuera de rango`);
        lista.push(geo);
        return this;
    }

    /** ¿Se agregó alguna pieza? */
    get vacio() {
        return this.listas.every(l => l.length === 0);
    }

    /**
     * Cierra el modelo.
     *
     * @returns {{geometria: THREE.BufferGeometry, slots: number[]}}
     *   `slots` dice qué acabado corresponde a cada grupo de la geometría, en
     *   orden: el array de materiales de la malla se arma con eso.
     */
    construir() {
        const porSlot = [];
        const slots = [];
        for (let i = 0; i < this.listas.length; i++) {
            const lista = this.listas[i];
            if (!lista.length) continue;
            porSlot.push(lista.length === 1 ? lista[0] : mergeGeometries(lista, false));
            slots.push(i);
        }
        if (!porSlot.length) throw new Error('ConstructorPiezas: no hay piezas');

        const geometria = mergeGeometries(porSlot, true);
        if (!geometria) throw new Error('ConstructorPiezas: mergeGeometries falló');
        geometria.computeBoundingSphere();
        return { geometria, slots };
    }

    /**
     * Cierra el modelo en UNA sola geometría SIN grupos: el acabado de cada
     * pieza se hornea en el atributo `acabado` (metalness, roughness, emisión)
     * para que toda la malla se dibuje con un único material (ver
     * `materialUnido`) y un único draw call.
     *
     * @param {{metalness?: number, roughness?: number, brillo?: number}[]} acabados
     *   uno por slot, con los mismos valores que se le pasarían a
     *   `materialPiezas` si cada acabado tuviera su material.
     * @returns {{geometria: THREE.BufferGeometry}}
     */
    construirUnido(acabados) {
        const porSlot = [];
        for (let i = 0; i < this.listas.length; i++) {
            const lista = this.listas[i];
            if (!lista.length) continue;
            const g = lista.length === 1 ? lista[0] : mergeGeometries(lista, false);
            if (!g) throw new Error(`ConstructorPiezas: mergeGeometries falló en el slot ${i}`);
            const a = acabados[i] || {};
            marcarAcabado(g, a.metalness != null ? a.metalness : 0.1,
                a.roughness != null ? a.roughness : 0.75, 0.35 + (a.brillo || 0));
            porSlot.push(g);
        }
        if (!porSlot.length) throw new Error('ConstructorPiezas: no hay piezas');

        const geometria = porSlot.length === 1 ? porSlot[0] : mergeGeometries(porSlot, false);
        if (!geometria) throw new Error('ConstructorPiezas: mergeGeometries falló');
        geometria.computeBoundingBox();
        geometria.computeBoundingSphere();
        return { geometria };
    }

    /**
     * Cierra el modelo dejando UNA geometría por acabado en vez de una sola con
     * un grupo por acabado.
     *
     * Es lo que necesita el instancing: `THREE.InstancedMesh` toma una
     * geometría y UN material, así que un modelo de varios acabados se dibuja
     * como un InstancedMesh por acabado (que siguen siendo dos o tres draw
     * calls para los cientos de árboles del mapa, no dos o tres por árbol).
     *
     * @returns {{slot: number, geometria: THREE.BufferGeometry}[]}
     */
    construirPorSlot() {
        const partes = [];
        for (let i = 0; i < this.listas.length; i++) {
            const lista = this.listas[i];
            if (!lista.length) continue;
            const geometria = lista.length === 1 ? lista[0] : mergeGeometries(lista, false);
            if (!geometria) throw new Error(`ConstructorPiezas: mergeGeometries falló en el slot ${i}`);
            geometria.computeBoundingBox();
            geometria.computeBoundingSphere();
            partes.push({ slot: i, geometria });
        }
        if (!partes.length) throw new Error('ConstructorPiezas: no hay piezas');
        return partes;
    }
}

/** Hornea el acabado de un grupo de piezas en el atributo `acabado`. */
function marcarAcabado(geo, metalness, roughness, emisivoBase) {
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        arr[i * 3] = metalness;
        arr[i * 3 + 1] = roughness;
        arr[i * 3 + 2] = emisivoBase;
    }
    geo.setAttribute('acabado', new THREE.BufferAttribute(arr, 3));
    return geo;
}

