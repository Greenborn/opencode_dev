// Referencias que el paquete necesita del juego. El paquete no importa nada del
// juego: el juego las inyecta con configurar() antes de usar la API.
// La geometría no las usa; el material (src/three/materiales.js) sí.
export const ref = {
    // luz horneada de faroles/habitaciones que recibe el personaje (0..1)
    COLOR_LUZ_CALIDA: [1.0, 0.86, 0.62],
};

/** @param {Partial<typeof ref>} valores */
export function configurar(valores) {
    Object.assign(ref, valores);
}
