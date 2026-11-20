// Personajes aleatorios para el modelo voxel. Lógica pura.
//
// Genera configuraciones con el mismo catálogo y en el mismo orden de sorteo que el
// constructor de ideas_juegos_virales/vendedores_capital, para que con un mismo flujo
// de números salgan los mismos personajes. El juego decide cuáles usa: el paquete sólo
// ofrece el catálogo y el generador.

import { COLORES_PELO, COLORES_REMERA, COLORES_PANTALON, COLORES_CALZADO, PEINADOS, PIEL_DEFECTO } from './voxel.js';

/** Nombres de muestra (no afectan la geometría). */
export const NOMBRES = Object.freeze([
    'Lucas', 'Mateo', 'Santiago', 'Thiago', 'Facundo', 'Nicolás', 'Matías', 'Juan', 'Diego', 'Gonzalo',
    'Martín', 'Franco', 'Agustín', 'Ezequiel', 'Sebastián', 'Maximiliano', 'Leandro', 'Federico', 'Emanuel', 'Brian',
    'María', 'Valentina', 'Sofía', 'Camila', 'Lucía', 'Julieta', 'Florencia', 'Agustina', 'Carla', 'Micaela',
    'Romina', 'Yamila', 'Laura', 'Natalia', 'Rocío', 'Daniela', 'Mariana', 'Eugenia', 'Noelia', 'Vanesa',
]);

/** Tonos de piel "naturales", para quien no quiere cualquier color. */
export const PIELES_NATURALES = Object.freeze(['#e0a878', '#f1c27d', '#c68642', '#8d5524', '#ffdbac', '#5c3a21']);

/** Catálogo completo de opciones por categoría (índices = valores de la cfg). */
export const CATALOGO_PERSONAJE = Object.freeze({
    pelo: PEINADOS,
    pelocolor: COLORES_PELO,
    remera: COLORES_REMERA,
    pantalon: COLORES_PANTALON,
    calzado: COLORES_CALZADO,
    nombres: NOMBRES,
    pielesNaturales: PIELES_NATURALES,
});

/** Orden de sorteo de las categorías de prendas (igual que el constructor). */
const CATEGORIAS = Object.freeze(['pelo', 'pelocolor', 'remera', 'pantalon', 'calzado']);

/**
 * Personaje aleatorio. `rnd` devuelve un número en [0, 1) (Math.random por defecto
 * o un generador sembrado). `opciones.piel`: 'cualquiera' (default, como el
 * constructor: cualquier #rrggbb) o 'naturales' (sólo PIELES_NATURALES).
 * Devuelve { nombre, piel, pelo, pelocolor, remera, pantalon, calzado }.
 */
export function personajeAleatorio(rnd = Math.random, opciones = {}) {
    const cfg = {};
    for (const cat of CATEGORIAS) cfg[cat] = Math.floor(rnd() * CATALOGO_PERSONAJE[cat].length);
    cfg.nombre = NOMBRES[Math.floor(rnd() * NOMBRES.length)];
    if (opciones.piel === 'naturales') {
        cfg.piel = PIELES_NATURALES[Math.floor(rnd() * PIELES_NATURALES.length)];
    } else {
        cfg.piel = '#' + Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0');
    }
    return cfg;
}

/** Semilla de 32 bits -> generador determinista en [0, 1) (mulberry32). */
export function generadorSembrado(semilla) {
    let a = semilla >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Personaje aleatorio reproducible desde una semilla. */
export function personajeDesdeSemilla(semilla, opciones = {}) {
    return personajeAleatorio(generadorSembrado(semilla), opciones);
}

/**
 * Policía a pie: uniforme fijo (cfg.policia = true), gorra y calzado de la paleta.
 * Mismo orden de sorteo que personajeAleatorio para piel, nombre y pelo de color.
 * Devuelve { nombre, piel, pelo: 4 (gorra), pelocolor, remera, pantalon, calzado, policia: true }.
 */
export function personajePolicia(rnd = Math.random, opciones = {}) {
    const cfg = personajeAleatorio(rnd, opciones);
    return { ...cfg, pelo: 4, policia: true };
}

/**
 * Pool de peatones: con probabilidad `probPolicia` devuelve un policía, si no un personaje
 * común (personajeAleatorio). Consume un número extra de `rnd` por cada personaje.
 */
export function personajeAleatorioConPolicia(rnd = Math.random, opciones = {}, probPolicia = 0.1) {
    return rnd() < probPolicia ? personajePolicia(rnd, opciones) : personajeAleatorio(rnd, opciones);
}

/**
 * Completa una cfg parcial con valores por defecto y lleva los índices al rango del
 * catálogo (los que no encajan caen en 0). No lanza: sirve para configs de red.
 */
export function normalizarPersonaje(cfg = {}) {
    const out = { nombre: typeof cfg.nombre === 'string' ? cfg.nombre : NOMBRES[0] };
    for (const cat of CATEGORIAS) {
        const n = CATALOGO_PERSONAJE[cat].length;
        out[cat] = Number.isInteger(cfg[cat]) && cfg[cat] >= 0 && cfg[cat] < n ? cfg[cat] : 0;
    }
    out.piel = /^#[0-9a-f]{6}$/i.test(cfg.piel) ? cfg.piel : PIEL_DEFECTO;
    if (cfg.policia === true) out.policia = true;
    return out;
}
