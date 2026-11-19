// sistema_saludos.js - Sistema trivial del ejemplo mínimo del núcleo.
//
// Usa sólo la forma de un sistema (`nombre`, `eventos`, hooks). No importa nada.
// El estado vive en closure: el registro llama los hooks como funciones sueltas,
// sin `this`.

export const EVENTO_SALUDAR = 'ejemplo_saludar';

export function crearSistemaSaludos() {
    let entradas = 0;
    let salidas = 0;
    let tiempo = 0;
    let saludos = 0;

    return {
        nombre: 'saludos',
        eventos: [EVENTO_SALUDAR],

        onJugadorEntra(jugador) {
            entradas++;
            jugador.socket.emit('ejemplo_bienvenida', { conectados: entradas - salidas });
        },

        onJugadorSale() {
            salidas++;
        },

        onTick(dt) {
            tiempo += dt;
        },

        // Firma: (evento, io, socket, ...datos_del_evento)
        onMensaje(evento, io, socket, nombre) {
            if (evento !== EVENTO_SALUDAR) return;
            saludos++;
            socket.emit('ejemplo_saludo', { texto: `hola ${nombre}`, tiempo });
        },

        estado() {
            return { entradas, salidas, tiempo, saludos };
        }
    };
}
