// puente.js - Puente socket.io <-> worker_thread de una sala.
//
// Dos piezas, ambas sin estado propio (el estado vive en la sala y en MapaAcks):
//   - reenviarSocketAlWorker: todo evento que llega del socket real se manda al
//     worker tal cual, con el ack (si lo trae) reemplazado por su id.
//   - despacharMensajeWorker: lo que el worker manda hacia los sockets reales
//     (`toClient`, `broadcast`, `ack`). Los demás tipos (listo, vacia, ...) son
//     decisión de quien usa el núcleo y no se tocan acá.
//
// Módulo del núcleo: no importa nada del proyecto.

/**
 * Reenvía al worker cualquier evento del socket.
 * @param {object} socket socket real (socket.io)
 * @param {(mensaje: object) => void} postear función que manda un mensaje al worker
 * @param {import('./acks.js').MapaAcks} acks mapa de acks compartido
 */
export function reenviarSocketAlWorker(socket, postear, acks) {
    socket.onAny((evento, ...args) => {
        let ackId = null;
        if (args.length && typeof args[args.length - 1] === 'function') {
            const ackReal = args.pop();
            ackId = acks.registrar(ackReal);
        }
        postear({ type: 'event', socketId: socket.id, evento, datos: args, ackId });
    });
}

/**
 * Despacha un mensaje del worker hacia los sockets reales de la sala.
 * @param {object} msg mensaje recibido del worker
 * @param {Map<string, object>} sockets socketId -> socket real de la sala
 * @param {import('./acks.js').MapaAcks} acks mapa de acks compartido
 * @returns {boolean} true si el tipo de mensaje era de transporte
 */
export function despacharMensajeWorker(msg, sockets, acks) {
    switch (msg.type) {
        case 'toClient': {
            const socket = sockets.get(msg.socketId);
            if (socket) socket.emit(msg.evento, ...(msg.datos || []));
            return true;
        }
        case 'broadcast': {
            for (const socket of sockets.values()) {
                socket.emit(msg.evento, ...(msg.datos || []));
            }
            return true;
        }
        case 'ack':
            acks.resolver(msg.ackId, msg.resp);
            return true;
        default:
            return false;
    }
}
