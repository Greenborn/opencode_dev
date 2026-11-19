// codigos.js - Códigos de sala para invitaciones (6 caracteres hex en mayúscula).
//
// Módulo del núcleo: sólo usa el builtin `node:crypto`.

import crypto from 'node:crypto';

export function generarCodigoSala() {
    return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}
