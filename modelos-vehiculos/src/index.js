// @greenborn/modelos-vehiculos - API pública.
//
// - configurar(referencias): el juego inyecta medidas y asientos (ver geometria/contexto.js).
// - construirPartes(def): geometría por slot. Pensado para un Web Worker.
// - serializarPartes / reconstruirPartes: transporte worker -> hilo principal.
// - subMeshes(partes) / materialesVehiculo(): adaptador de materiales (hilo principal).

export { configurar } from './geometria/contexto.js';
export { construirPartes } from './geometria/construir.js';
export { serializarPartes, reconstruirPartes } from './geometria/serializar.js';
export { subMeshes, materialesVehiculo } from './three/materiales.js';
export { OPACO, VIDRIO, FARO, PILOTO, AZUL } from './geometria/primitivas.js';
export const VERSION = '0.2.0';
