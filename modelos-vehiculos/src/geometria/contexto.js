// Referencias que la geometría necesita del juego (medidas y asientos). El
// paquete no importa nada del juego: el juego las inyecta con configurar().
export const ref = {
    LUZ_SUELO: 0,
    ALTO_CAJA_CAMION: 0,
    cabinaAuto: () => ({ piso: 0, bx: 0, bz: 0 }),
    ojoAuto: () => ({ y: 0 }),
    asientoAuto: () => ({}),
};

/** @param {Partial<typeof ref>} valores */
export function configurar(valores) {
    Object.assign(ref, valores);
}
