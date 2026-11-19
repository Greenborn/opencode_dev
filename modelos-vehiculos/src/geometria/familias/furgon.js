// Generado desde cliente/modelo_auto.js (migración a @greenborn/modelos-vehiculos).
// Usa three.js sólo para construir BufferGeometry; no toca el DOM.
import * as THREE from 'three';
import { ref } from '../contexto.js';
import { caja, forma, cil, toro, rueda, faro, patente, asiento, tablero, pieza, OPACO, VIDRIO, FARO, PILOTO, AZUL, RADIO_RUEDA, ANCHO_RUEDA } from '../primitivas.js';

export function furgon(a) {
    const p = [];
    const L = a.largo / 2, W = a.ancho / 2;
    const y0 = ref.LUZ_SUELO, y1 = y0 + a.cuerpo;
    const xa = (a.c0 - 0.5) * a.largo, xb = (a.c1 - 0.5) * a.largo;
    const ycin = y0 + a.cuerpo * 0.55, ytop = y1;
    const ambulancia = a.extra === 'ambulancia';
    const wc = W - 0.2;

    p.push(caja(OPACO, -L + 0.45, L - 0.45, y0, y0 + 0.3, -W + 0.35, W - 0.35, 'negro'));
    p.push(caja(OPACO, -L + 0.3, L - 0.3, y0 + 0.3, y0 + 0.45, -W + 0.25, W - 0.25, 'plastico'));
    p.push(cil(OPACO, -L + 0.25, y0 + 0.05, W * 0.4, 0.11, 0.11, 0.5, 'x', 'cromo', 8));
    for (const x of [0.30 * a.largo, -0.30 * a.largo]) {
        for (const sg of [-1, 1]) {
            p.push(...rueda(x, sg * (W - 0.28)));
            p.push(caja(OPACO, x - RADIO_RUEDA - 0.12, x + RADIO_RUEDA + 0.12, y0 + 0.2, y0 + 1.5,
                sg > 0 ? W - 0.2 : -W - 0.05, sg > 0 ? W + 0.05 : -W + 0.2, 'negro'));
        }
    }

    for (const sg of [-1, 1]) {
        const z0 = sg > 0 ? W - 0.14 : -W, z1 = sg > 0 ? W : -W + 0.14;
        const zf = sg > 0 ? W : -W - 0.03, zf1 = sg > 0 ? W + 0.03 : -W;
        p.push(caja(OPACO, xa, L - 0.45, y0 + 0.25, ycin, z0, z1));                                   // cabina, de la cintura abajo
        p.push(caja(OPACO, -L + 0.45, xa, y0 + 0.25, ytop, z0, z1));                                  // caja de carga completa
        p.push(caja(OPACO, xa, xb + 0.1, y0 + 0.1, y0 + 0.36, sg > 0 ? W - 0.04 : -W - 0.02, sg > 0 ? W + 0.02 : -W + 0.04, 'negro'));
        p.push(caja(OPACO, -L + 0.45, L - 0.45, y0 + 0.62, y0 + 0.82, sg > 0 ? W : -W - 0.08, sg > 0 ? W + 0.08 : -W, 'detalle'));
        p.push(caja(OPACO, xa - 0.02, xa + 0.02, y0 + 0.4, ytop - 0.2, zf, zf1, 'negro'));
        p.push(caja(OPACO, (xa + xb) / 2 - 0.02, (xa + xb) / 2 + 0.02, y0 + 0.4, ycin, zf, zf1, 'negro'));
        p.push(caja(OPACO, xb - 0.5, xb - 0.1, ycin - 0.3, ycin - 0.22, zf, zf1, 'cromo'));
        p.push(caja(OPACO, xb - 0.1, xb + 0.2, ycin + 0.1, ycin + 0.75, sg > 0 ? W : -W - 0.12, sg > 0 ? W + 0.12 : -W, 'negro'));   // espejo grande
        p.push(forma(VIDRIO, xa + 0.2, xb - 0.15, ycin, ytop - 0.1, z0, z1, 'cuerpo', () => {}));      // vidrio lateral
        if (ambulancia) {
            p.push(caja(OPACO, -0.3 * a.largo - 0.7, -0.3 * a.largo + 0.7, ycin + 0.2, ycin + 1.0, zf, zf1, 'tinta'));
            const xc = -0.1 * a.largo, yc = y0 + a.cuerpo * 0.62;
            const cz0 = sg > 0 ? W + 0.03 : -W - 0.08, cz1 = sg > 0 ? W + 0.08 : -W - 0.03;
            p.push(caja(OPACO, xc - 0.22, xc + 0.22, yc - 0.65, yc + 0.65, cz0, cz1, 'detalle'));
            p.push(caja(OPACO, xc - 0.65, xc + 0.65, yc - 0.22, yc + 0.22, cz0, cz1, 'detalle'));
        }
    }

    // frente y parabrisas
    p.push(caja(OPACO, L - 0.5, L, y0 + 0.05, y0 + 0.7, -W, W, 'negro'));
    p.push(caja(OPACO, L - 0.45, L - 0.05, y0 + 0.7, ycin, -W, W));
    p.push(caja(OPACO, L - 0.1, L, y0 + 0.78, y0 + 1.25, -W * 0.5, W * 0.5, 'negro'));
    p.push(...faro(L, y0 + 1.1, W - 0.5));
    p.push(...faro(L, y0 + 1.1, -W + 0.5));
    p.push(...patente(L - 0.02, y0 + 0.4, 0, true));
    p.push(forma(VIDRIO, xb - 0.05, L - 0.4, ycin, ytop - 0.1, -wc, wc, 'cuerpo',
        (v, c) => { if (v.y > c.y) v.x -= 0.6; }));
    p.push(caja(OPACO, xb - 0.6, L - 0.4, ytop - 0.1, ytop, -W, W, 'cuerpo'));
    // trasera con puertas
    p.push(caja(OPACO, -L, -L + 0.5, y0 + 0.05, y0 + 0.7, -W, W, 'negro'));
    p.push(caja(OPACO, -L + 0.05, -L + 0.45, y0 + 0.7, ytop, -W, W));
    p.push(caja(OPACO, -L, -L + 0.03, y0 + 0.7, ytop, -0.02, 0.02, 'negro'));
    for (const sg of [-1, 1]) {
        p.push(caja(PILOTO, -L, -L + 0.07, y0 + 0.85, y0 + 1.9, sg * (W - 0.12) - 0.12, sg * (W - 0.12) + 0.12));
        p.push(caja(OPACO, -L, -L + 0.04, y0 + a.cuerpo * 0.55, y0 + a.cuerpo * 0.62, sg * 0.4 - 0.3, sg * 0.4 + 0.3, 'cromo'));
    }
    p.push(...patente(-L, y0 + 0.5, 0, false));
    // techo
    p.push(caja(OPACO, -L + 0.45, xb - 0.05, ytop, ytop + 0.12, -W + 0.05, W - 0.05, 'cuerpo'));
    p.push(caja(OPACO, -L + 2.0, xa - 1.5, ytop + 0.12, ytop + 0.3, -0.5, 0.5, 'cuerpo'));
    p.push(caja(OPACO, -L + 0.45, L - 0.45, ytop - 0.05, ytop, -W + 0.2, W - 0.2, 'techo'));

    // interior de la cabina
    const { piso, bx: xs, bz: zC } = ref.cabinaAuto(a);
    const zA = W * 0.4;
    p.push(caja(OPACO, xa + 0.1, L - 0.45, piso, piso + 0.04, -W + 0.2, W - 0.2, 'alfombra'));
    // el volante va bajo la vista: si no, su aro tapa el parabrisas
    p.push(...tablero(L - 0.5, Math.min(ycin - 0.2, ref.ojoAuto(a).y - 0.75), -W + 0.2, W - 0.2, zC, 0.2));
    p.push(...asiento(xs, piso, zC, W * 0.7));
    p.push(...asiento(xs, piso, zA, W * 0.7));
    p.push(caja(OPACO, xa, xa + 0.1, piso, ytop - 0.1, -W + 0.2, W - 0.2, 'plastico'));            // mampara

    if (ambulancia) {
        const xm = xa - 0.6;
        p.push(caja(OPACO, xm - 0.6, xm + 0.6, ytop + 0.12, ytop + 0.28, -1.4, 1.4, 'negro'));
        p.push(caja(PILOTO, xm - 0.55, xm + 0.55, ytop + 0.28, ytop + 0.62, -1.4, 0));
        p.push(caja(AZUL, xm - 0.55, xm + 0.55, ytop + 0.28, ytop + 0.62, 0, 1.4));
    }
    return p;
}

// --- minibús -----------------------------------------------------------------------------

