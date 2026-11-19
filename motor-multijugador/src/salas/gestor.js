// gestor.js - Ciclo de vida de las salas de un proceso principal.
//
// Una sala es un worker_thread (el que crea el juego) más el conjunto de
// sockets reales conectados a él. El gestor:
//   - crea salas (`crear`) y las destruye (`destruir`), también por inactividad;
//   - conecta sockets (`conectar`): si la sala exige "listo" y todavía no lo
//     está, el socket queda en cola (`mp_sala_pendiente`) y se conecta solo
//     apenas la sala avisa `listo` (`mp_sala_lista`);
//   - reparte los mensajes del worker (`mensajeDeWorker`) con el puente de
//     transporte.
//
// No sabe nada de modos de juego, mapas ni de workers concretos: el worker lo
// crea quien usa el núcleo y se le pasa ya construido.
//
// Eventos de protocolo que emite el núcleo (son parte del contrato con el cliente):
//   mp_sala_lista     el socket quedó conectado a una sala lista
//   mp_sala_pendiente la sala todavía no está lista; el socket espera en cola
//   mp_sala_invalida  no existe la sala pedida; el socket se desconecta
//
// Mensajes que el worker manda al hilo principal (además de los de transporte):
//   { type: 'listo' }  la sala terminó de arrancar
//   { type: 'vacia' }  (sólo salas con cierreInactividad) no quedan humanos jugando
//
// Módulo del núcleo: no importa nada fuera de motor_multijugador/.

import { MapaAcks } from '../transporte/acks.js';
import { reenviarSocketAlWorker, despacharMensajeWorker } from '../transporte/puente.js';

export class GestorSalas {
    constructor() {
        this.salas = new Map();     // id -> Sala
        this.acks = new MapaAcks(); // compartido por todas las salas del proceso
    }

    /**
     * Registra una sala ya creada.
     * @param {string} id
     * @param {object} opciones
     * @param {import('node:worker_threads').Worker} opciones.worker worker de la sala (ya creado)
     * @param {boolean} [opciones.requiereListo=false] si true, las conexiones esperan el 'listo' del worker
     * @param {number|null} [opciones.minutosInactividad=null] si se da, la sala se cierra tras estar
     *        vacía ese tiempo (y también al recibir 'vacia' del worker estando vacía)
     * @param {(motivo: 'inactividad'|'vacia') => void} [opciones.onCierre] aviso al cerrarse la sala
     * @returns {object} la sala
     */
    crear(id, { worker, requiereListo = false, minutosInactividad = null, onCierre = null }) {
        const cierreMs = minutosInactividad ? minutosInactividad * 60 * 1000 : null;
        const sala = {
            id, worker, requiereListo, cierreMs, onCierre,
            lista: false,
            sockets: new Map(),      // socketId -> socket real
            pendientes: [],          // sockets esperando que la sala esté lista
            vacioDesde: null
        };
        this.salas.set(id, sala);
        if (cierreMs) {
            // arranca contando como "vacía" desde ya: si nadie llega a conectarse
            // nunca, el mismo timer la libera.
            sala.vacioDesde = Date.now();
            this._programarCierre(sala);
        }
        return sala;
    }

    existe(id) {
        return this.salas.has(id);
    }

    /** Sala por id, o undefined. */
    obtener(id) {
        return this.salas.get(id);
    }

    /** Conecta un socket ya aceptado a la sala `id` (o lo deja en cola / lo rechaza). */
    conectar(socket, id) {
        const sala = this.salas.get(id);
        if (sala && sala.cierreMs) sala.vacioDesde = null;   // alguien conectado: cancela el cierre
        if (!sala) {
            // la sala se cerró por inactividad mientras este socket esperaba, o nunca existió
            socket.emit('mp_sala_invalida');
            socket.disconnect(true);
            return;
        }
        if (sala.requiereListo && !sala.lista) {
            this._encolar(sala, socket);
            return;
        }
        this._conectarSocket(sala, socket);
    }

    /** Destruye la sala `id`: termina su worker y la quita del gestor. */
    destruir(id, motivo) {
        const sala = this.salas.get(id);
        if (!sala) return;
        this.salas.delete(id);
        try { sala.worker.terminate(); } catch (e) { /* ya estaba cerrado */ }
        if (sala.onCierre) sala.onCierre(motivo);
    }

    /** Mensaje que llegó desde el worker de la sala `id`. */
    mensajeDeWorker(id, msg) {
        if (!msg) return;
        const sala = this.salas.get(id);
        if (!sala) return;
        if (despacharMensajeWorker(msg, sala.sockets, this.acks)) return;
        switch (msg.type) {
            case 'listo':
                if (sala.requiereListo) this._marcarLista(sala);
                console.log(`[server] sala "${id}" lista`);
                break;
            case 'vacia':
                // puede pasar con sockets todavía conectados (pantalla de nombre,
                // menú): sólo se cierra si no queda NINGÚN socket abierto.
                if (sala.cierreMs && sala.sockets.size === 0) this.destruir(id, 'vacia');
                break;
        }
    }

    _encolar(sala, socket) {
        sala.pendientes.push(socket);
        socket.emit('mp_sala_pendiente');
        socket.on('disconnect', () => {
            const i = sala.pendientes.indexOf(socket);
            if (i !== -1) sala.pendientes.splice(i, 1);
        });
    }

    _marcarLista(sala) {
        sala.lista = true;
        const esperando = sala.pendientes;
        sala.pendientes = [];
        for (const socket of esperando) {
            if (socket.disconnected) continue;
            this._conectarSocket(sala, socket);
        }
    }

    _conectarSocket(sala, socket) {
        sala.sockets.set(socket.id, socket);
        sala.worker.postMessage({ type: 'connect', socketId: socket.id });
        console.log(`[server] nueva conexión -> sala "${sala.id}"`);

        reenviarSocketAlWorker(socket, (m) => sala.worker.postMessage(m), this.acks);

        socket.on('disconnect', () => {
            sala.sockets.delete(socket.id);
            sala.worker.postMessage({ type: 'disconnect', socketId: socket.id });
            if (sala.cierreMs && sala.sockets.size === 0) {
                sala.vacioDesde = Date.now();
                this._programarCierre(sala);
            }
        });

        socket.emit('mp_sala_lista');
    }

    _programarCierre(sala) {
        setTimeout(() => {
            if (this.salas.get(sala.id) === sala && sala.vacioDesde && sala.sockets.size === 0) {
                this.destruir(sala.id, 'inactividad');
            }
        }, sala.cierreMs);
    }
}
