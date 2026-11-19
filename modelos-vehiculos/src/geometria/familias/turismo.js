// Generado desde cliente/modelo_auto.js (migración a @greenborn/modelos-vehiculos).
// Usa three.js sólo para construir BufferGeometry; no toca el DOM.
import * as THREE from 'three';
import { ref } from '../contexto.js';
import { caja, forma, cil, toro, rueda, faro, patente, asiento, tablero, pieza, OPACO, VIDRIO, FARO, PILOTO, AZUL, RADIO_RUEDA_AUTO as RR, ANCHO_RUEDA_AUTO as AR } from '../primitivas.js';

export function turismo(a) {
    const p = [];
    const L = a.largo / 2, W = a.ancho / 2;
    const y0 = ref.LUZ_SUELO, y1 = y0 + a.cuerpo, y2 = y1 + a.cabina;
    const xa = (a.c0 - 0.5) * a.largo, xb = (a.c1 - 0.5) * a.largo;
    const wc = W * 0.86;
    const pickup = a.forma === 'pickup';
    const suv = a.cuerpo >= 2.0;
    const rakeF = Math.min(1.0, a.cabina * 0.8), rakeT = Math.min(0.7, a.cabina * 0.5);

    // --- tren inferior --------------------------------------------------------
    p.push(caja(OPACO, -L + 0.45, L - 0.45, y0, y0 + 0.3, -W + 0.35, W - 0.35, 'negro'));
    p.push(caja(OPACO, -L + 0.3, L - 0.3, y0 + 0.3, y0 + 0.45, -W + 0.25, W - 0.25, 'plastico'));       // piso
    p.push(cil(OPACO, -L + 0.25, y0 + 0.05, W * 0.45, 0.11, 0.11, 0.5, 'x', 'cromo', 8));                 // escape
    p.push(cil(OPACO, -0.2 * a.largo, y0 + 0.05, 0, 0.08, 0.08, 0.6 * a.largo, 'x', 'negro', 6));        // cardán

    // --- ruedas y pasaruedas --------------------------------------------------
    for (const x of [0.31 * a.largo, -0.31 * a.largo]) {
        for (const sg of [-1, 1]) {
            p.push(...rueda(x, sg * (W - 0.28), RR, AR));
            p.push(caja(OPACO, x - RR - 0.12, x + RR + 0.12, y0 + 0.2, Math.min(y0 + 1.3, y1 - 0.4),
                sg > 0 ? W - 0.2 : -W - 0.05, sg > 0 ? W + 0.05 : -W + 0.2, 'negro'));
        }
    }

    // --- paneles laterales (puertas y guardabarros) con hueco por dentro -------
    for (const sg of [-1, 1]) {
        const z0 = sg > 0 ? W - 0.14 : -W, z1 = sg > 0 ? W : -W + 0.14;
        const zf = sg > 0 ? W : -W - 0.03, zf1 = sg > 0 ? W + 0.03 : -W;
        p.push(caja(OPACO, -L + 0.45, L - 0.45, y0 + 0.25, y1 - 0.1, z0, z1));
        p.push(caja(OPACO, -L + 0.45, L - 0.45, y1 - 0.12, y1, z0, z1, 'negro'));                         // moldura de cintura
        p.push(caja(OPACO, xa - 0.5, xb + 0.2, y0 + 0.1, y0 + 0.36, sg > 0 ? W - 0.04 : -W - 0.02, sg > 0 ? W + 0.02 : -W + 0.04, 'negro'));   // estribo
        // juntas de puertas y manijas
        for (const xj of [xb - 0.12, (xa + xb) / 2, xa + 0.12]) {
            p.push(caja(OPACO, xj - 0.02, xj + 0.02, y0 + 0.4, y1 - 0.15, zf, zf1, 'negro'));
        }
        for (const xm of [(xb + (xa + xb) / 2) / 2 + 0.25, ((xa + xb) / 2 + xa) / 2 + 0.25]) {
            if (pickup && xm < xa + 0.4) continue;
            p.push(caja(OPACO, xm - 0.2, xm + 0.2, y1 - 0.38, y1 - 0.3, zf, zf1, 'cromo'));
        }
        // espejo exterior
        p.push(caja(OPACO, xb - 0.45, xb - 0.2, y1 + 0.05, y1 + 0.38, sg > 0 ? W + 0.02 : -W - 0.12, sg > 0 ? W + 0.12 : -W - 0.02, 'cuerpo'));
        p.push(caja(OPACO, xb - 0.46, xb - 0.44, y1 + 0.08, y1 + 0.34, sg > 0 ? W + 0.03 : -W - 0.11, sg > 0 ? W + 0.11 : -W - 0.03, 'tinta'));
    }

    // --- trompa -----------------------------------------------------------------
    p.push(caja(OPACO, L - 0.5, L, y0 + 0.05, y0 + 0.7, -W, W, suv ? 'negro' : 'cuerpo'));            // paragolpes
    p.push(caja(OPACO, L - 0.35, L - 0.1, y0 + 0.2, y0 + 0.45, -W * 0.6, W * 0.6, 'negro'));           // toma de aire
    p.push(caja(OPACO, L - 0.42, L - 0.05, y0 + 0.7, y1 - 0.15, -W, W));                                // frente
    p.push(caja(OPACO, L - 0.1, L, y0 + 0.78, y0 + 1.15, -W * 0.55, W * 0.55, 'negro'));               // parrilla
    p.push(caja(OPACO, L - 0.12, L, y0 + 0.93, y0 + 0.99, -W * 0.55, W * 0.55, 'cromo'));
    p.push(...faro(L, y0 + 1.0, W - 0.55));
    p.push(...faro(L, y0 + 1.0, -W + 0.55));
    p.push(caja(OPACO, L - 0.06, L, y0 + 0.42, y0 + 0.58, W - 0.5, W - 0.2, 'ambar'));
    p.push(caja(OPACO, L - 0.06, L, y0 + 0.42, y0 + 0.58, -W + 0.2, -W + 0.5, 'ambar'));
    p.push(...patente(L - 0.02, y0 + 0.4, 0, true));
    if (suv || a.extra === 'patrulla') {
        p.push(caja(OPACO, L - 0.28, L, y0 + 0.15, y0 + 1.2, -W * 0.5, -W * 0.5 + 0.12, 'negro'));
        p.push(caja(OPACO, L - 0.28, L, y0 + 0.15, y0 + 1.2, W * 0.5 - 0.12, W * 0.5, 'negro'));
        p.push(caja(OPACO, L - 0.28, L, y0 + 1.1, y0 + 1.25, -W * 0.5, W * 0.5, 'negro'));
    }

    // --- capot / baúl o caja de carga ----------------------------------------------
    p.push(forma(OPACO, xb - 0.25, L - 0.42, y1 - 0.34, y1, -W + 0.12, W - 0.12, 'cuerpo',
        (v, c) => { if (v.y > c.y && v.x > c.x) v.y -= 0.2; }));
    p.push(caja(OPACO, xb - 0.2, L - 0.5, y0 + 0.45, y1 - 0.34, -W + 0.2, W - 0.2, 'plastico'));         // compartimiento del motor
    p.push(caja(OPACO, xb, L - 0.55, y1 - 0.01, y1 + 0.01, -0.03, 0.03, 'negro'));                       // línea central del capot

    if (pickup) {
        // caja de carga abierta: piso, laterales dobles, frente y compuerta
        const xf = xa - 0.35;
        p.push(caja(OPACO, -L + 0.3, xf, y1 - 0.62, y1 - 0.42, -W + 0.15, W - 0.15, 'plastico'));
        for (const sg of [-1, 1]) {
            const z0 = sg > 0 ? W - 0.22 : -W, z1 = sg > 0 ? W : -W + 0.22;
            p.push(caja(OPACO, -L + 0.3, xf, y1 - 0.42, y1 + 0.75, z0, z1));
            p.push(caja(OPACO, -L + 0.3, xf, y1 + 0.75, y1 + 0.85, z0, z1, 'negro'));
            p.push(caja(OPACO, -L + 0.5, -L + 1.6, y1 - 0.42, y1 + 0.1, sg > 0 ? W - 0.5 : -W + 0.22, sg > 0 ? W - 0.22 : -W + 0.5, 'negro'));   // pasarueda interno
        }
        p.push(caja(OPACO, xf - 0.25, xf, y1 - 0.42, y1 + 0.9, -W + 0.15, W - 0.15));
        p.push(caja(OPACO, -L, -L + 0.28, y1 - 0.62, y1 + 0.75, -W, W));
        p.push(caja(OPACO, -L, -L + 0.04, y1 + 0.1, y1 + 0.3, -0.5, 0.5, 'cromo'));
        p.push(caja(OPACO, -L, -L + 0.4, y0 + 0.05, y0 + 0.62, -W, W, 'cromo'));                          // paragolpes trasero
        p.push(caja(PILOTO, -L, -L + 0.06, y0 + 0.85, y0 + 1.5, W - 0.4, W - 0.05));
        p.push(caja(PILOTO, -L, -L + 0.06, y0 + 0.85, y0 + 1.5, -W + 0.05, -W + 0.4));
        p.push(...patente(-L, y0 + 0.4, 0, false));
    } else {
        const xBaul = xa - 0.1;
        p.push(forma(OPACO, -L + 0.45, xBaul, y1 - 0.4, y1, -W + 0.12, W - 0.12, 'cuerpo',
            (v, c) => { if (v.y > c.y && v.x < c.x) v.y -= 0.12; }));
        p.push(caja(OPACO, -L + 0.45, xBaul, y0 + 0.45, y1 - 0.4, -W + 0.2, W - 0.2, 'plastico'));
        p.push(caja(OPACO, -L, -L + 0.5, y0 + 0.05, y0 + 0.7, -W, W, suv ? 'negro' : 'cuerpo'));           // paragolpes trasero
        p.push(caja(OPACO, -L + 0.05, -L + 0.45, y0 + 0.7, y1 - 0.1, -W, W));
        p.push(caja(PILOTO, -L, -L + 0.07, y0 + 0.82, y0 + 1.22, W - 0.95, W - 0.08));
        p.push(caja(PILOTO, -L, -L + 0.07, y0 + 0.82, y0 + 1.22, -W + 0.08, -W + 0.95));
        p.push(caja(FARO, -L, -L + 0.05, y0 + 0.5, y0 + 0.62, 0.55, 0.85));
        p.push(caja(FARO, -L, -L + 0.05, y0 + 0.5, y0 + 0.62, -0.85, -0.55));
        p.push(...patente(-L, y0 + 0.42, 0, false));
        p.push(cil(OPACO, -L + 0.12, y0 + 0.28, W * 0.45, 0.11, 0.11, 0.3, 'x', 'cromo', 8));
        p.push(caja(OPACO, -L, -L + 0.03, y1 - 0.4, y1 - 0.25, -0.35, 0.35, 'cromo'));                    // tirador del baúl
    }

    // --- habitáculo: vidrio, columnas, techo ----------------------------------------
    const tx0 = xa + rakeT, tx1 = xb - rakeF;
    p.push(forma(VIDRIO, xa, xb, y1, y2, -wc, wc, 'cuerpo', (v, c) => {
        if (v.y > c.y) {
            const u = (v.x - xa) / (xb - xa);
            v.x = tx0 + u * (tx1 - tx0);
            v.z *= 0.9;
        }
    }));
    for (const sg of [-1, 1]) {
        const z0 = sg > 0 ? wc - 0.13 : -wc - 0.01, z1 = sg > 0 ? wc + 0.01 : -wc + 0.13;
        p.push(forma(OPACO, xb - 0.2, xb, y1, y2, z0, z1, 'cuerpo', (v, c) => { if (v.y > c.y) v.x -= rakeF; }));   // columna A
        p.push(forma(OPACO, xa, xa + 0.22, y1, y2, z0, z1, 'cuerpo', (v, c) => { if (v.y > c.y) v.x += rakeT; })); // columna C
        const xm = (xa + xb) / 2 - (rakeF - rakeT) / 4;
        p.push(caja(OPACO, xm - 0.09, xm + 0.09, y1, y2, z0, z1, 'negro'));                                    // columna B
        p.push(caja(OPACO, tx0, tx1, y2 - 0.1, y2, z0, z1, 'cuerpo'));                                          // larguero del techo
    }
    p.push(caja(OPACO, tx0 - 0.04, tx1 + 0.04, y2, y2 + 0.14, -wc * 0.9, wc * 0.9, 'cuerpo'));            // techo
    p.push(caja(OPACO, tx0 + 0.05, tx1 - 0.05, y2 - 0.06, y2 - 0.01, -wc * 0.85, wc * 0.85, 'techo'));    // cielorraso
    if (suv) {
        for (const sg of [-1, 1]) p.push(caja(OPACO, tx0 + 0.2, tx1 - 0.2, y2 + 0.14, y2 + 0.24, sg * (wc * 0.75) - 0.05, sg * (wc * 0.75) + 0.05, 'cromo'));
    }
    p.push(cil(OPACO, tx0 + 0.25, y2 + 0.25, -wc * 0.7, 0.025, 0.025, 0.4, 'y', 'negro', 4));            // antena

    // --- interior ------------------------------------------------------------------------
    const { piso, bx: xAsientoDel, bz: zConductor } = ref.cabinaAuto(a);
    const zAcomp = W * 0.42;
    p.push(caja(OPACO, xa + 0.25, xb - 0.1, piso, piso + 0.04, -wc + 0.1, wc - 0.1, 'alfombra'));
    // el asiento tiene que quedar bajo el techo (que se inclina hacia adelante y atrás)
    const altoAsiento = y2 - 0.25 - piso;
    // el tablero y el volante no pueden tapar lo que se ve por el parabrisas: quedan bajo la vista
    const yTablero = Math.min(y1 - 0.15, ref.ojoAuto(a).y - 0.75);
    p.push(...tablero(xb - 0.05, yTablero, -wc + 0.12, wc - 0.12, zConductor));
    p.push(...asiento(xAsientoDel, piso, zConductor, W * 0.72, 'tela', altoAsiento));
    p.push(...asiento(xAsientoDel, piso, zAcomp, W * 0.72, 'tela', altoAsiento));
    p.push(caja(OPACO, xAsientoDel - 0.4, xAsientoDel + 0.55, piso + 0.04, piso + 0.5, -0.17, 0.17, 'plastico'));   // consola
    p.push(cil(OPACO, xAsientoDel + 0.1, piso + 0.7, 0.0, 0.035, 0.035, 0.4, 'y', 'negro', 6));                    // palanca
    if (!pickup && xa + 1.4 < xAsientoDel - 0.9 && altoAsiento > 1.5) {
        p.push(caja(OPACO, xa + 0.2, xa + 0.85, piso + 0.25, piso + 0.55, -wc + 0.15, wc - 0.15, 'telaClara'));
        p.push(forma(OPACO, xa + 0.15, xa + 0.4, piso + 0.55, piso + 1.35, -wc + 0.15, wc - 0.15, 'telaClara',
            (v, c) => { if (v.y > c.y) v.x += 0.2; }));
    }
    p.push(caja(OPACO, tx1 - 0.15, tx1 - 0.05, y2 - 0.45, y2 - 0.3, -0.25, 0.25, 'negro'));               // espejo retrovisor

    // --- variantes -----------------------------------------------------------------------
    if (a.extra === 'taxi') {
        const xm = (tx0 + tx1) / 2;
        p.push(caja(OPACO, xm - 0.45, xm + 0.45, y2 + 0.14, y2 + 0.2, -0.65, 0.65, 'negro'));
        p.push(caja(FARO, xm - 0.4, xm + 0.4, y2 + 0.2, y2 + 0.62, -0.6, 0.6));
        const paso = (a.largo - 1.6) / 9;
        for (const sg of [-1, 1]) {
            const z0 = sg > 0 ? W : -W - 0.1, z1 = sg > 0 ? W + 0.1 : -W;
            for (let k = 0; k < 9; k += 2) {
                p.push(caja(OPACO, -L + 0.8 + k * paso, -L + 0.8 + (k + 1) * paso, y0 + 0.62, y0 + 0.82, z0, z1, 'detalle'));
            }
        }
    } else if (a.extra === 'patrulla') {
        const xm = (tx0 + tx1) / 2;
        p.push(caja(OPACO, xm - 0.4, xm + 0.4, y2 + 0.14, y2 + 0.22, -1.0, 1.0, 'negro'));
        p.push(caja(PILOTO, xm - 0.35, xm + 0.35, y2 + 0.22, y2 + 0.55, -1.0, 0));
        p.push(caja(AZUL, xm - 0.35, xm + 0.35, y2 + 0.22, y2 + 0.55, 0, 1.0));
        for (const sg of [-1, 1]) {
            const z0 = sg > 0 ? W : -W - 0.1, z1 = sg > 0 ? W + 0.1 : -W;
            p.push(caja(OPACO, xa - 1.0, xb + 0.5, y0 + 0.28, y0 + 0.95, z0, z1, 'detalle'));
            p.push(caja(OPACO, xa - 0.4, xa + 1.2, y0 + 1.0, y0 + 1.25, sg > 0 ? W : -W - 0.12, sg > 0 ? W + 0.12 : -W, 'placa'));
        }
        p.push(caja(PILOTO, L - 0.5, L - 0.4, y1 - 0.2, y1 - 0.1, -0.7, -0.2));
        p.push(caja(AZUL, L - 0.5, L - 0.4, y1 - 0.2, y1 - 0.1, 0.2, 0.7));
    }
    return p;
}

// --- furgoneta y ambulancia ----------------------------------------------------------

