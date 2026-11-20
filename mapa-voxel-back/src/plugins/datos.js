// datos.js - Bindings vivos de los datos de juego que usa el generador.
//
// El paquete no trae datos de juego (autos, árboles, tiendas, refugios, etc.):
// los aporta el consumidor con `registrarPlugins` (ver ./registro.js). Los
// módulos del generador los importan por nombre desde acá; como son
// `export let`, al registrar un plugin todos ven el valor nuevo sin
// volver a importar nada.
//
// No leer estos valores al evaluar un módulo (top-level): hasta que se
// registren valen `null`. Leerlos dentro de funciones.

// plugin `arboles`
export let elegirArbol = null;

// plugin `autos`
export let AUTOS = null;
export let ORDEN_AUTOS = null;
export let idEntidadAuto = null;
export let PROPORCION_MOTOS = null;

// plugin `postes`
export let ID_POSTE = null;

// plugin `lucesInteriores`
export let ID_LUZ_INTERIOR = null;

// plugin `refugios`
export let PROB_REFUGIO_PARCELA = null;
export let MIN_REFUGIOS = null;
export let INTENTOS_REFUGIO = null;
export let REFUGIO = null;
export let PROFUNDIDAD_REFUGIO = null;
export let ejesRefugio = null;
export let rotYHacia = null;

// plugin `armarios`
export let ARMARIO = null;

// plugin `necesidades`
export let sortearArmario = null;
export let sortearCantidades = null;

// plugin `tiendas`
export let TIENDAS_POR_MAPA = null;
export let ROT_PUERTA = null;
export let ALTO_GONDOLA = null;

// plugin `hordas` (nidos de zombies y escala de superficie de tiendas)
export let PROB_NIDO_PARCELA = null;
export let INTENTOS_NIDO = null;
export let RADIO_NIDO = null;
export let DIST_MIN_BASE_NIDO = null;
export let DIST_MIN_ENTRE_NIDOS = null;
export let ESCALA_SUPERFICIE = null;

// plugin `equipos`
export let COLORES_EQUIPO = null;

// plugin `configuracion`: ajustes generales (p. ej. `lighting.point.distance`)
export let CONFIG = null;

/**
 * Mapa plugin -> nombres de datos que aporta. Es el contrato: cada plugin
 * debe entregar exactamente estos nombres (ver `registrarPlugins`).
 */
export const ESQUEMA_PLUGINS = Object.freeze({
    arboles: ['elegirArbol'],
    autos: ['AUTOS', 'ORDEN_AUTOS', 'idEntidadAuto', 'PROPORCION_MOTOS'],
    postes: ['ID_POSTE'],
    lucesInteriores: ['ID_LUZ_INTERIOR'],
    refugios: ['PROB_REFUGIO_PARCELA', 'MIN_REFUGIOS', 'INTENTOS_REFUGIO', 'REFUGIO', 'PROFUNDIDAD_REFUGIO', 'ejesRefugio', 'rotYHacia'],
    armarios: ['ARMARIO'],
    necesidades: ['sortearArmario', 'sortearCantidades'],
    tiendas: ['TIENDAS_POR_MAPA', 'ROT_PUERTA', 'ALTO_GONDOLA'],
    hordas: ['PROB_NIDO_PARCELA', 'INTENTOS_NIDO', 'RADIO_NIDO', 'DIST_MIN_BASE_NIDO', 'DIST_MIN_ENTRE_NIDOS', 'ESCALA_SUPERFICIE'],
    equipos: ['COLORES_EQUIPO'],
    configuracion: ['CONFIG'],
});

/** Asigna los nombres de cada plugin a su binding vivo. */
export function asignarDatos(nombre, valores) {
    switch (nombre) {
        case 'arboles': elegirArbol = valores.elegirArbol; break;
        case 'autos':
            AUTOS = valores.AUTOS; ORDEN_AUTOS = valores.ORDEN_AUTOS;
            idEntidadAuto = valores.idEntidadAuto; PROPORCION_MOTOS = valores.PROPORCION_MOTOS;
            break;
        case 'postes': ID_POSTE = valores.ID_POSTE; break;
        case 'lucesInteriores': ID_LUZ_INTERIOR = valores.ID_LUZ_INTERIOR; break;
        case 'refugios':
            PROB_REFUGIO_PARCELA = valores.PROB_REFUGIO_PARCELA; MIN_REFUGIOS = valores.MIN_REFUGIOS;
            INTENTOS_REFUGIO = valores.INTENTOS_REFUGIO; REFUGIO = valores.REFUGIO;
            PROFUNDIDAD_REFUGIO = valores.PROFUNDIDAD_REFUGIO; ejesRefugio = valores.ejesRefugio;
            rotYHacia = valores.rotYHacia;
            break;
        case 'armarios': ARMARIO = valores.ARMARIO; break;
        case 'necesidades': sortearArmario = valores.sortearArmario; sortearCantidades = valores.sortearCantidades; break;
        case 'tiendas':
            TIENDAS_POR_MAPA = valores.TIENDAS_POR_MAPA; ROT_PUERTA = valores.ROT_PUERTA;
            ALTO_GONDOLA = valores.ALTO_GONDOLA;
            break;
        case 'hordas':
            PROB_NIDO_PARCELA = valores.PROB_NIDO_PARCELA; INTENTOS_NIDO = valores.INTENTOS_NIDO;
            RADIO_NIDO = valores.RADIO_NIDO; DIST_MIN_BASE_NIDO = valores.DIST_MIN_BASE_NIDO;
            DIST_MIN_ENTRE_NIDOS = valores.DIST_MIN_ENTRE_NIDOS; ESCALA_SUPERFICIE = valores.ESCALA_SUPERFICIE;
            break;
        case 'equipos': COLORES_EQUIPO = valores.COLORES_EQUIPO; break;
        case 'configuracion': CONFIG = valores.CONFIG; break;
        default: throw new Error(`plugin desconocido: ${nombre}`);
    }
}
