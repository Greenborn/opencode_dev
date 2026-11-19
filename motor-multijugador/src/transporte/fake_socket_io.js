// fake_socket_io.js - Imitación mínima de la API de socket.io para usar
// DENTRO de un worker_thread (ver room_worker.js de cada juego).
//
// Cada sala corre en su propio worker_thread: el juego (multijugador.js,
// bots.js, autos.js, navegacion.js) no sabe que no hay sockets reales ahí
// adentro, porque `io`/`socket` se comportan igual que los de socket.io para
// TODO lo que el juego usa hoy: `io.on('connection', cb)`, `io.emit(evento,
// datos)`, `socket.on(evento, handler)`, `socket.emit(evento, datos, [ack])`,
// `socket.id`. No hay nada de rooms/namespaces/broadcast de socket.io en el
// código existente (confirmado por grep), así que no hace falta imitar eso.
//
// Por dentro, en vez de red real, todo pasa por `post(mensaje)`, que
// room_worker.js define usando `parentPort.postMessage`.
//
// Módulo del núcleo: no importa nada fuera de motor_multijugador/.

/** Lado del worker de un socket real que vive en el hilo principal. */
export class FakeSocket {
    constructor(id, post) {
        this.id = id;
        this._post = post;
        this._handlers = new Map();   // evento -> [handler, ...]
    }

    on(evento, handler) {
        if (!this._handlers.has(evento)) this._handlers.set(evento, []);
        this._handlers.get(evento).push(handler);
    }

    /** socket.emit(evento, datos): uno solo, al cliente real que representa. */
    emit(evento, ...datos) {
        this._post({ type: 'toClient', socketId: this.id, evento, datos });
    }

    /** Despacha un evento que llegó de verdad del cliente (vía el hilo principal). */
    _recibir(evento, datos, ackId) {
        const handlers = this._handlers.get(evento);
        if (!handlers || !handlers.length) return;
        const ack = ackId != null
            ? (resp) => this._post({ type: 'ack', ackId, resp })
            : undefined;
        for (const h of handlers) h(...datos, ack);
    }

    _desconectar() {
        this._recibir('disconnect', []);
    }
}

/** Lado del worker del `io` global: sólo lo que hace falta para `registrarSocket`/`initLoop`. */
export class FakeIO {
    constructor(post) {
        this._post = post;
        this._onConnection = [];
        this.sockets = new Map();   // socketId -> FakeSocket
    }

    on(evento, cb) {
        if (evento === 'connection') this._onConnection.push(cb);
    }

    /** io.emit(evento, datos): a todos los sockets de esta sala. */
    emit(evento, ...datos) {
        this._post({ type: 'broadcast', evento, datos });
    }

    /** Lo llama room_worker.js cuando el hilo principal avisa de una conexión nueva. */
    conectar(socketId) {
        const socket = new FakeSocket(socketId, this._post);
        this.sockets.set(socketId, socket);
        for (const cb of this._onConnection) cb(socket);
        return socket;
    }

    desconectar(socketId) {
        const socket = this.sockets.get(socketId);
        if (!socket) return;
        socket._desconectar();
        this.sockets.delete(socketId);
    }

    /** Evento real del cliente, reenviado por el hilo principal. */
    recibir(socketId, evento, datos, ackId) {
        const socket = this.sockets.get(socketId);
        if (socket) socket._recibir(evento, datos, ackId);
    }
}
