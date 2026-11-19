// demo.js - Recorrido en proceso del ejemplo mínimo. No abre puertos ni arranca el servidor.
//
//   node motor_multijugador/ejemplo/demo.js

import { crearSalaEjemplo } from './sala_ejemplo.js';

const sala = crearSalaEjemplo({
    post: (m) => console.log('sala ->', m.type, m.evento ?? '', JSON.stringify(m.datos ?? []))
});

sala.conectar('a');
sala.recibir('a', 'ejemplo_saludar', 'Ana');
sala.tick(0.05);
sala.desconectar('a');

console.log('estado del sistema:', sala.saludos.estado());
console.log('jugadores al final:', sala.cantidadJugadores());
