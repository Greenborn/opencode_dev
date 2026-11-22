// @greenborn/constructor-personaje: lógica pura del constructor de personajes (sin DOM ni three.js).
//
// La config de un personaje es plana y serializable:
//   - cuerpo (de @greenborn/modelos-personajes): pelo, pelocolor, remera, pantalon, calzado, piel, nombre;
//   - accesorios (de @greenborn/accesorios-personaje): cabeza, cabezaColor, lentes, mano, semillaCanasta;
//   - rot: orientación de la vista previa (0..3, cuarto de vuelta cada uno).
//
// Subrutas: este módulo (.) no importa three.js ni DOM. ./ui es el panel DOM, ./three la vista 3D
// y ./constructor une todo.

import {
    CATALOGO_PERSONAJE, personajeAleatorio, normalizarPersonaje,
} from '@greenborn/modelos-personajes/geometria';
import {
    CATALOGO_ACCESORIOS, COLORES_ACCESORIO, ACCESORIOS_DEFECTO, normalizarAccesorios,
} from '@greenborn/accesorios-personaje/catalogo';
import { accesoriosAleatorios } from '@greenborn/accesorios-personaje/aleatorio';

/** Alto real del personaje, en metros. */
export const ALTO_PERSONAJE_M = 1.8;
/** Largo máximo del nombre. */
export const NOMBRE_MAX = 20;
/** Cantidad de orientaciones de la vista previa (rot 0..3). */
export const ROTACIONES = 4;

/** Etiquetas de los peinados, en el mismo orden que CATALOGO_PERSONAJE.pelo. */
export const ETIQUETAS_PEINADO = Object.freeze(['Corto', 'Rulos', 'Trenza', 'Rapado', 'Gorra']);

/** Config por defecto (la canasta, mano: 1, es obligatoria; no hay accesorios de cabeza ni lentes). Se usa al abrir el constructor y en "Reiniciar". */
export const CONFIG_DEFECTO = Object.freeze({
    piel: '#e0a878',
    pelo: 0,
    pelocolor: 0,
    remera: 0,
    pantalon: 0,
    calzado: 0,
    rot: 0,
    nombre: 'Lucas',
    ...ACCESORIOS_DEFECTO,
    mano: 1,   // la canasta es obligatoria
});

const capitalizar = s => s[0].toUpperCase() + s.slice(1);

/** Copia nueva de la config por defecto. */
export function configDefecto() {
    return { ...CONFIG_DEFECTO };
}

/**
 * Categorías que muestra el panel, en orden. Cada una tiene `key` (campo de la config) e `items`:
 * { label } para opciones con texto, { c } para colores. `libre: true` en las de color: además de
 * la paleta, aceptan cualquier #rrggbb (como la piel); en ese caso la config guarda el hex.
 */
export function categorias() {
    return [
        { key: 'pelo', label: 'Peinado', items: ETIQUETAS_PEINADO.map(label => ({ label })) },
        { key: 'pelocolor', label: 'Color de pelo', libre: true, items: CATALOGO_PERSONAJE.pelocolor.map(c => ({ c })) },
        { key: 'remera', label: 'Remera', libre: true, items: CATALOGO_PERSONAJE.remera.map(c => ({ c })) },
        { key: 'pantalon', label: 'Pantalón', libre: true, items: CATALOGO_PERSONAJE.pantalon.map(c => ({ c })) },
        { key: 'calzado', label: 'Calzado', libre: true, items: CATALOGO_PERSONAJE.calzado.map(c => ({ c })) },
        { key: 'cabeza', label: 'Cabeza', items: CATALOGO_ACCESORIOS.cabeza.map(s => ({ label: capitalizar(s) })) },
        { key: 'cabezaColor', label: 'Color de gorra o sombrero', items: COLORES_ACCESORIO.map(c => ({ c })) },
        { key: 'lentes', label: 'Lentes', items: CATALOGO_ACCESORIOS.lentes.map(s => ({ label: capitalizar(s) })) },
    ];
}

/**
 * La gorra de accesorio (cabeza 1) reemplaza al peinado "Gorra" (pelo 4), que lleva su propio casquete
 * con color fijo: si conviven, el peinado pisa a la gorra y su color no tiene efecto. Gana la gorra.
 * Devuelve una config nueva.
 */
export function resolverGorra(cfg) {
    return cfg.cabeza === 1 && cfg.pelo === 4 ? { ...cfg, pelo: 0 } : cfg;
}

/**
 * Cuerpo y accesorios al azar. No incluye `rot`: al "Aleatorio" la orientación se conserva.
 * `rnd` devuelve un número en [0, 1); con una semilla fija el resultado es reproducible.
 */
export function azarPersonaje(rnd = Math.random, opciones = {}) {
    return resolverGorra({ ...personajeAleatorio(rnd, opciones), ...accesoriosAleatorios(rnd), mano: 1 });
}

/** Gira una cuarto de vuelta (rot + 1, módulo ROTACIONES). Devuelve una config nueva. */
export function girar(cfg) {
    return { ...cfg, rot: ((cfg.rot | 0) + 1) % ROTACIONES };
}

/**
 * Completa una config parcial o de red: valores fuera de rango caen al valor por defecto.
 * No lanza excepciones.
 */
export function normalizarConfig(cfg = {}) {
    const rot = Number.isInteger(cfg.rot) && cfg.rot >= 0 && cfg.rot < ROTACIONES ? cfg.rot : 0;
    const nombre = typeof cfg.nombre === 'string' ? cfg.nombre.slice(0, NOMBRE_MAX) : CONFIG_DEFECTO.nombre;
    return resolverGorra({ ...normalizarPersonaje(cfg), ...normalizarAccesorios(cfg), mano: 1, rot, nombre });
}
