// @greenborn/transito - API pública.
//
// - crearRed(grilla, opciones): red de carriles y cruces, calculada una vez.
// - crearTransito(red, opciones): simulador. paso(dt), crearVehiculo(), eliminar(id),
//   vehiculos() y vista (arrays por slot con x, z, h, tipo y activo).
// - TIPOS_VEHICULO: tipos por defecto con los mismos nombres que VEH_TIPOS del mapa.

export { crearRed, normalizarGrilla } from './red.js';
export { crearTransito, TIPOS_VEHICULO } from './transito.js';
export const VERSION = '0.1.0';
