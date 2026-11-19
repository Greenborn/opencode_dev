// registro.js - registro de sistemas del núcleo multijugador.
//
// Un "sistema" es un objeto `{ nombre, onInstalarMapa?, onJugadorEntra?,
// onJugadorSale?, onTick?, onMensaje? }` con hooks opcionales. El juego crea
// un registro, registra sus sistemas en orden, y el núcleo (o el juego) invoca
// cada hook en ese mismo orden. Los sistemas no se importan entre sí: lo que
// necesitan de otro sistema se les pasa por parámetro o por closure al
// registrarlos.
//
// Hooks (todos opcionales; se llaman en orden de registro):
//   onInstalarMapa(mapa)          al instalar un mapa nuevo (o el inicial).
//   onJugadorEntra(jugador, ...extra) al registrarse un jugador en la partida. `extra` es
//                                 contexto que pasa quien llama (ver jugadores_sistema.js).
//   onJugadorSale(jugador, ...extra)  al desconectarse o salir de la partida (idem).
//   onTick(dt, ahora)             una vez por tick; dt en segundos, ahora en ms.
//   onMensaje(evento, ...datos)   mensajes de juego (evento = nombre del socket).
//                                 Un sistema declara en `eventos: [...]` los
//                                 eventos que atiende; el juego suscribe cada
//                                 socket con `eventos()` y reenvía con `mensaje`.
//                                 Los datos son (io, socket, ...argumentos del
//                                 evento): el registro no sabe de socket.io, sólo
//                                 pasa lo que le den.
//
// Ningún hook devuelve nada que el registro use: los errores de un sistema se
// propagan tal cual (no se aíslan) para no ocultar fallos del juego.

/**
 * Crea un registro vacío.
 * @returns {{
 *   registrar: (sistema: object) => object,
 *   nombres: () => string[],
 *   instalarMapa: (mapa: any) => void,
 *   jugadorEntra: (jugador: any, ...extra: any[]) => void,
 *   jugadorSale: (jugador: any, ...extra: any[]) => void,
 *   tick: (dt: number, ahora: number) => void,
 *   mensaje: (evento: string, ...datos: any[]) => void,
 *   eventos: () => string[]
 * }}
 */
export function crearRegistroSistemas() {
    const sistemas = [];

    function llamar(hook, ...args) {
        for (const s of sistemas) {
            const fn = s[hook];
            if (typeof fn === 'function') fn(...args);
        }
    }

    return {
        /** Agrega un sistema al final del orden de llamada. El nombre debe ser único. */
        registrar(sistema) {
            if (!sistema || typeof sistema.nombre !== 'string' || !sistema.nombre) {
                throw new TypeError('sistema sin `nombre`');
            }
            if (sistemas.some(s => s.nombre === sistema.nombre)) {
                throw new Error(`sistema repetido: ${sistema.nombre}`);
            }
            sistemas.push(sistema);
            return sistema;
        },
        nombres() { return sistemas.map(s => s.nombre); },
        instalarMapa(mapa) { llamar('onInstalarMapa', mapa); },
        jugadorEntra(jugador, ...extra) { llamar('onJugadorEntra', jugador, ...extra); },
        jugadorSale(jugador, ...extra) { llamar('onJugadorSale', jugador, ...extra); },
        tick(dt, ahora) { llamar('onTick', dt, ahora); },
        mensaje(evento, ...datos) { llamar('onMensaje', evento, ...datos); },
        /** Eventos declarados (`sistema.eventos`) de todos los sistemas, sin repetir, en orden de registro. */
        eventos() {
            const todos = new Set();
            for (const s of sistemas) {
                if (Array.isArray(s.eventos)) for (const e of s.eventos) todos.add(e);
            }
            return [...todos];
        }
    };
}
