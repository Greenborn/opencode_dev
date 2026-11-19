// index.js - API pública del núcleo multijugador (motor_multijugador/).
//
// El núcleo no importa nada del juego. El juego (server/, cliente/ de juego)
// consume estas exportaciones; no al revés.

export { FakeSocket, FakeIO } from './transporte/fake_socket_io.js';
export { MapaAcks } from './transporte/acks.js';
export { reenviarSocketAlWorker, despacharMensajeWorker } from './transporte/puente.js';
export { GestorSalas } from './salas/gestor.js';
export { generarCodigoSala } from './salas/codigos.js';
export { crearRegistroSistemas } from './sistemas/registro.js';
