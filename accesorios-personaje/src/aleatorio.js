// Generadores aleatorios de accesorios y de la canasta. Lógica pura.
//
// Usan el mismo `rnd` (número en [0, 1)) que personajeAleatorio del paquete de personajes,
// así un mismo flujo de números da el mismo personaje completo (cuerpo + accesorios).

import { personajeAleatorio, generadorSembrado, tint } from '@greenborn/modelos-personajes/geometria';
import { CATALOGO_ACCESORIOS, COLORES_ACCESORIO, MERCANCIA, TEJIDOS_CANASTA } from './catalogo.js';

const elegir = (lista, rnd) => lista[Math.floor(rnd() * lista.length)];

/** Posiciones de la mercancía sobre la tapa de la canasta (cada una ocupa 2×2 voxels). */
const HUECOS_CANASTA = Object.freeze([[14, 2], [16, 2], [14, 4], [16, 4]]);

/**
 * Canasta para vender: tejido, borde y mercancía sobre la tapa.
 * Devuelve { tejido, borde, mercancia: [{ tipo, c, x, y, capa }] }. capa 0 = sobre la tapa, 1 = apilado.
 */
export function generarCanasta(rnd = Math.random) {
    const tejido = elegir(TEJIDOS_CANASTA, rnd);
    const huecos = HUECOS_CANASTA.map(h => h.slice());
    for (let i = huecos.length - 1; i > 0; i--) {                       // Fisher-Yates
        const j = Math.floor(rnd() * (i + 1));
        [huecos[i], huecos[j]] = [huecos[j], huecos[i]];
    }
    const cantidad = 1 + Math.floor(rnd() * huecos.length);             // 1 a 4 productos
    const mercancia = [];
    for (let i = 0; i < cantidad; i++) {
        const m = elegir(MERCANCIA, rnd);
        mercancia.push({ tipo: m.tipo, c: m.c, x: huecos[i][0], y: huecos[i][1], capa: 0 });
    }
    if (rnd() < 0.4) {                                                   // a veces hay un producto apilado
        const base = mercancia[Math.floor(rnd() * mercancia.length)];
        const m = elegir(MERCANCIA, rnd);
        mercancia.push({ tipo: m.tipo, c: m.c, x: base.x, y: base.y, capa: 1 });
    }
    return { tejido, borde: tint(tejido, 1.25), mercancia };
}

/**
 * Accesorios al azar (valores de la cfg, ver catalogo.js). `semillaCanasta` fija la canasta
 * concreta: con la misma semilla sale siempre la misma mercancía.
 */
export function accesoriosAleatorios(rnd = Math.random) {
    return {
        cabeza: Math.floor(rnd() * CATALOGO_ACCESORIOS.cabeza.length),
        cabezaColor: Math.floor(rnd() * COLORES_ACCESORIO.length),
        lentes: Math.floor(rnd() * CATALOGO_ACCESORIOS.lentes.length),
        mano: Math.floor(rnd() * CATALOGO_ACCESORIOS.mano.length),
        semillaCanasta: Math.floor(rnd() * 0x7fffffff),
    };
}

/** Personaje completo al azar: cuerpo del paquete de personajes más accesorios. */
export function personajeConAccesorios(rnd = Math.random, opciones = {}) {
    const cuerpo = personajeAleatorio(rnd, opciones);
    return { ...cuerpo, ...accesoriosAleatorios(rnd) };
}

/** Canasta a partir de la semilla guardada en la cfg (determinista). */
export function canastaDesdeSemilla(semilla) {
    return generarCanasta(generadorSembrado(semilla));
}
