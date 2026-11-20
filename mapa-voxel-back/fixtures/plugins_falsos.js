// Plugins mínimos para los tests: forma de datos, sin contenido de juego real.
export const PLUGINS_FALSOS = {
    arboles: { elegirArbol: () => ({ model: 'arbol_test', escala: 1, rotY: 0 }) },
    autos: {
        AUTOS: { coche_test: { forma: 'auto', largo: 4, ancho: 2 } },
        ORDEN_AUTOS: ['coche_test'],
        idEntidadAuto: (id) => `auto_${id}`,
        PROPORCION_MOTOS: 0,
    },
    postes: { ID_POSTE: 'poste_test' },
    lucesInteriores: { ID_LUZ_INTERIOR: 'luz_test' },
    refugios: {
        PROB_REFUGIO_PARCELA: 0, MIN_REFUGIOS: 0, INTENTOS_REFUGIO: 0,
        REFUGIO: { trampillaLargo: 1, trampillaAncho: 1, puertaAncho: 1, puertaAlto: 2 },
        PROFUNDIDAD_REFUGIO: 1,
        ejesRefugio: () => ({ uX: 1, uZ: 0, vX: 0, vZ: 1 }),
        rotYHacia: () => 0,
    },
    armarios: { ARMARIO: { ancho: 1 } },
    necesidades: { sortearArmario: () => null, sortearCantidades: () => ({}) },
    tiendas: { TIENDAS_POR_MAPA: 0, ROT_PUERTA: {}, ALTO_GONDOLA: 1 },
    hordas: { PROB_NIDO_PARCELA: 0, INTENTOS_NIDO: 0, RADIO_NIDO: 1, DIST_MIN_BASE_NIDO: 1, DIST_MIN_ENTRE_NIDOS: 1, ESCALA_SUPERFICIE: 1 },
    equipos: { COLORES_EQUIPO: { azul: 0x0000ff, rojo: 0xff0000 } },
    configuracion: { CONFIG: { lighting: { point: { distance: 10 } } } },
};
