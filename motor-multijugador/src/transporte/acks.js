// acks.js - Mapeo de acks entre el hilo principal y un worker.
//
// Una función de ack de socket.io no se puede clonar por postMessage: el hilo
// principal guarda la función real y manda sólo un id al worker; el worker
// responde con `{ type: 'ack', ackId, resp }` y acá se resuelve.
//
// Módulo del núcleo: no importa nada del proyecto.

export class MapaAcks {
    constructor() {
        this._pendientes = new Map();   // ackId -> función de ack real
        this._siguiente = 1;
    }

    /** Guarda la función y devuelve el id que viaja al worker. */
    registrar(fn) {
        const id = this._siguiente++;
        this._pendientes.set(id, fn);
        return id;
    }

    /** Llama la función guardada con la respuesta del worker. Devuelve false si el id no existe. */
    resolver(ackId, resp) {
        const fn = this._pendientes.get(ackId);
        if (!fn) return false;
        this._pendientes.delete(ackId);
        fn(resp);
        return true;
    }

    get tamanio() {
        return this._pendientes.size;
    }
}
