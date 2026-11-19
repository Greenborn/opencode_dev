// Generado desde cliente/modelo_auto.js (migración a @greenborn/modelos-vehiculos).
// Usa three.js sólo para construir BufferGeometry; no toca el DOM.
import * as THREE from 'three';
import { ref } from '../contexto.js';
import { caja, forma, cil, toro, rueda, faro, patente, asiento, tablero, pieza, OPACO, VIDRIO, FARO, PILOTO, AZUL, RADIO_RUEDA, ANCHO_RUEDA } from '../primitivas.js';

export function moto(a) {
    const p = [];
    const r = 0.8, L = a.largo / 2, W = a.ancho / 2;
    const xt = -L + r, xd = L - r;
    const fx = xd - 0.12;

    // ruedas con llanta, rayos y disco
    for (const x of [xt, xd]) {
        p.push(cil(OPACO, x, r, 0, r, r, 0.4, 'z', 'goma', 16));
        p.push(cil(OPACO, x, r, 0, r * 0.66, r * 0.66, 0.44, 'z', 'aluminio', 14));
        p.push(cil(OPACO, x, r, 0, r * 0.2, r * 0.2, 0.52, 'z', 'cromo', 8));
        for (let k = 0; k < 6; k++) {
            const g = new THREE.BoxGeometry(r * 0.5, r * 0.07, 0.46);
            g.translate(r * 0.45, 0, 0);
            g.rotateZ((k * Math.PI * 2) / 6);
            g.translate(x, r, 0);
            p.push(pieza(OPACO, g, 'aluminio'));
        }
        p.push(cil(OPACO, x, r, 0.25, r * 0.5, r * 0.5, 0.04, 'z', 'cromo', 14));
    }
    // guardabarros
    p.push(caja(OPACO, fx - 0.7, fx + 0.6, r * 2 + 0.05, r * 2 + 0.25, -0.22, 0.22, 'cuerpo'));
    p.push(caja(OPACO, xt - 0.5, xt + 0.6, r * 2 - 0.05, r * 2 + 0.2, -0.22, 0.22, 'cuerpo'));

    // motor con aletas, escape y cadena
    p.push(caja(OPACO, -0.14 * a.largo, 0.13 * a.largo, 0.7, 1.55, -0.3, 0.3, 'negro'));
    for (let k = 0; k < 5; k++) {
        const y = 0.9 + k * 0.13;
        for (const sg of [-1, 1]) {
            p.push(caja(OPACO, -0.13 * a.largo, 0.12 * a.largo, y, y + 0.05, sg > 0 ? 0.3 : -0.4, sg > 0 ? 0.4 : -0.3, 'aluminio'));
        }
    }
    p.push(cil(OPACO, xt + 0.7, 0.75, 0.42, 0.14, 0.1, a.largo * 0.38, 'x', 'cromo', 8));
    p.push(cil(OPACO, xt + 0.7 - a.largo * 0.2, 0.9, 0.42, 0.12, 0.12, 0.3, 'x', 'negro', 8));
    p.push(caja(OPACO, xt, xd, 0.82, 0.88, -0.03, 0.03, 'negro'));
    // tanque, asiento y cola
    p.push(forma(OPACO, 0.0 * a.largo, 0.25 * a.largo, 1.5, 2.15, -0.4, 0.4, 'cuerpo',
        (v, c) => { if (v.y > c.y && v.x > c.x) v.y -= 0.2; if (v.y > c.y) v.z *= 0.8; }));
    p.push(caja(OPACO, -0.22 * a.largo, 0.03 * a.largo, 1.5, 1.82, -0.32, 0.32, 'tela'));
    p.push(caja(OPACO, -0.22 * a.largo, 0.03 * a.largo, 1.45, 1.5, -0.2, 0.2, 'plastico'));
    p.push(forma(OPACO, xt - 0.3, -0.2 * a.largo, 1.45, 1.8, -0.28, 0.28, 'cuerpo', (v, c) => { if (v.y > c.y && v.x < c.x) v.y += 0.15; }));
    // horquilla con amortiguadores
    for (const sg of [-1, 1]) {
        p.push(cil(OPACO, fx, (r + 2.3) / 2, sg * 0.22, 0.07, 0.07, 2.3 - r, 'y', 'cromo', 6));
        p.push(cil(OPACO, fx, r + 0.5, sg * 0.22, 0.1, 0.1, 0.7, 'y', 'aluminio', 6));
        p.push(cil(OPACO, xt + 0.4, 0.95, sg * 0.28, 0.06, 0.06, 1.0, 'y', 'cromo', 6));
    }
    p.push(caja(OPACO, fx - 0.15, fx + 0.15, 2.2, 2.3, -0.3, 0.3, 'negro'));
    // manillar, puños, espejos y tablero
    p.push(cil(OPACO, fx, 2.38, 0, 0.045, 0.045, a.ancho, 'z', 'negro', 6));
    for (const sg of [-1, 1]) {
        p.push(cil(OPACO, fx, 2.38, sg * (W - 0.25), 0.07, 0.07, 0.4, 'z', 'goma', 6));
        p.push(caja(OPACO, fx, fx + 0.25, 2.5, 2.7, sg * (W - 0.1) - 0.08, sg * (W - 0.1) + 0.08, 'tinta'));
        p.push(cil(OPACO, fx - 0.05, 2.5, sg * (W - 0.1), 0.02, 0.02, 0.3, 'y', 'negro', 4));
    }
    p.push(caja(OPACO, fx - 0.2, fx + 0.1, 2.42, 2.62, -0.2, 0.2, 'negro'));
    p.push(caja(AZUL, fx - 0.2, fx - 0.16, 2.46, 2.58, -0.14, 0.14));
    // luces y patente
    p.push(caja(OPACO, fx + 0.1, fx + 0.45, 1.65, 2.15, -0.3, 0.3, 'cromo'));
    p.push(caja(FARO, fx + 0.4, fx + 0.5, 1.72, 2.08, -0.24, 0.24));
    p.push(caja(PILOTO, xt - 0.35, xt - 0.2, 1.55, 1.75, -0.2, 0.2));
    p.push(caja(OPACO, xt - 0.4, xt - 0.36, 1.1, 1.4, -0.3, 0.3, 'placa'));
    for (const sg of [-1, 1]) {
        p.push(caja(OPACO, fx + 0.05, fx + 0.2, 2.0, 2.1, sg * 0.4 - 0.06, sg * 0.4 + 0.06, 'ambar'));
        p.push(caja(OPACO, xt - 0.2, xt - 0.05, 1.7, 1.8, sg * 0.4 - 0.06, sg * 0.4 + 0.06, 'ambar'));
        p.push(caja(OPACO, -0.05 * a.largo, 0.08 * a.largo, 0.55, 0.62, sg * 0.5 - 0.14, sg * 0.5 + 0.14, 'negro'));   // pedal
    }

    switch (a.estilo) {
    case 'deportiva':
        p.push(forma(OPACO, fx - 0.5, fx + 0.55, 1.5, 2.45, -0.5, 0.5, 'cuerpo', (v, c) => { if (v.y > c.y) { v.x -= (v.x > c.x ? 0.45 : 0); v.z *= 0.8; } }));
        p.push(forma(VIDRIO, fx - 0.25, fx, 2.4, 3.0, -0.3, 0.3, 'cuerpo', (v, c) => { if (v.y > c.y) v.x -= 0.35; }));
        p.push(caja(OPACO, -0.4 * a.largo, 0.2 * a.largo, 1.0, 1.28, -0.44, 0.44, 'detalle'));
        p.push(caja(OPACO, xt - 0.3, xt + 0.3, 1.8, 2.0, -0.25, 0.25, 'detalle'));
        break;
    case 'scooter':
        p.push(caja(OPACO, -0.15 * a.largo, 0.2 * a.largo, 0.7, 0.9, -0.42, 0.42, 'cuerpo'));
        p.push(caja(OPACO, 0.2 * a.largo, 0.27 * a.largo, 0.9, 2.15, -0.42, 0.42, 'cuerpo'));
        p.push(caja(OPACO, -0.3 * a.largo, 0.0, 0.9, 1.5, -0.42, 0.42, 'cuerpo'));
        break;
    case 'chopper':
        p.push(caja(OPACO, xt + 0.3, xt + 0.4, 1.8, 3.2, -0.05, 0.05, 'cromo'));
        p.push(cil(OPACO, fx, 3.0, 0, 0.05, 0.05, a.ancho, 'z', 'cromo', 6));
        for (const sg of [-1, 1]) p.push(cil(OPACO, fx, 2.7, sg * (W - 0.06), 0.05, 0.05, 0.7, 'y', 'cromo', 6));
        p.push(caja(OPACO, -0.14 * a.largo, 0.14 * a.largo, 0.6, 0.78, -0.46, 0.46, 'detalle'));
        break;
    case 'cross':
        p.push(caja(OPACO, fx - 0.5, fx + 0.5, 2.35, 2.5, -0.25, 0.25, 'cuerpo'));
        p.push(caja(OPACO, fx + 0.35, fx + 0.5, 1.6, 2.35, -0.3, 0.3, 'detalle'));
        p.push(caja(OPACO, xt - 0.2, xt + 0.8, 2.0, 2.15, -0.22, 0.22, 'cuerpo'));
        break;
    case 'policia':
        p.push(forma(OPACO, fx - 0.4, fx + 0.45, 1.5, 2.35, -0.45, 0.45, 'cuerpo', (v, c) => { if (v.y > c.y) v.z *= 0.85; }));
        p.push(caja(OPACO, -0.2 * a.largo, 0.24 * a.largo, 0.95, 1.22, -0.37, 0.37, 'detalle'));
        p.push(caja(OPACO, xt - 0.35, xt + 0.45, 1.9, 2.3, -0.45, 0.45, 'cuerpo'));
        p.push(caja(PILOTO, xt - 0.35, xt - 0.05, 2.3, 2.5, -0.45, 0));
        p.push(caja(AZUL, xt - 0.35, xt - 0.05, 2.3, 2.5, 0, 0.45));
        break;
    case 'reparto':
        p.push(caja(OPACO, xt - 0.3, -0.18 * a.largo, 1.8, 3.2, -0.62, 0.62, 'detalle'));
        p.push(caja(OPACO, xt - 0.3, -0.18 * a.largo, 1.75, 1.8, -0.7, 0.7, 'negro'));
        p.push(caja(OPACO, xt - 0.31, xt - 0.29, 2.2, 2.9, -0.4, 0.4, 'placa'));
        break;
    case 'touring':
        p.push(forma(VIDRIO, fx - 0.25, fx - 0.05, 2.35, 3.3, -0.4, 0.4, 'cuerpo', (v, c) => { if (v.y > c.y) v.x -= 0.3; }));
        for (const sg of [-1, 1]) {
            const z0 = sg > 0 ? 0.36 : -0.7;
            p.push(caja(OPACO, -0.42 * a.largo, -0.16 * a.largo, 1.0, 1.75, z0, z0 + 0.34, 'detalle'));
        }
        p.push(caja(OPACO, -0.45 * a.largo, -0.22 * a.largo, 1.82, 2.2, -0.32, 0.32, 'detalle'));
        break;
    default:
        break;
    }
    return p;
}

