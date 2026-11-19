// Prueba de independencia: el ejemplo mínimo corre sólo con el núcleo, sin abrir puertos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSalaEjemplo } from '../src/ejemplo/sala_ejemplo.js';

test('el ejemplo conecta, procesa un evento, hace tick y desconecta', () => {
    const emitidos = [];
    const sala = crearSalaEjemplo({ post: (m) => emitidos.push(m) });

    sala.conectar('a');
    sala.recibir('a', 'ejemplo_saludar', 'Ana');
    sala.tick(0.05);
    sala.desconectar('a');

    assert.equal(sala.cantidadJugadores(), 0);
});
