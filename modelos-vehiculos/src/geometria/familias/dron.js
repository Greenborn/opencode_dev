// Generado desde cliente/modelo_auto.js (migración a @greenborn/modelos-vehiculos).
// Usa three.js sólo para construir BufferGeometry; no toca el DOM.
import * as THREE from 'three';
import { ref } from '../contexto.js';
import { caja, forma, cil, toro, rueda, faro, patente, asiento, tablero, pieza, OPACO, VIDRIO, FARO, PILOTO, AZUL, RADIO_RUEDA, ANCHO_RUEDA } from '../primitivas.js';

/** Dron de base: cuerpo central, cuatro brazos (en cruz) y cuatro rotores. */
export function dron(a) {
    const p = [];
    const R = (a.largo / 2) * 0.95;

    p.push(caja(OPACO, -0.5, 0.5, 0.35, 0.75, -0.5, 0.5, 'cuerpo'));
    p.push(caja(AZUL, -0.15, 0.15, 0.35, 0.42, 0.45, 0.55));
    p.push(cil(OPACO, 0, 0.2, 0, 0.18, 0.18, 0.5, 'y', 'negro', 10));

    // un brazo horizontal por eje, atravesando el cuerpo: dos rotores por caja
    p.push(cil(OPACO, 0, 0.55, 0, 0.08, 0.08, R * 2, 'x', 'negro', 6));
    p.push(cil(OPACO, 0, 0.55, 0, 0.08, 0.08, R * 2, 'z', 'negro', 6));

    const rotores = [[R, 0], [-R, 0], [0, R], [0, -R]];
    rotores.forEach(([rx, rz], i) => {
        p.push(cil(OPACO, rx, 0.6, rz, 0.22, 0.22, 0.3, 'y', 'detalle', 8));
        p.push(cil(OPACO, rx, 0.72, rz, 0.04, 0.04, 0.18, 'y', 'cromo', 6));
        p.push(toro(rx, 0.74, rz, 0.95, 0.03, 'y', 'cromo'));
        p.push(cil(OPACO, rx, 0.5, rz, 0.06, 0.06, 0.08, 'y', i % 2 ? 'negro' : 'cromo', 6));
    });
    return p;
}

