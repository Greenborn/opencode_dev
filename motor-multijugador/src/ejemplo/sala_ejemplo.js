// sala_ejemplo.js - Cableado mínimo de una sala con el núcleo, sin socket.io ni workers.
//
// Replica lo que hace server/room_worker.js con el núcleo: un FakeIO, un registro
// de sistemas y, por cada conexión, la suscripción a los eventos declarados.
// Sólo importa del propio núcleo y del sistema de ejemplo.

import { crearRegistroSistemas } from '../sistemas/registro.js';
import { FakeIO } from '../transporte/fake_socket_io.js';
import { crearSistemaSaludos } from './sistema_saludos.js';

/**
 * @param {object} [opciones]
 * @param {(mensaje: object) => void} [opciones.post] destino de los mensajes que la sala manda al hilo principal
 */
export function crearSalaEjemplo({ post = () => {} } = {}) {
    const registro = crearRegistroSistemas();
    const saludos = registro.registrar(crearSistemaSaludos());
    const io = new FakeIO(post);
    const jugadores = new Map();

    io.on('connection', (socket) => {
        const jugador = { id: socket.id, socket };
        jugadores.set(socket.id, jugador);

        for (const evento of registro.eventos()) {
            socket.on(evento, (...datos) => registro.mensaje(evento, io, socket, ...datos));
        }
        socket.on('disconnect', () => {
            jugadores.delete(socket.id);
            registro.jugadorSale(jugador);
        });

        registro.jugadorEntra(jugador);
    });

    return {
        registro,
        io,
        saludos,
        conectar: (socketId) => io.conectar(socketId),
        recibir: (socketId, evento, ...datos) => io.recibir(socketId, evento, datos),
        desconectar: (socketId) => io.desconectar(socketId),
        tick: (dt) => registro.tick(dt, Date.now()),
        cantidadJugadores: () => jugadores.size
    };
}
